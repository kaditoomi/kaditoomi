-- =====================================================================
-- Arengukava seire- ja juhtimisvahend — andmebaasi skeem (MVP)
-- Sihtplatvorm: Supabase (PostgreSQL 15 ja 17). Kasutab auth.users ja auth.uid().
-- Käivitada Supabase'i SQL Editoris rollis "postgres"; SEEJÄREL ALATI 0001b_turvaparandus.sql
-- ja 0002_kasutajad.sql (0001b on kehtiv õiguste ja turvalisuse määratlus).
--
-- Keskne loogika:
--   arengusuund → eesmärk → mõõdik → algtase → sihttase → tulemus (aasta)
--   → tõend → mõjuanalüüs → juhtimisotsus
--   ning eesmärk → tegevus → (mõjutab) mõõdikut.
--
-- Identifikaatorid on ingliskeelsed (koodi ja tööriistade huvides),
-- kasutajaliides on eestikeelne. Sõnastik: docs/01-andmemudel.md
-- =====================================================================

-- gen_random_uuid() on PostgreSQL-i tuumas (13+); eraldi laiendust pole vaja.

-- ---------------------------------------------------------------------
-- Loendid
-- ---------------------------------------------------------------------
create type user_role       as enum ('admin', 'owner', 'viewer');          -- administraator/koolijuht, arengusuuna vastutaja, vaatleja
create type indicator_kind  as enum ('outcome', 'process');                -- tulemusnäitaja, protsessinäitaja
create type impact_level    as enum ('practice', 'learner_reach', 'learner_result');
                                                                            -- 2 praktika muutus, 3 jõudis õppijani, 4 õppija tulemus/kogemus
                                                                            -- (tasand 1 "tegevused toimusid" tuleb tegevuste tabelist)
create type trend_direction as enum ('increase', 'decrease', 'maintain');  -- kasv, langus, säilimine
create type source_kind     as enum ('national', 'program', 'internal_test', 'survey', 'observation', 'register', 'other');
create type activity_status as enum ('planned', 'in_progress', 'done', 'postponed', 'cancelled');
create type decision_kind   as enum ('continue', 'change', 'stop', 'add', 'other');  -- jätkame, muudame, loobume, lisame
create type analysis_status as enum ('draft', 'approved');

-- ---------------------------------------------------------------------
-- Kasutajad ja õigused
-- ---------------------------------------------------------------------
create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null,
  email       text,
  role        user_role not null default 'viewer',
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Arengukava ja arengusuunad
-- ---------------------------------------------------------------------
create table plans (
  id           uuid primary key default gen_random_uuid(),
  school_name  text not null,
  title        text not null,
  start_year   int  not null,                 -- 2027
  end_year     int  not null,                 -- 2030
  baseline_year int not null,                 -- vaikimisi algtaseme aasta, nt 2026
  check (start_year <= end_year),
  check (baseline_year <= start_year)
);

create table directions (                     -- strateegiline arengusuund
  id               uuid primary key default gen_random_uuid(),
  plan_id          uuid not null references plans(id) on delete cascade,
  position         int  not null,
  code             text not null,             -- "S1"
  title            text not null,             -- eesmärgi nimetus
  starting_point   text,                      -- lähtekoht
  desired_change   text,                      -- soovitud muutus
  learner_impact   text,                      -- mõju õppijale
  unique (plan_id, code)
);

-- Vastutajad (võib olla mitu; üks on peavastutaja). Määrab muutmisõiguse.
create table direction_owners (
  direction_id  uuid not null references directions(id) on delete cascade,
  user_id       uuid not null references profiles(id) on delete cascade,
  is_lead       boolean not null default false,
  primary key (direction_id, user_id)
);

create table goals (                          -- arengusuuna alaeesmärk
  id              uuid primary key default gen_random_uuid(),
  direction_id    uuid not null references directions(id) on delete cascade,
  position        int  not null,
  code            text not null,              -- "S1.2"
  title           text not null,
  desired_change  text,
  learner_impact  text,
  unique (direction_id, code)
);

-- ---------------------------------------------------------------------
-- Andmeallikad ja staatusereeglid
-- ---------------------------------------------------------------------
create table data_sources (
  id     uuid primary key default gen_random_uuid(),
  name   text not null unique,                -- HARNO, KiVa, koolisisene test, ...
  kind   source_kind not null,
  note   text
);

