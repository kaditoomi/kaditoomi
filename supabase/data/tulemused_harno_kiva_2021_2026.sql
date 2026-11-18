-- =====================================================================
-- Ajaloolised tulemused: HARNO rahuloluküsitlus 2021–2026 ja KiVa 2024–2026
-- Aasta = õppeaasta lõpp (2026 = 2025/26).
-- Käivitamine: Supabase → SQL Editor → kleebi kõik → Run (pärast 0003 migratsiooni).
-- Võib käivitada korduvalt: sama mõõdiku sama aasta tulemus uuendatakse.
-- =====================================================================

begin;

insert into indicator_results (indicator_id, year, value, sample_size, comment)
select i.id, v.yr, v.val, v.n, v.note
from (values
  -- TN 1.1 Õppetöö mõtestatus
  ('TN1.1-8', 2021, 2.5, null::int, 'HARNO 2021'), ('TN1.1-8', 2022, 2.7, null, 'HARNO 2022'), ('TN1.1-8', 2023, 2.5, null, 'HARNO 2023'),
  ('TN1.1-8', 2024, 2.6, null, 'HARNO 2024'),      ('TN1.1-8', 2025, 2.8, null, 'HARNO 2025'), ('TN1.1-8', 2026, 3.1, null, 'HARNO 2026'),
  ('TN1.1-4', 2021, 3.1, null, 'HARNO 2021'),      ('TN1.1-4', 2022, 3.4, null, 'HARNO 2022'), ('TN1.1-4', 2023, 3.4, null, 'HARNO 2023'),
  ('TN1.1-4', 2024, 2.8, null, 'HARNO 2024'),      ('TN1.1-4', 2025, 3.4, null, 'HARNO 2025'), ('TN1.1-4', 2026, 3.3, null, 'HARNO 2026'),
  -- TN 1.2 Ennastjuhtiv õppimine
  ('TN1.2-8', 2021, 2.8, null, 'HARNO 2021'),      ('TN1.2-8', 2022, 3.1, null, 'HARNO 2022'), ('TN1.2-8', 2023, 3.0, null, 'HARNO 2023'),
  ('TN1.2-8', 2024, 2.8, null, 'HARNO 2024'),      ('TN1.2-8', 2025, 2.8, null, 'HARNO 2025'), ('TN1.2-8', 2026, 2.9, null, 'HARNO 2026'),
  ('TN1.2-4', 2021, 3.5, null, 'HARNO 2021'),      ('TN1.2-4', 2022, 3.4, null, 'HARNO 2022'), ('TN1.2-4', 2023, 3.5, null, 'HARNO 2023'),
  ('TN1.2-4', 2024, 3.3, null, 'HARNO 2024'),      ('TN1.2-4', 2025, 3.6, null, 'HARNO 2025'), ('TN1.2-4', 2026, 3.5, null, 'HARNO 2026'),
  -- TN 1.3 Arengut toetav tagasiside
  ('TN1.3-8', 2021, 3.4, null, 'HARNO 2021'),      ('TN1.3-8', 2022, 3.0, null, 'HARNO 2022'), ('TN1.3-8', 2023, 3.3, null, 'HARNO 2023'),
  ('TN1.3-8', 2024, 2.9, null, 'HARNO 2024'),      ('TN1.3-8', 2025, 3.1, null, 'HARNO 2025'), ('TN1.3-8', 2026, 3.5, null, 'HARNO 2026'),
  ('TN1.3-4', 2021, 3.9, null, 'HARNO 2021'),      ('TN1.3-4', 2022, 4.1, null, 'HARNO 2022'), ('TN1.3-4', 2023, 3.9, null, 'HARNO 2023'),
  ('TN1.3-4', 2024, 3.8, null, 'HARNO 2024'),      ('TN1.3-4', 2025, 3.9, null, 'HARNO 2025'), ('TN1.3-4', 2026, 4.0, null, 'HARNO 2026'),
  -- TN 1.5 Õpetajad: võimalused HEV-õpilaste õpetamiseks (õpetajate küsitlus 2021 ja 2024)
  ('TN1.5',   2021, 3.8, null, 'HARNO õpetajad 2021'), ('TN1.5', 2024, 3.4, null, 'HARNO õpetajad 2024'),
  -- TN 2.1 Koostöine õpetamine (skaalat küsiti 2021–2023)
  ('TN2.1-4', 2021, 1.9, null, 'HARNO 2021'),      ('TN2.1-4', 2022, 2.2, null, 'HARNO 2022'), ('TN2.1-4', 2023, 2.3, null, 'HARNO 2023'),
  ('TN2.1-8', 2021, 1.6, null, 'HARNO 2021'),      ('TN2.1-8', 2022, 1.7, null, 'HARNO 2022'), ('TN2.1-8', 2023, 1.8, null, 'HARNO 2023'),
  -- TN 2.4 Õpetajate tööga rahulolu
  ('TN2.4',   2021, 4.2, null, 'HARNO õpetajad 2021'), ('TN2.4', 2024, 4.3, null, 'HARNO õpetajad 2024'),
  -- TN 3.5 Õppedistsipliin
  ('TN3.5-8', 2021, 3.9, null, 'HARNO 2021'),      ('TN3.5-8', 2022, 3.5, null, 'HARNO 2022'), ('TN3.5-8', 2023, 2.9, null, 'HARNO 2023'),
  ('TN3.5-8', 2024, 3.6, null, 'HARNO 2024'),      ('TN3.5-8', 2025, 3.2, null, 'HARNO 2025'), ('TN3.5-8', 2026, 3.0, null, 'HARNO 2026'),
  ('TN3.5-4', 2021, 3.5, null, 'HARNO 2021'),      ('TN3.5-4', 2022, 3.3, null, 'HARNO 2022'), ('TN3.5-4', 2023, 3.1, null, 'HARNO 2023'),
  ('TN3.5-4', 2024, 2.9, null, 'HARNO 2024'),      ('TN3.5-4', 2025, 3.4, null, 'HARNO 2025'), ('TN3.5-4', 2026, 3.3, null, 'HARNO 2026'),
  -- KiVa õpilasküsitlus (2024 ja 2025 loetud raporti graafikult, ±0,2 p.p.)
  ('TN3.1',     2024, 14.2, null, 'KiVa 2024 (graafikult)'), ('TN3.1', 2025, 14.6, null, 'KiVa 2025 (graafikult)'),
  ('TN3.1',     2026, 18.7, 380,  'KiVa 2025/26; riigis 14,9%'),
  ('TN3.1-1',   2026, 27.3, 132,  'KiVa 2025/26, 1.–3. kl; riigis 21,4%'),
  ('TN3.2',     2026, 8.3,  121,  'KiVa 2025/26, 7.–9. kl; riigis 5,1%'),
  ('TN3.3-jah', 2026, 38.0, 121,  'KiVa 2025/26, 7.–9. kl; riigis 47,1%'),
  ('TN3.3-ei',  2026, 31.4, 121,  'KiVa 2025/26, 7.–9. kl; riigis 20,8%'),
  ('TN3.4',     2026, 60,   null, 'KiVa 2025/26 õpilasküsitlus (vastajaid vähe); edaspidi kooli juhtumiregistrist')
) as v(code, yr, val, n, note)
join indicators i on i.code = v.code and i.active
on conflict (indicator_id, year) do update
  set value = excluded.value, sample_size = excluded.sample_size, comment = excluded.comment
  where indicator_results.value is distinct from excluded.value
     or indicator_results.comment is distinct from excluded.comment;

-- Kontroll: mitu tulemust igal mõõdikul nüüd on
select i.code, count(r.*) as tulemusi, string_agg(r.year || ': ' || r.value, ', ' order by r.year) as vaartused
from indicators i
left join indicator_results r on r.indicator_id = i.id
where i.code in ('TN1.1-8','TN1.1-4','TN1.2-8','TN1.2-4','TN1.3-8','TN1.3-4','TN1.5','TN2.1-4','TN2.1-8','TN2.4',
                 'TN3.5-8','TN3.5-4','TN3.1','TN3.1-1','TN3.2','TN3.3-jah','TN3.3-ei','TN3.4')
group by i.code order by i.code;

commit;
