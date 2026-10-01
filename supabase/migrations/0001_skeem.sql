-- =====================================================================
-- Arengukava seire- ja juhtimisvahend — andmebaasi skeem (MVP)
-- Sihtplatvorm: Supabase (PostgreSQL 15+). Kasutab auth.users ja auth.uid().
--
-- Keskne loogika:
--   arengusuund → eesmärk → mõõdik → algtase → sihttase → tulemus (aasta)
--   → tõend → mõjuanalüüs → juhtimisotsus
--   ning eesmärk → tegevus → (mõjutab) mõõdikut.
--
-- Identifikaatorid on ingliskeelsed (koodi ja tööriistade huvides),
-- kasutajaliides on eestikeelne. Sõnastik: docs/01-andmemudel.md
-- =====================================================================

create extension if not exists pgcrypto;

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
  check (url is not null or storage_path is not null)
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

-- =====================================================================
-- Vaated
-- =====================================================================

-- Mõõdik koos suuna, allika ja viimase tulemusega (päritolu nähtav).
create view v_indicator_latest as
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
from indicators i
join goals g      on g.id = i.goal_id
join directions d on d.id = g.direction_id
left join lateral (
  select * from indicator_results x where x.indicator_id = i.id order by x.year desc limit 1
) r on true
left join lateral (
  select * from indicator_results x where x.indicator_id = i.id and x.year < r.year order by x.year desc limit 1
) p on true
where i.active;

-- ANDMELÜNK: eesmärgid ilma mõõdikuta ja mõõdikud ilma algtaseme / sihi / värske tulemuseta.
-- Parameetrina kasutatakse aruandeaastat (vaikimisi jooksev aasta), seetõttu funktsioon.
create function data_gaps(report_year int default extract(year from current_date)::int)
returns table (
  direction_id uuid, goal_id uuid, indicator_id uuid,
  gap_type text, message text
)
language sql stable as $$
  -- 1) eesmärgil pole ühtegi tulemusnäitajat
  select g.direction_id, g.id, null::uuid, 'no_outcome_indicator',
         'Eesmärgil „' || g.title || '“ puudub tulemusnäitaja → vaja luua mõõdik ja algtaseme mõõtmine'
  from goals g
  where not exists (select 1 from indicators i where i.goal_id = g.id and i.active and i.kind = 'outcome')
  union all
  -- 2) mõõdikul puudub algtase
  select g.direction_id, g.id, i.id, 'no_baseline',
         'Mõõdikul „' || i.name || '“ puudub algtase → planeeri algtaseme mõõtmine'
  from indicators i join goals g on g.id = i.goal_id
  where i.active and i.baseline_value is null
  union all
  -- 3) mõõdikul puudub sihttase
  select g.direction_id, g.id, i.id, 'no_target',
         'Mõõdikul „' || i.name || '“ puudub sihttase ' || i.target_year
  from indicators i join goals g on g.id = i.goal_id
  where i.active and i.target_value is null
  union all
  -- 4) aruandeaasta tulemus sisestamata
  select g.direction_id, g.id, i.id, 'no_current_result',
         'Mõõdikul „' || i.name || '“ puudub ' || report_year || '. aasta tulemus'
  from indicators i join goals g on g.id = i.goal_id
  where i.active and i.baseline_value is not null
    and coalesce(i.baseline_year, 0) < report_year
    and not exists (select 1 from indicator_results r where r.indicator_id = i.id and r.year = report_year)
$$;

-- Tähtaja ületanud tegevused (kuupäev parameetrina, et saaks vaadata ka "seisuga" aruannet).
create function overdue_activities(as_of date default current_date)
returns setof activities
language sql stable as $$
  select a.* from activities a
  where a.status in ('planned', 'in_progress') and a.due_date < as_of
$$;

-- =====================================================================
-- Õigused (Row Level Security)
--   admin  — loeb ja muudab kõike
--   owner  — loeb kõike, muudab ainult oma arengusuuna andmeid
--   viewer — ainult loeb
-- =====================================================================

create function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin')
$$;