-- Kasutaja määratav reegel. Väärtused on protsendid "planeeritud arengust seisuga aasta X".
create table status_rules (
  id                   uuid primary key default gen_random_uuid(),
  name                 text not null,
  green_min_pct        numeric not null default 75,   -- >= 75% planeeritud arengust → roheline
  yellow_min_pct       numeric not null default 40,   -- 40–74% → kollane; alla selle → punane
  red_on_negative      boolean not null default true, -- vales suunas liikumine → alati punane
  maintain_tolerance   numeric not null default 0,    -- säilimise puhul lubatud kõrvalekalle (mõõdiku ühikutes)
  is_default           boolean not null default false,
  check (green_min_pct > yellow_min_pct and yellow_min_pct >= 0)
);
create unique index status_rules_one_default on status_rules (is_default) where is_default;

-- ---------------------------------------------------------------------
-- Mõõdikud ja tulemused
-- ---------------------------------------------------------------------
create table indicators (                     -- mõõdik
  id               uuid primary key default gen_random_uuid(),
  goal_id          uuid not null references goals(id) on delete cascade,
  code             text not null,             -- "S1.1-T1"
  name             text not null,
  kind             indicator_kind not null,
  impact_level     impact_level not null,
  source_id        uuid references data_sources(id),
  unit             text not null,             -- "%", "punkti", "skaala 1–5"
  direction        trend_direction not null,
  baseline_value   numeric,                   -- NULL = algtase puudub → andmelünk
  baseline_year    int,
  baseline_note    text,
  target_value     numeric,                   -- sihttase 2030
  target_year      int not null default 2030,
  status_rule_id   uuid references status_rules(id),   -- NULL = vaikereegel
  is_key           boolean not null default false,      -- võtmenäitaja (juhtkonna vaates esile, mõjutab suuna üldstaatust)
  owner_id         uuid references profiles(id),
  description      text,                      -- selgitav kommentaar
  active           boolean not null default true,
  created_at       timestamptz not null default now(),
  unique (goal_id, code),
  check (baseline_value is null or baseline_year is not null)
);

-- Aasta vahetulemus. Üks kehtiv väärtus mõõdiku ja aasta kohta;
-- päritolu (allikas, mõõtmise kuupäev, sisestaja, sisestamise aeg) on alati kirjas.
create table indicator_results (
  id             uuid primary key default gen_random_uuid(),
  indicator_id   uuid not null references indicators(id) on delete cascade,
  year           int  not null,
  value          numeric not null,
  source_id      uuid references data_sources(id),  -- NULL = mõõdiku vaikimisi allikas
  measured_on    date,                              -- millal mõõdeti / andmed avaldati
  sample_size    int,                               -- n (valimi suurus), kui asjakohane
  comment        text,
  entered_by     uuid references profiles(id),
  entered_at     timestamptz not null default now(),
  updated_by     uuid references profiles(id),
  updated_at     timestamptz,
  unique (indicator_id, year)
);

-- ---------------------------------------------------------------------
-- Tegevused
-- ---------------------------------------------------------------------
create table activities (
  id             uuid primary key default gen_random_uuid(),
  goal_id        uuid not null references goals(id) on delete cascade,
  title          text not null,
  description    text,
  owner_id       uuid references profiles(id),
  year           int  not null,                -- kavandatud aasta tegevuskavas
  start_date     date,
  due_date       date,
  status         activity_status not null default 'planned',
  completed_on   date,
  outcome_note   text,                         -- mis tegelikult toimus
  created_at     timestamptz not null default now(),
  check (status <> 'done' or completed_on is not null)
);

-- Millist mõõdikut tegevus peaks mõjutama (mõjuahela nähtavus).
create table activity_indicators (
  activity_id   uuid not null references activities(id) on delete cascade,
  indicator_id  uuid not null references indicators(id) on delete cascade,
  primary key (activity_id, indicator_id)
);

