-- =====================================================================
-- TURVAPARANDUS olemasolevale andmebaasile (0001_skeem.sql on juba käivitatud)
--
-- Käivitamise järjekord Supabase'i SQL Editoris (rollis postgres):
--   1. see fail (0001b_turvaparandus.sql)
--   2. 0002_kasutajad.sql
--
-- - Säilitab kõik tabelid ja andmed (ainult lisab veerge/tabeleid, asendab
--   funktsioone, poliitikaid ja triggereid ning seab õigused).
-- - Sobib nii vana (lugemine "using (true)") kui uue 0001 versiooniga.
-- - Võib käivitada mitu korda; kogu fail on ühes tehingus (vea korral ei muutu midagi).
--
-- Tulemus:
--   - andmeid näevad ainult kutsutud ja AKTIIVSE profiiliga kasutajad;
--   - anon ja profiilita (nt iseregistreerunud) kasutajad ei näe midagi;
--   - vastutaja muudab ainult oma arengusuuna andmeid, ka seoste kaudu;
--   - autor/kinnitaja pannakse andmebaasis; muudatuste ajalugu audit_log;
--   - Supabase'i liigsed vaikimisi õigused (sh TRUNCATE, anon) on eemaldatud.
-- =====================================================================

begin;

set local search_path = public;

-- ---------------------------------------------------------------------
-- 1. Uued veerud, piirangud ja tabelid (andmed säilivad)
-- ---------------------------------------------------------------------

-- Aktiivne profiil: koolijuht saab ligipääsu peatada ilma kasutajat kustutamata.
alter table public.profiles add column if not exists is_active boolean not null default true;

-- Tõendi link ainult http(s) (mitte javascript: vms). NOT VALID: olemasolevaid ridu
-- ei kontrollita kohe, uusi ja muudetuid kontrollitakse alati.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'evidence_url_http' and conrelid = 'public.evidence'::regclass) then
    alter table public.evidence add constraint evidence_url_http check (url is null or url ~* '^https?://') not valid;
  end if;
  begin
    alter table public.evidence validate constraint evidence_url_http;
  exception when check_violation then
    raise notice 'evidence: mõnel olemasoleval tõendil on link, mis ei alga http(s)://. Paranda need ja käivita: alter table evidence validate constraint evidence_url_http;';
  end;
end $$;

create table if not exists public.audit_log (
  id              bigint generated always as identity primary key,
  changed_at      timestamptz not null default now(),
  changed_by      uuid,
  table_name      text not null,
  record_id       uuid,
  direction_id    uuid,
  action          text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  changed_fields  text[],
  old_data        jsonb,
  new_data        jsonb
);
create index if not exists audit_log_table_record_idx on public.audit_log (table_name, record_id, changed_at desc);
create index if not exists audit_log_direction_idx on public.audit_log (direction_id, changed_at desc);

-- ---------------------------------------------------------------------
-- 2. Õiguste abifunktsioonid (security definer, tühi search_path)
-- ---------------------------------------------------------------------

-- Liige = kasutajal on AKTIIVNE profiil. Profiil tekib ainult kutsutud kasutajale (0002).
create or replace function public.is_member() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and is_active)
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin' and is_active)
$$;

