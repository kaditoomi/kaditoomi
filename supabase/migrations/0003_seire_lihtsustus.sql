-- =====================================================================
-- Seirevaate lihtsustus: mõõtmise ajad, muutuse lävi, tegevuse tüüp, otsuse tähtaeg.
-- Käivitada pärast 0001b_turvaparandus.sql ja 0002_kasutajad.sql.
-- Ainult lisab veerge; olemasolevad andmed säilivad. Võib käivitada korduvalt.
-- =====================================================================

begin;

-- Mõõdik: millal tulemus tavaliselt saabub ja millal on kavandatud esimene mõõtmine.
--   measurement_month: kuu, mille lõpuks õppeaasta tulemus saabub (HARNO, KiVa: juuni = 6).
--     Kuni see kuu pole möödas, on puuduv tulemus "ootab mõõtmist", mitte puudus.
--   first_measurement_due: kui algtase puudub, millal see mõõdetakse (nt 2027-11-30).
--   change_threshold: väiksem muutus loetakse "muutuseta" (NULL = vaikimisi:
--     skaalal 0,1; protsentides 2 protsendipunkti).
alter table public.indicators add column if not exists measurement_month int not null default 6
  check (measurement_month between 1 and 12);
alter table public.indicators add column if not exists first_measurement_due date;
alter table public.indicators add column if not exists change_threshold numeric
  check (change_threshold is null or change_threshold >= 0);

-- Tegevus: ühekordne (kord, analüüs, kokkulepe) või praktika juurutamine (uus tava tunnis).
alter table public.activities add column if not exists kind text not null default 'milestone'
  check (kind in ('milestone', 'practice'));

-- Juhtimisotsus: tähtaeg (vastutaja on juba olemas: owner_id).
alter table public.decisions add column if not exists due_date date;

commit;