-- ---------------------------------------------------------------------
-- Tõendid (link või fail Supabase Storage'is) — seotud täpselt ühe objektiga
-- ---------------------------------------------------------------------
create table evidence (
  id             uuid primary key default gen_random_uuid(),
  indicator_result_id uuid references indicator_results(id) on delete cascade,
  activity_id    uuid references activities(id) on delete cascade,
  analysis_id    uuid,                         -- FK lisatakse pärast impact_analyses loomist
  title          text not null,
  url            text,
  storage_path   text,                         -- bucket "evidence"
  added_by       uuid references profiles(id),
  added_at       timestamptz not null default now(),
  check (num_nonnulls(indicator_result_id, activity_id, analysis_id) = 1),
  check (url is not null or storage_path is not null),
  check (url is null or url ~* '^https?://')    -- mitte javascript: vms (XSS)
);

-- ---------------------------------------------------------------------
-- Aasta mõjuanalüüs (üks suuna ja aasta kohta; kinnitamisel lukustub)
-- ---------------------------------------------------------------------
create table impact_analyses (
  id                 uuid primary key default gen_random_uuid(),
  direction_id       uuid not null references directions(id) on delete cascade,
  year               int  not null,
  planned            text,   -- Mida kavandasime?
  done               text,   -- Mida tegime?
  practice_change    text,   -- Mis praktikas muutus?
  learner_experience text,   -- Mida õppija koges teisiti?
  results_change     text,   -- Millised tulemused muutusid?
  keep_doing         text,   -- Mida jätkame?
  change_next        text,   -- Mida muudame?
  stop_doing         text,   -- Millest loobume?
  status             analysis_status not null default 'draft',
  snapshot           jsonb,  -- kinnitamise hetke mõõdikud, staatused ja tegevuste seis (ajalugu ei muutu tagantjärele)
  created_by         uuid references profiles(id),
  approved_by        uuid references profiles(id),
  approved_at        timestamptz,
  unique (direction_id, year),
  check (status = 'draft' or (approved_at is not null and snapshot is not null))
);

alter table evidence
  add constraint evidence_analysis_fk foreign key (analysis_id) references impact_analyses(id) on delete cascade;

-- ---------------------------------------------------------------------
-- Juhtimisotsused ja tegevuskava muudatused
-- ---------------------------------------------------------------------
create table decisions (
  id             uuid primary key default gen_random_uuid(),
  direction_id   uuid not null references directions(id) on delete cascade,
  goal_id        uuid references goals(id) on delete set null,
  indicator_id   uuid references indicators(id) on delete set null,
  activity_id    uuid references activities(id) on delete set null,
  analysis_id    uuid references impact_analyses(id) on delete set null,
  decided_on     date not null default current_date,
  kind           decision_kind not null,
  title          text not null,
  rationale      text,                         -- põhjendus (millele otsus tugineb)
  effective_year int,                          -- millise aasta tegevuskava see muudab
  owner_id       uuid references profiles(id),
  created_by     uuid references profiles(id),
  created_at     timestamptz not null default now()
);

create index on goals (direction_id);
create index on indicators (goal_id);
create index on indicator_results (indicator_id, year);
create index on activities (goal_id, year);
create index on activities (due_date) where status in ('planned', 'in_progress');
create index on decisions (direction_id, decided_on desc);

-- ---------------------------------------------------------------------
-- Muudatuste ajalugu (audit). Kirjutavad ainult triggerid; kasutajad saavad
-- ainult lugeda (koolijuht kõike, vastutaja oma suuna kohta). Ridu ei saa
-- muuta ega kustutada.
-- ---------------------------------------------------------------------
create table audit_log (
  id              bigint generated always as identity primary key,
  changed_at      timestamptz not null default now(),
  changed_by      uuid,                       -- auth.uid(); NULL = migratsioon / hooldus
  table_name      text not null,
  record_id       uuid,
  direction_id    uuid,                       -- filtreerimiseks ja õigusteks
  action          text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  changed_fields  text[],                     -- UPDATE puhul muutunud veerud
  old_data        jsonb,
  new_data        jsonb
);
create index on audit_log (table_name, record_id, changed_at desc);
create index on audit_log (direction_id, changed_at desc);

-- =====================================================================
-- Abifunktsioonid õiguste jaoks
--   security definer + tühi search_path: loevad tabeleid RLS-ist sõltumata,
--   kuid ei sõltu kasutaja search_path'ist (kõik nimed on täielikult kvalifitseeritud).
-- =====================================================================

-- Liige = kasutajal on profiil. Iseregistreerunud kasutajal profiili pole (vt 0002).
create function is_member() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()))
$$;

create function is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin')
$$;