create or replace function public.can_edit_direction(dir uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select dir is not null and (
    public.is_admin() or exists (
      select 1 from public.direction_owners o join public.profiles p on p.id = o.user_id
      where o.direction_id = dir and o.user_id = (select auth.uid()) and p.role = 'owner' and p.is_active
    )
  )
$$;

create or replace function public.goal_direction(g uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select direction_id from public.goals where id = g
$$;

create or replace function public.indicator_direction(ind uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select g.direction_id from public.indicators i join public.goals g on g.id = i.goal_id where i.id = ind
$$;

create or replace function public.activity_direction(act uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select g.direction_id from public.activities a join public.goals g on g.id = a.goal_id where a.id = act
$$;

create or replace function public.result_direction(res uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select public.indicator_direction(r.indicator_id) from public.indicator_results r where r.id = res
$$;

create or replace function public.analysis_direction(an uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select direction_id from public.impact_analyses where id = an
$$;

create or replace function public.can_edit_evidence(res uuid, act uuid, an uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select case
    when res is not null then public.can_edit_direction(public.result_direction(res))
    when act is not null then public.can_edit_direction(public.activity_direction(act))
    when an  is not null then public.is_admin() or (
      public.can_edit_direction(public.analysis_direction(an))
      and exists (select 1 from public.impact_analyses a where a.id = an and a.status = 'draft'))
    else false
  end
$$;

-- ---------------------------------------------------------------------
-- 3. Vaade ja aruandefunktsioonid küsija õigustes (RLS kehtib)
-- ---------------------------------------------------------------------
drop view if exists public.v_indicator_latest;
create view public.v_indicator_latest with (security_invoker = true) as
select
  i.*,
  g.direction_id,
  g.code  as goal_code,
  d.code  as direction_code,
  coalesce(r.source_id, i.source_id) as result_source_id,
  r.year        as latest_year,
  r.value       as latest_value,
  r.measured_on as latest_measured_on,
  r.entered_at  as latest_entered_at,
  r.entered_by  as latest_entered_by,
  p.year        as prev_year,
  p.value       as prev_value
from public.indicators i
join public.goals g      on g.id = i.goal_id
join public.directions d on d.id = g.direction_id
left join lateral (
  select * from public.indicator_results x where x.indicator_id = i.id order by x.year desc limit 1
) r on true
left join lateral (
  select * from public.indicator_results x where x.indicator_id = i.id and x.year < r.year order by x.year desc limit 1
) p on true
where i.active;

create or replace function public.data_gaps(report_year int default extract(year from current_date)::int)
returns table (
  direction_id uuid, goal_id uuid, indicator_id uuid,
  gap_type text, message text
)
language sql stable security invoker set search_path = '' as $$
  select g.direction_id, g.id, null::uuid, 'no_outcome_indicator',
         'Eesmärgil „' || g.title || '“ puudub tulemusnäitaja → vaja luua mõõdik ja algtaseme mõõtmine'
  from public.goals g
  where not exists (select 1 from public.indicators i where i.goal_id = g.id and i.active and i.kind = 'outcome')
  union all
  select g.direction_id, g.id, i.id, 'no_baseline',
         'Mõõdikul „' || i.name || '“ puudub algtase → planeeri algtaseme mõõtmine'
  from public.indicators i join public.goals g on g.id = i.goal_id
  where i.active and i.baseline_value is null
  union all
  select g.direction_id, g.id, i.id, 'no_target',
         'Mõõdikul „' || i.name || '“ puudub sihttase ' || i.target_year
  from public.indicators i join public.goals g on g.id = i.goal_id
  where i.active and i.target_value is null
  union all
  select g.direction_id, g.id, i.id, 'no_current_result',
         'Mõõdikul „' || i.name || '“ puudub ' || (report_year - 1) || '/' || right(report_year::text, 2) || ' õppeaasta tulemus'
  from public.indicators i join public.goals g on g.id = i.goal_id
  where i.active and i.baseline_value is not null
    and coalesce(i.baseline_year, 0) < report_year
    and not exists (select 1 from public.indicator_results r where r.indicator_id = i.id and r.year = report_year)
$$;

create or replace function public.overdue_activities(as_of date default current_date)
returns setof public.activities
language sql stable security invoker set search_path = '' as $$
  select a.* from public.activities a
  where a.status in ('planned', 'in_progress') and a.due_date < as_of
$$;

-- ---------------------------------------------------------------------
-- 4. Triggerfunktsioonid: päritolu, terviklikkus, ajalugu
-- ---------------------------------------------------------------------
create or replace function public.stamp_result() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.entered_by := coalesce(auth.uid(), new.entered_by);
    new.entered_at := now();
    new.updated_by := null;
    new.updated_at := null;
  else
    new.entered_by := old.entered_by;
    new.entered_at := old.entered_at;
    new.updated_by := coalesce(auth.uid(), new.updated_by);
    new.updated_at := now();
  end if;
  return new;
end $$;

create or replace function public.stamp_evidence() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.added_by := coalesce(auth.uid(), new.added_by);
    new.added_at := now();
  else
    new.added_by := old.added_by;
    new.added_at := old.added_at;
  end if;
  return new;
end $$;

create or replace function public.check_activity_indicator() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if public.activity_direction(new.activity_id) is distinct from public.indicator_direction(new.indicator_id) then
    raise exception 'Tegevus ja mõõdik peavad kuuluma samasse arengusuunda' using errcode = '23514';
  end if;
  return new;
end $$;

create or replace function public.check_decision() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (new.goal_id is not null and public.goal_direction(new.goal_id) is distinct from new.direction_id)
     or (new.indicator_id is not null and public.indicator_direction(new.indicator_id) is distinct from new.direction_id)
     or (new.activity_id is not null and public.activity_direction(new.activity_id) is distinct from new.direction_id)
     or (new.analysis_id is not null and public.analysis_direction(new.analysis_id) is distinct from new.direction_id) then
    raise exception 'Otsus saab viidata ainult sama arengusuuna andmetele' using errcode = '23514';
  end if;
  if tg_op = 'INSERT' then
    new.created_by := coalesce(auth.uid(), new.created_by);
    new.created_at := now();
  else
    new.created_by := old.created_by;
    new.created_at := old.created_at;
  end if;
  return new;
end $$;

create or replace function public.guard_analysis() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
begin
  if tg_op = 'INSERT' then
    new.created_by := coalesce(uid, new.created_by);
  else
    new.created_by := old.created_by;
  end if;
  if uid is not null and not public.is_admin() then
    if tg_op = 'INSERT' then
      new.status := 'draft'; new.snapshot := null; new.approved_by := null; new.approved_at := null;
    else
      new.status := old.status; new.snapshot := old.snapshot;
      new.approved_by := old.approved_by; new.approved_at := old.approved_at;
    end if;
  end if;
  if new.status = 'approved' and (tg_op = 'INSERT' or old.status is distinct from 'approved') then
    new.approved_by := coalesce(uid, new.approved_by);
    new.approved_at := now();
  elsif new.status = 'draft' then
    new.snapshot := null; new.approved_by := null; new.approved_at := null;
  end if;
  return new;
end $$;

-- Vähemalt üks AKTIIVNE administraator peab alati alles jääma.
create or replace function public.protect_last_admin() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.role = 'admin' and old.is_active
     and (tg_op = 'DELETE' or new.role <> 'admin' or not new.is_active)
     and not exists (select 1 from public.profiles where role = 'admin' and is_active and id <> old.id) then
    raise exception 'Vähemalt üks aktiivne administraator peab jääma' using errcode = '23514';
  end if;
  return coalesce(new, old);
end $$;

create or replace function public.write_audit() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  o jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  n jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
  r jsonb := coalesce(n, o);
  fields text[];
  dir uuid;
begin
  if tg_op = 'UPDATE' then
    select array_agg(k order by k) into fields
    from jsonb_object_keys(n) k
    where k not in ('updated_at', 'updated_by') and (o -> k) is distinct from (n -> k);
    if fields is null then return null; end if;
  end if;
  dir := case tg_table_name
    when 'directions'        then (r ->> 'id')::uuid
    when 'direction_owners'  then (r ->> 'direction_id')::uuid
    when 'goals'             then (r ->> 'direction_id')::uuid
    when 'indicators'        then public.goal_direction((r ->> 'goal_id')::uuid)
    when 'indicator_results' then public.indicator_direction((r ->> 'indicator_id')::uuid)
    when 'activities'        then public.goal_direction((r ->> 'goal_id')::uuid)
    when 'decisions'         then (r ->> 'direction_id')::uuid
    when 'impact_analyses'   then (r ->> 'direction_id')::uuid
    when 'evidence'          then coalesce(public.result_direction((r ->> 'indicator_result_id')::uuid),
                                           public.activity_direction((r ->> 'activity_id')::uuid),
                                           public.analysis_direction((r ->> 'analysis_id')::uuid))
    else null
  end;
  insert into public.audit_log (changed_by, table_name, record_id, direction_id, action, changed_fields, old_data, new_data)
  values (auth.uid(), tg_table_name,
          coalesce((r ->> 'id')::uuid, (r ->> 'user_id')::uuid),
          dir, tg_op, fields, o, n);
  return null;
end $$;

-- Triggerid (asendatakse, kui juba olemas)
drop trigger if exists indicator_results_stamp on public.indicator_results;
create trigger indicator_results_stamp before insert or update on public.indicator_results
  for each row execute function public.stamp_result();
drop trigger if exists evidence_stamp on public.evidence;
create trigger evidence_stamp before insert or update on public.evidence
  for each row execute function public.stamp_evidence();
drop trigger if exists activity_indicators_same_direction on public.activity_indicators;
create trigger activity_indicators_same_direction before insert or update on public.activity_indicators
  for each row execute function public.check_activity_indicator();
drop trigger if exists decisions_check on public.decisions;
create trigger decisions_check before insert or update on public.decisions
  for each row execute function public.check_decision();
drop trigger if exists impact_analyses_guard on public.impact_analyses;
create trigger impact_analyses_guard before insert or update on public.impact_analyses
  for each row execute function public.guard_analysis();
drop trigger if exists profiles_last_admin on public.profiles;
create trigger profiles_last_admin before update or delete on public.profiles
  for each row execute function public.protect_last_admin();

do $$
declare t text;
begin
  foreach t in array array['profiles', 'directions', 'direction_owners', 'goals', 'status_rules',
                           'indicators', 'indicator_results', 'activities', 'decisions',
                           'impact_analyses', 'evidence']
  loop
    execute format('drop trigger if exists %I on public.%I', t || '_audit', t);
    execute format('create trigger %I after insert or update or delete on public.%I
                    for each row execute function public.write_audit()', t || '_audit', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 5. RLS-poliitikad: kõik vanad eemaldatakse ja luuakse uuesti
-- ---------------------------------------------------------------------
do $$
declare
  t text;
  p record;
  tbls text[] := array['profiles', 'plans', 'directions', 'direction_owners', 'goals', 'data_sources',
                       'status_rules', 'indicators', 'indicator_results', 'activities',
                       'activity_indicators', 'evidence', 'impact_analyses', 'decisions', 'audit_log'];
begin
  for p in select policyname, tablename from pg_policies where schemaname = 'public' and tablename = any (tbls) loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
  foreach t in array tbls loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
  -- Lugemine: ainult aktiivse profiiliga liige
  foreach t in array array['profiles', 'plans', 'directions', 'direction_owners', 'goals', 'data_sources',
                           'status_rules', 'indicators', 'indicator_results', 'activities',
                           'activity_indicators', 'evidence', 'impact_analyses', 'decisions']
  loop
    execute format('create policy %I on public.%I for select to authenticated using ((select public.is_member()))',
                   t || '_read', t);
  end loop;
  -- Ainult admin kirjutab
  foreach t in array array['profiles', 'plans', 'direction_owners', 'data_sources', 'status_rules']
  loop
    execute format('create policy %I on public.%I for insert to authenticated with check ((select public.is_admin()))', t || '_ins', t);
    execute format('create policy %I on public.%I for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()))', t || '_upd', t);
    execute format('create policy %I on public.%I for delete to authenticated using ((select public.is_admin()))', t || '_del', t);
  end loop;
end $$;

create policy directions_ins on public.directions for insert to authenticated with check ((select public.is_admin()));
create policy directions_upd on public.directions for update to authenticated
  using (public.can_edit_direction(id)) with check (public.can_edit_direction(id));
create policy directions_del on public.directions for delete to authenticated using ((select public.is_admin()));

create policy goals_ins on public.goals for insert to authenticated with check (public.can_edit_direction(direction_id));
create policy goals_upd on public.goals for update to authenticated
  using (public.can_edit_direction(direction_id)) with check (public.can_edit_direction(direction_id));
create policy goals_del on public.goals for delete to authenticated using (public.can_edit_direction(direction_id));

create policy indicators_ins on public.indicators for insert to authenticated
  with check (public.can_edit_direction(public.goal_direction(goal_id)));
create policy indicators_upd on public.indicators for update to authenticated
  using (public.can_edit_direction(public.goal_direction(goal_id)))
  with check (public.can_edit_direction(public.goal_direction(goal_id)));
create policy indicators_del on public.indicators for delete to authenticated
  using (public.can_edit_direction(public.goal_direction(goal_id)));

create policy results_ins on public.indicator_results for insert to authenticated
  with check (public.can_edit_direction(public.indicator_direction(indicator_id)));
create policy results_upd on public.indicator_results for update to authenticated
  using (public.can_edit_direction(public.indicator_direction(indicator_id)))
  with check (public.can_edit_direction(public.indicator_direction(indicator_id)));
create policy results_del on public.indicator_results for delete to authenticated
  using (public.can_edit_direction(public.indicator_direction(indicator_id)));

create policy activities_ins on public.activities for insert to authenticated
  with check (public.can_edit_direction(public.goal_direction(goal_id)));
create policy activities_upd on public.activities for update to authenticated
  using (public.can_edit_direction(public.goal_direction(goal_id)))
  with check (public.can_edit_direction(public.goal_direction(goal_id)));
create policy activities_del on public.activities for delete to authenticated
  using (public.can_edit_direction(public.goal_direction(goal_id)));

create policy act_ind_ins on public.activity_indicators for insert to authenticated
  with check (public.can_edit_direction(public.activity_direction(activity_id))
              and public.can_edit_direction(public.indicator_direction(indicator_id)));
create policy act_ind_upd on public.activity_indicators for update to authenticated
  using (public.can_edit_direction(public.activity_direction(activity_id)))
  with check (public.can_edit_direction(public.activity_direction(activity_id))
              and public.can_edit_direction(public.indicator_direction(indicator_id)));
create policy act_ind_del on public.activity_indicators for delete to authenticated
  using (public.can_edit_direction(public.activity_direction(activity_id)));

create policy decisions_ins on public.decisions for insert to authenticated with check (public.can_edit_direction(direction_id));
create policy decisions_upd on public.decisions for update to authenticated
  using (public.can_edit_direction(direction_id)) with check (public.can_edit_direction(direction_id));
create policy decisions_del on public.decisions for delete to authenticated using (public.can_edit_direction(direction_id));

create policy evidence_ins on public.evidence for insert to authenticated
  with check (public.can_edit_evidence(indicator_result_id, activity_id, analysis_id));
create policy evidence_upd on public.evidence for update to authenticated
  using (public.can_edit_evidence(indicator_result_id, activity_id, analysis_id))
  with check (public.can_edit_evidence(indicator_result_id, activity_id, analysis_id));
create policy evidence_del on public.evidence for delete to authenticated
  using (public.can_edit_evidence(indicator_result_id, activity_id, analysis_id));

create policy analyses_ins on public.impact_analyses for insert to authenticated
  with check (public.can_edit_direction(direction_id) and (status = 'draft' or (select public.is_admin())));
create policy analyses_upd on public.impact_analyses for update to authenticated
  using ((select public.is_admin()) or (public.can_edit_direction(direction_id) and status = 'draft'))
  with check ((select public.is_admin()) or (public.can_edit_direction(direction_id) and status = 'draft'));
create policy analyses_del on public.impact_analyses for delete to authenticated using ((select public.is_admin()));

create policy audit_read on public.audit_log for select to authenticated
  using ((select public.is_admin()) or public.can_edit_direction(direction_id));

-- ---------------------------------------------------------------------
-- 6. Privileegid: ainult vajalik, ainult rollile authenticated
-- ---------------------------------------------------------------------
revoke all on all tables    in schema public from public, anon, authenticated;
revoke all on all sequences in schema public from public, anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;

grant usage on schema public to authenticated;
grant select, insert, update, delete on
  public.profiles, public.plans, public.directions, public.direction_owners, public.goals,
  public.data_sources, public.status_rules, public.indicators, public.indicator_results,
  public.activities, public.activity_indicators, public.evidence, public.impact_analyses, public.decisions
  to authenticated;
grant select on public.audit_log, public.v_indicator_latest to authenticated;

grant execute on function
  public.is_member(), public.is_admin(), public.can_edit_direction(uuid), public.goal_direction(uuid),
  public.indicator_direction(uuid), public.activity_direction(uuid), public.result_direction(uuid),
  public.analysis_direction(uuid), public.can_edit_evidence(uuid, uuid, uuid),
  public.data_gaps(int), public.overdue_activities(date)
  to authenticated;

alter default privileges in schema public revoke all on tables    from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke all on functions from anon, public;

commit;