create function can_edit_direction(dir uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select is_admin() or exists (
    select 1 from direction_owners o join profiles p on p.id = o.user_id
    where o.direction_id = dir and o.user_id = auth.uid() and p.role = 'owner'
  )
$$;

create function goal_direction(g uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select direction_id from goals where id = g
$$;

create function indicator_direction(ind uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select g.direction_id from indicators i join goals g on g.id = i.goal_id where i.id = ind
$$;

create function activity_direction(act uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select g.direction_id from activities a join goals g on g.id = a.goal_id where a.id = act
$$;

do $$
declare t text;
begin
  foreach t in array array['profiles','plans','directions','direction_owners','goals','data_sources',
                           'status_rules','indicators','indicator_results','activities',
                           'activity_indicators','evidence','impact_analyses','decisions']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy %I on %I for select to authenticated using (true)', t || '_read', t);
  end loop;
end $$;

-- Ainult admin: kasutajad, arengukava, suunad, vastutajad, allikad, reeglid
create policy profiles_admin   on profiles         for all to authenticated using (is_admin()) with check (is_admin());
create policy plans_admin      on plans            for all to authenticated using (is_admin()) with check (is_admin());
create policy directions_admin on directions       for insert to authenticated with check (is_admin());
create policy directions_del   on directions       for delete to authenticated using (is_admin());
create policy directions_upd   on directions       for update to authenticated using (can_edit_direction(id)) with check (can_edit_direction(id));
create policy owners_admin     on direction_owners for all to authenticated using (is_admin()) with check (is_admin());
create policy sources_admin    on data_sources     for all to authenticated using (is_admin()) with check (is_admin());
create policy rules_admin      on status_rules     for all to authenticated using (is_admin()) with check (is_admin());

-- Vastutaja oma suuna piires
create policy goals_edit on goals for all to authenticated
  using (can_edit_direction(direction_id)) with check (can_edit_direction(direction_id));
create policy indicators_edit on indicators for all to authenticated
  using (can_edit_direction(goal_direction(goal_id))) with check (can_edit_direction(goal_direction(goal_id)));
create policy results_edit on indicator_results for all to authenticated
  using (can_edit_direction(indicator_direction(indicator_id))) with check (can_edit_direction(indicator_direction(indicator_id)));
create policy activities_edit on activities for all to authenticated
  using (can_edit_direction(goal_direction(goal_id))) with check (can_edit_direction(goal_direction(goal_id)));
create policy act_ind_edit on activity_indicators for all to authenticated
  using (can_edit_direction(activity_direction(activity_id))) with check (can_edit_direction(activity_direction(activity_id)));
create policy decisions_edit on decisions for all to authenticated
  using (can_edit_direction(direction_id)) with check (can_edit_direction(direction_id));
create policy evidence_edit on evidence for all to authenticated
  using (can_edit_direction(coalesce(
           (select indicator_direction(r.indicator_id) from indicator_results r where r.id = indicator_result_id),
           activity_direction(activity_id),
           (select a.direction_id from impact_analyses a where a.id = analysis_id))))
  with check (can_edit_direction(coalesce(
           (select indicator_direction(r.indicator_id) from indicator_results r where r.id = indicator_result_id),
           activity_direction(activity_id),
           (select a.direction_id from impact_analyses a where a.id = analysis_id))));

-- Mõjuanalüüs: vastutaja koostab mustandi; kinnitatud analüüsi ei muuda keegi peale admini.
create policy analyses_insert on impact_analyses for insert to authenticated
  with check (can_edit_direction(direction_id) and (status = 'draft' or is_admin()));
create policy analyses_update on impact_analyses for update to authenticated
  using (is_admin() or (can_edit_direction(direction_id) and status = 'draft'))
  with check (is_admin() or (can_edit_direction(direction_id) and status = 'draft'));
create policy analyses_delete on impact_analyses for delete to authenticated
  using (is_admin());

-- Tulemuste päritolu: sisestaja ja ajatempel pannakse alati serveris.
create function stamp_result() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.entered_by := coalesce(auth.uid(), new.entered_by);
    new.entered_at := now();
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