create function can_edit_direction(dir uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select dir is not null and (
    public.is_admin() or exists (
      select 1 from public.direction_owners o join public.profiles p on p.id = o.user_id
      where o.direction_id = dir and o.user_id = (select auth.uid()) and p.role = 'owner'
    )
  )
$$;

create function goal_direction(g uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select direction_id from public.goals where id = g
$$;

create function indicator_direction(ind uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select g.direction_id from public.indicators i join public.goals g on g.id = i.goal_id where i.id = ind
$$;

create function activity_direction(act uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select g.direction_id from public.activities a join public.goals g on g.id = a.goal_id where a.id = act
$$;

create function result_direction(res uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select public.indicator_direction(r.indicator_id) from public.indicator_results r where r.id = res
$$;

create function analysis_direction(an uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select direction_id from public.impact_analyses where id = an
$$;

-- Tõendit võib lisada/muuta oma suuna objektile; kinnitatud mõjuanalüüsi tõendeid ainult admin.
create function can_edit_evidence(res uuid, act uuid, an uuid) returns boolean
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

-- =====================================================================
-- Vaated ja aruandefunktsioonid — töötavad KÜSIJA õigustes (RLS kehtib)
-- =====================================================================

-- Mõõdik koos suuna, allika ja viimase tulemusega (päritolu nähtav).
create view v_indicator_latest with (security_invoker = true) as
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

-- ANDMELÜNK: eesmärgid ilma mõõdikuta ja mõõdikud ilma algtaseme / sihi / värske tulemuseta.
create function data_gaps(report_year int default extract(year from current_date)::int)
returns table (
  direction_id uuid, goal_id uuid, indicator_id uuid,
  gap_type text, message text
)
language sql stable security invoker set search_path = '' as $$
  -- 1) eesmärgil pole ühtegi tulemusnäitajat
  select g.direction_id, g.id, null::uuid, 'no_outcome_indicator',
         'Eesmärgil „' || g.title || '“ puudub tulemusnäitaja → vaja luua mõõdik ja algtaseme mõõtmine'
  from public.goals g
  where not exists (select 1 from public.indicators i where i.goal_id = g.id and i.active and i.kind = 'outcome')
  union all
  -- 2) mõõdikul puudub algtase
  select g.direction_id, g.id, i.id, 'no_baseline',
         'Mõõdikul „' || i.name || '“ puudub algtase → planeeri algtaseme mõõtmine'
  from public.indicators i join public.goals g on g.id = i.goal_id
  where i.active and i.baseline_value is null
  union all
  -- 3) mõõdikul puudub sihttase
  select g.direction_id, g.id, i.id, 'no_target',
         'Mõõdikul „' || i.name || '“ puudub sihttase ' || i.target_year
  from public.indicators i join public.goals g on g.id = i.goal_id
  where i.active and i.target_value is null
  union all
  -- 4) aruandeaasta tulemus sisestamata
  select g.direction_id, g.id, i.id, 'no_current_result',
         'Mõõdikul „' || i.name || '“ puudub ' || (report_year - 1) || '/' || right(report_year::text, 2) || ' õppeaasta tulemus'
  from public.indicators i join public.goals g on g.id = i.goal_id
  where i.active and i.baseline_value is not null
    and coalesce(i.baseline_year, 0) < report_year
    and not exists (select 1 from public.indicator_results r where r.indicator_id = i.id and r.year = report_year)
$$;

-- Tähtaja ületanud tegevused (kuupäev parameetrina, et saaks vaadata ka "seisuga" aruannet).
create function overdue_activities(as_of date default current_date)
returns setof activities
language sql stable security invoker set search_path = '' as $$
  select a.* from public.activities a
  where a.status in ('planned', 'in_progress') and a.due_date < as_of
$$;

-- =====================================================================
-- Triggerid: päritolu, terviklikkus, ajalugu
-- =====================================================================

-- Tulemuste päritolu: sisestaja ja ajatempel pannakse alati andmebaasis.
create function stamp_result() returns trigger
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

create trigger indicator_results_stamp
  before insert or update on indicator_results
  for each row execute function stamp_result();

-- Tõendi lisaja: alati sisselogitud kasutaja, mitte kliendi saadetud väärtus.
create function stamp_evidence() returns trigger
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

create trigger evidence_stamp
  before insert or update on evidence
  for each row execute function stamp_evidence();

-- Tegevus ja mõõdik, mida see mõjutab, peavad olema samas arengusuunas.
create function check_activity_indicator() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if public.activity_direction(new.activity_id) is distinct from public.indicator_direction(new.indicator_id) then
    raise exception 'Tegevus ja mõõdik peavad kuuluma samasse arengusuunda' using errcode = '23514';
  end if;
  return new;
end $$;

create trigger activity_indicators_same_direction
  before insert or update on activity_indicators
  for each row execute function check_activity_indicator();

-- Otsus võib viidata ainult oma arengusuuna eesmärgile, mõõdikule, tegevusele ja analüüsile.
-- Koostaja = sisselogitud kasutaja.
create function check_decision() returns trigger
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

create trigger decisions_check
  before insert or update on decisions
  for each row execute function check_decision();

-- Mõjuanalüüs: kinnitusväljad (staatus, hetktõmmis, kinnitaja) on ainult admini muuta.
create function guard_analysis() returns trigger
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

create trigger impact_analyses_guard
  before insert or update on impact_analyses
  for each row execute function guard_analysis();

-- Vähemalt üks administraator peab alati alles jääma.
create function protect_last_admin() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.role = 'admin' and (tg_op = 'DELETE' or new.role <> 'admin')
     and not exists (select 1 from public.profiles where role = 'admin' and id <> old.id) then
    raise exception 'Vähemalt üks administraator peab jääma' using errcode = '23514';
  end if;
  return coalesce(new, old);
end $$;

create trigger profiles_last_admin
  before update or delete on profiles
  for each row execute function protect_last_admin();

-- Ajaloo trigger: salvestab iga lisamise, muutmise ja kustutamise koos vana ja uue väärtusega.
create function write_audit() returns trigger
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
    if fields is null then return null; end if;   -- sisuline muutus puudub
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

do $$
declare t text;
begin
  foreach t in array array['profiles', 'directions', 'direction_owners', 'goals', 'status_rules',
                           'indicators', 'indicator_results', 'activities', 'decisions',
                           'impact_analyses', 'evidence']
  loop
    execute format('create trigger %I after insert or update or delete on public.%I
                    for each row execute function public.write_audit()', t || '_audit', t);
  end loop;
end $$;

-- =====================================================================
-- Õigused (Row Level Security)
--   admin  — loeb ja muudab kõike
--   owner  — loeb kõike, muudab ainult oma arengusuuna andmeid
--   viewer — ainult loeb
--   ilma profiilita kasutaja (nt iseregistreerunu) ja anon — ei näe midagi
-- =====================================================================

do $$
declare t text;
begin
  foreach t in array array['profiles', 'plans', 'directions', 'direction_owners', 'goals', 'data_sources',
                           'status_rules', 'indicators', 'indicator_results', 'activities',
                           'activity_indicators', 'evidence', 'impact_analyses', 'decisions', 'audit_log']
  loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
  foreach t in array array['profiles', 'plans', 'directions', 'direction_owners', 'goals', 'data_sources',
                           'status_rules', 'indicators', 'indicator_results', 'activities',
                           'activity_indicators', 'evidence', 'impact_analyses', 'decisions']
  loop
    execute format('create policy %I on public.%I for select to authenticated using ((select public.is_member()))',
                   t || '_read', t);
  end loop;
  -- Ainult admin kirjutab: kasutajad, arengukava, vastutajad, allikad, reeglid
  foreach t in array array['profiles', 'plans', 'direction_owners', 'data_sources', 'status_rules']
  loop
    execute format('create policy %I on public.%I for insert to authenticated with check ((select public.is_admin()))', t || '_ins', t);
    execute format('create policy %I on public.%I for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()))', t || '_upd', t);
    execute format('create policy %I on public.%I for delete to authenticated using ((select public.is_admin()))', t || '_del', t);
  end loop;
end $$;

-- Arengusuund: loob/kustutab admin, kirjeldust muudab ka vastutaja
create policy directions_ins on directions for insert to authenticated with check ((select is_admin()));
create policy directions_upd on directions for update to authenticated
  using (can_edit_direction(id)) with check (can_edit_direction(id));
create policy directions_del on directions for delete to authenticated using ((select is_admin()));

-- Vastutaja oma suuna piires. UPDATE kontrollib nii vana (using) kui uut rida (with check),
-- seega rida ei saa teise suunda "ümber tõsta".
create policy goals_ins on goals for insert to authenticated with check (can_edit_direction(direction_id));
create policy goals_upd on goals for update to authenticated
  using (can_edit_direction(direction_id)) with check (can_edit_direction(direction_id));
create policy goals_del on goals for delete to authenticated using (can_edit_direction(direction_id));

create policy indicators_ins on indicators for insert to authenticated with check (can_edit_direction(goal_direction(goal_id)));
create policy indicators_upd on indicators for update to authenticated
  using (can_edit_direction(goal_direction(goal_id))) with check (can_edit_direction(goal_direction(goal_id)));
create policy indicators_del on indicators for delete to authenticated using (can_edit_direction(goal_direction(goal_id)));

create policy results_ins on indicator_results for insert to authenticated with check (can_edit_direction(indicator_direction(indicator_id)));
create policy results_upd on indicator_results for update to authenticated
  using (can_edit_direction(indicator_direction(indicator_id))) with check (can_edit_direction(indicator_direction(indicator_id)));
create policy results_del on indicator_results for delete to authenticated using (can_edit_direction(indicator_direction(indicator_id)));

create policy activities_ins on activities for insert to authenticated with check (can_edit_direction(goal_direction(goal_id)));
create policy activities_upd on activities for update to authenticated
  using (can_edit_direction(goal_direction(goal_id))) with check (can_edit_direction(goal_direction(goal_id)));
create policy activities_del on activities for delete to authenticated using (can_edit_direction(goal_direction(goal_id)));

-- Seos tegevus ↔ mõõdik: mõlemad pooled peavad olema muudetavad (ja trigger nõuab sama suunda)
create policy act_ind_ins on activity_indicators for insert to authenticated
  with check (can_edit_direction(activity_direction(activity_id)) and can_edit_direction(indicator_direction(indicator_id)));
create policy act_ind_upd on activity_indicators for update to authenticated
  using (can_edit_direction(activity_direction(activity_id)))
  with check (can_edit_direction(activity_direction(activity_id)) and can_edit_direction(indicator_direction(indicator_id)));
create policy act_ind_del on activity_indicators for delete to authenticated using (can_edit_direction(activity_direction(activity_id)));

create policy decisions_ins on decisions for insert to authenticated with check (can_edit_direction(direction_id));
create policy decisions_upd on decisions for update to authenticated
  using (can_edit_direction(direction_id)) with check (can_edit_direction(direction_id));
create policy decisions_del on decisions for delete to authenticated using (can_edit_direction(direction_id));

create policy evidence_ins on evidence for insert to authenticated
  with check (can_edit_evidence(indicator_result_id, activity_id, analysis_id));
create policy evidence_upd on evidence for update to authenticated
  using (can_edit_evidence(indicator_result_id, activity_id, analysis_id))
  with check (can_edit_evidence(indicator_result_id, activity_id, analysis_id));
create policy evidence_del on evidence for delete to authenticated
  using (can_edit_evidence(indicator_result_id, activity_id, analysis_id));

-- Mõjuanalüüs: vastutaja koostab mustandi; kinnitatud analüüsi ei muuda keegi peale admini.
-- (Kinnitusväljad kaitseb lisaks trigger guard_analysis.)
create policy analyses_ins on impact_analyses for insert to authenticated
  with check (can_edit_direction(direction_id) and (status = 'draft' or (select is_admin())));
create policy analyses_upd on impact_analyses for update to authenticated
  using ((select is_admin()) or (can_edit_direction(direction_id) and status = 'draft'))
  with check ((select is_admin()) or (can_edit_direction(direction_id) and status = 'draft'));
create policy analyses_del on impact_analyses for delete to authenticated using ((select is_admin()));

-- Ajalugu: loeb koolijuht (kõik) ja vastutaja (oma suund). Kirjutamise poliitikaid pole.
create policy audit_read on audit_log for select to authenticated
  using ((select is_admin()) or can_edit_direction(direction_id));

-- =====================================================================
-- Privileegid
--   Supabase annab vaikimisi rollidele anon ja authenticated KÕIK õigused
--   (sh TRUNCATE, mis RLS-ist mööda läheb) ning EXECUTE kõigile funktsioonidele.
--   Võtame need ära ja anname tagasi ainult vajaliku.
-- =====================================================================
revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;

grant usage on schema public to authenticated;
grant select, insert, update, delete on
  profiles, plans, directions, direction_owners, goals, data_sources, status_rules,
  indicators, indicator_results, activities, activity_indicators, evidence,
  impact_analyses, decisions
  to authenticated;
grant select on audit_log, v_indicator_latest to authenticated;

-- RLS-is kasutatavad abifunktsioonid ja aruandefunktsioonid (triggerfunktsioonid EXECUTE õigust ei vaja)
grant execute on function
  is_member(), is_admin(), can_edit_direction(uuid), goal_direction(uuid), indicator_direction(uuid),
  activity_direction(uuid), result_direction(uuid), analysis_direction(uuid), can_edit_evidence(uuid, uuid, uuid),
  data_gaps(int), overdue_activities(date)
  to authenticated;

-- Selles skeemis hiljem loodavad tabelid/funktsioonid ei saa automaatselt anon-õigusi.
alter default privileges in schema public revoke all on tables    from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke all on functions from anon, public;
