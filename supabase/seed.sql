-- =====================================================================
-- NÄIDISANDMED — Tartu Kesklinna Kool, arengukava 2027–2030
--
-- NB! Arvud on ILLUSTRATIIVSED. Need on valitud nii, et demo näitaks kõiki
-- staatuseid (roheline/kollane/punane/hall) ja andmelünki. Enne päris
-- kasutust asendada kooli tegelike algtasemete ja sihtidega.
--
-- Demo simuleerib olukorda 2027. aasta sügisel (aruandeaasta 2027,
-- aruande kuupäev 2027-10-01). Algtaseme aasta 2026.
-- Kasutajad on demokontod, mitte päris inimesed.
-- =====================================================================

-- ---------- Demokasutajad ----------
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000001', 'koolijuht@demo.test'),
  ('00000000-0000-0000-0000-000000000002', 'suund1@demo.test'),
  ('00000000-0000-0000-0000-000000000003', 'suund2@demo.test'),
  ('00000000-0000-0000-0000-000000000004', 'suund3@demo.test'),
  ('00000000-0000-0000-0000-000000000005', 'hoolekogu@demo.test');

insert into profiles (id, full_name, email, role) values
  ('00000000-0000-0000-0000-000000000001', 'Koolijuht (demo)',               'koolijuht@demo.test', 'admin'),
  ('00000000-0000-0000-0000-000000000002', 'Õppejuht I kooliaste (demo)',    'suund1@demo.test',    'owner'),
  ('00000000-0000-0000-0000-000000000003', 'Õppejuht II–III kooliaste (demo)','suund2@demo.test',   'owner'),
  ('00000000-0000-0000-0000-000000000004', 'Tugispetsialistide juht (demo)', 'suund3@demo.test',    'owner'),
  ('00000000-0000-0000-0000-000000000005', 'Hoolekogu liige (demo)',         'hoolekogu@demo.test', 'viewer')
on conflict (id) do update set full_name = excluded.full_name, email = excluded.email, role = excluded.role;  -- profiil võib olla trigeriga juba loodud

-- ---------- Arengukava ----------
insert into plans (id, school_name, title, start_year, end_year, baseline_year) values
  ('10000000-0000-0000-0000-000000000001', 'Tartu Kesklinna Kool', 'Arengukava 2027–2030', 2027, 2030, 2026);

insert into status_rules (id, name, green_min_pct, yellow_min_pct, red_on_negative, maintain_tolerance, is_default) values
  ('50000000-0000-0000-0000-000000000001', 'Vaikereegel 75/40', 75, 40, true, 0, true),
  ('50000000-0000-0000-0000-000000000002', 'Säilimine ±3',      75, 40, true, 3, false);

insert into data_sources (id, name, kind, note) values
  ('60000000-0000-0000-0000-000000000001', 'HARNO tasemetöö',            'national',      'Riiklik e-tasemetöö'),
  ('60000000-0000-0000-0000-000000000002', 'HARNO rahulolu-uuring',      'national',      'Õpilaste/õpetajate rahuloluküsitlus'),
  ('60000000-0000-0000-0000-000000000003', 'KiVa küsitlus',              'program',       'KiVa programmi iga-aastane õpilasküsitlus'),
  ('60000000-0000-0000-0000-000000000004', 'Koolisisene test',           'internal_test', null),
  ('60000000-0000-0000-0000-000000000005', 'Koolisisene õpilasküsitlus', 'survey',        null),
  ('60000000-0000-0000-0000-000000000006', 'Tunnivaatlus',               'observation',   'Ühtse vaatlusvormi alusel'),
  ('60000000-0000-0000-0000-000000000007', 'eKool / Stuudium',           'register',      'Õppeinfosüsteemi andmed');

-- ---------- Arengusuunad ----------
insert into directions (id, plan_id, position, code, title, starting_point, desired_change, learner_impact) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 1, 'S1',
   'Õpilane saab loetust aru, oskab õpitut mõtestada ja oma õppimist juhtida',
   'Funktsionaalse lugemise tulemused on stabiilsed, kuid ei kasva; õppimisstrateegiaid õpetatakse juhuslikult ja õpetajati erinevalt.',
   'Lugemisstrateegiad ja õppimise juhtimine on kõigis ainetes teadlikult õpetatav osa tunnist.',
   'Õpilane mõistab erinevaid tekste, oskab valida sobiva õppimisviisi ning hinnata oma õppimist.'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 2, 'S2',
   'Iga õpilane saab võimetekohaselt pingutada ja teab oma järgmist arengusammu',
   'Tagasiside on sageli hinnangupõhine; ülesanded on enamasti ühetasemelised.',
   'Õpetajad diferentseerivad ülesandeid ja annavad edasiviivat tagasisidet; arenguvestlus lõpeb järgmise sammu kokkuleppega.',
   'Õpilane kogeb jõukohast pingutust ja oskab sõnastada, mida ta järgmiseks õpib.'),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 3, 'S3',
   'Õppimiseks on vaja rahu, turvatunnet ja jõudu',
   'Kiusamise kogemine on langenud, kuid turvatunne vahetundides ja tundide rahu on ebaühtlane; õpetajate koormus on kõrge.',
   'Koolis on ühtsed kokkulepped rahuliku õpikeskkonna ja turvalisuse tagamiseks ning töökoormust juhitakse teadlikult.',
   'Õpilane tunneb end koolis turvaliselt, saab tunnis keskenduda ja tal on jõudu õppida.');

insert into direction_owners (direction_id, user_id, is_lead) values
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', true),
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', true),
  ('20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000004', true);

-- ---------- Eesmärgid ----------
insert into goals (id, direction_id, position, code, title, desired_change, learner_impact) values
  ('30000000-0000-0000-0000-000000000011', '20000000-0000-0000-0000-000000000001', 1, 'S1.1',
   'Õpilane saab loetust aru', 'Lugemisstrateegiaid õpetatakse kõigis ainetes.', 'Õpilane mõistab ainetekste ja ülesandeid iseseisvalt.'),
  ('30000000-0000-0000-0000-000000000012', '20000000-0000-0000-0000-000000000001', 2, 'S1.2',
   'Õpilane oskab kasutada õppimisstrateegiaid', 'Koolis on kokkulepitud õppimisstrateegiate mudel.', 'Õpilane valib ülesandele sobiva õppimisviisi.'),
  ('30000000-0000-0000-0000-000000000013', '20000000-0000-0000-0000-000000000001', 3, 'S1.3',
   'Õpilane juhib oma õppimist', 'Eesmärgistamine ja eneseanalüüs on õppetöö rutiin.', 'Õpilane seab eesmärke ja hindab oma edenemist.'),
  ('30000000-0000-0000-0000-000000000021', '20000000-0000-0000-0000-000000000002', 1, 'S2.1',
   'Õpilane teab oma järgmist arengusammu', 'Tagasiside on edasiviiv ja arenguvestlus lõpeb kokkuleppega.', 'Õpilane oskab öelda, mida ta järgmiseks õpib.'),
  ('30000000-0000-0000-0000-000000000022', '20000000-0000-0000-0000-000000000002', 2, 'S2.2',
   'Iga õpilane saab võimetekohaselt pingutada', 'Ülesanded on diferentseeritud.', 'Õpilane kogeb tunnis jõukohast pingutust.'),
  ('30000000-0000-0000-0000-000000000031', '20000000-0000-0000-0000-000000000003', 1, 'S3.1',
   'Õpilane tunneb end koolis turvaliselt', 'KiVa ja korrapidamise süsteem toimivad.', 'Õpilane ei koge kiusamist ja tunneb end turvaliselt.'),
  ('30000000-0000-0000-0000-000000000032', '20000000-0000-0000-0000-000000000003', 2, 'S3.2',
   'Õppetöö on rahulik', 'Ühtne rahuliku tunnialguse kokkulepe.', 'Õpilane saab tunnis keskenduda.'),
  ('30000000-0000-0000-0000-000000000033', '20000000-0000-0000-0000-000000000003', 3, 'S3.3',
   'Õpilastel ja õpetajatel on jõudu', 'Koormust juhitakse teadlikult.', 'Õpetajal on jõudu õpilast toetada.');

-- ---------- Mõõdikud ----------
-- veerud: goal, code, name, kind, impact_level, source, unit, direction, baseline, baseline_year, target, rule, is_key, owner
insert into indicators (goal_id, code, name, kind, impact_level, source_id, unit, direction,
                        baseline_value, baseline_year, target_value, status_rule_id, is_key, owner_id, description) values
  -- S1.1
  ('30000000-0000-0000-0000-000000000011', 'S1.1-T1', '7. kl eesti keele tasemetöö: funktsionaalse lugemise osa keskmine', 'outcome', 'learner_result',
   '60000000-0000-0000-0000-000000000001', '%', 'increase', 64, 2026, 72, null, true,  '00000000-0000-0000-0000-000000000002', 'Võrreldav aastast aastasse sama ülesandetüübi osas.'),
  ('30000000-0000-0000-0000-000000000011', 'S1.1-T2', '4. kl lugemistest: baastaseme saavutanud õpilaste osakaal', 'outcome', 'learner_result',
   '60000000-0000-0000-0000-000000000004', '%', 'increase', 71, 2026, 85, null, false, '00000000-0000-0000-0000-000000000002', null),
  ('30000000-0000-0000-0000-000000000011', 'S1.1-P1', 'Vaadeldud tunnid, kus õpetatakse lugemisstrateegiat', 'process', 'practice',
   '60000000-0000-0000-0000-000000000006', '%', 'increase', 20, 2026, 60, null, false, '00000000-0000-0000-0000-000000000002', 'Vähemalt 40 vaatlust aastas.'),
  -- S1.2: teadlikult mõõdikuta → ANDMELÜNK
  -- S1.3
  ('30000000-0000-0000-0000-000000000013', 'S1.3-T1', 'Õpilased, kes kogevad õppimise autonoomia toetamist', 'outcome', 'learner_result',
   '60000000-0000-0000-0000-000000000002', '% nõus', 'increase', 58, 2026, 70, null, false, '00000000-0000-0000-0000-000000000002', 'HARNO küsitluse autonoomia skaala.'),
  ('30000000-0000-0000-0000-000000000013', 'S1.3-P1', '5.–9. kl õpilased, kes on teinud poolaasta eneseanalüüsi', 'process', 'learner_reach',
   '60000000-0000-0000-0000-000000000007', '%', 'increase', 0, 2026, 90, null, false, '00000000-0000-0000-0000-000000000002', null),
  -- S2.1
  ('30000000-0000-0000-0000-000000000021', 'S2.1-T1', '„Ma tean, mida pean järgmiseks tegema, et paremini õppida“ (4.–9. kl)', 'outcome', 'learner_result',
   '60000000-0000-0000-0000-000000000005', '% nõus', 'increase', 52, 2026, 75, null, true,  '00000000-0000-0000-0000-000000000003', null),
  ('30000000-0000-0000-0000-000000000021', 'S2.1-P1', 'Arenguvestlused, mis lõpevad kirjaliku järgmise sammu kokkuleppega', 'process', 'learner_reach',
   '60000000-0000-0000-0000-000000000007', '%', 'increase', 60, 2026, 95, null, false, '00000000-0000-0000-0000-000000000003', null),
  -- S2.2
  ('30000000-0000-0000-0000-000000000022', 'S2.2-P1', 'Vaadeldud tunnid, kus ülesanded on diferentseeritud', 'process', 'practice',
   '60000000-0000-0000-0000-000000000006', '%', 'increase', 35, 2026, 70, null, false, '00000000-0000-0000-0000-000000000003', null),
  ('30000000-0000-0000-0000-000000000022', 'S2.2-T1', '„Tunnis on mulle piisavalt pingutust nõudvaid ülesandeid“', 'outcome', 'learner_result',
   '60000000-0000-0000-0000-000000000005', '% nõus', 'increase', 61, 2026, 75, null, false, '00000000-0000-0000-0000-000000000003', null),
  ('30000000-0000-0000-0000-000000000022', 'S2.2-T2', 'Matemaatika koolisisene test: oma arengueesmärgi saavutanud õpilased', 'outcome', 'learner_result',
   '60000000-0000-0000-0000-000000000004', '%', 'increase', null, null, 70, null, false, '00000000-0000-0000-0000-000000000003', 'Test töötatakse välja 2027 sügisel → algtase puudub.'),
  -- S3.1
  ('30000000-0000-0000-0000-000000000031', 'S3.1-T1', 'Kiusamist kogenud õpilased (2–3 korda kuus või sagedamini)', 'outcome', 'learner_result',
   '60000000-0000-0000-0000-000000000003', '%', 'decrease', 12, 2026, 7, null, true,  '00000000-0000-0000-0000-000000000004', null),
  ('30000000-0000-0000-0000-000000000031', 'S3.1-T2', '„Tunnen end koolis turvaliselt“', 'outcome', 'learner_result',
   '60000000-0000-0000-0000-000000000002', '% nõus', 'increase', 78, 2026, 85, null, false, '00000000-0000-0000-0000-000000000004', null),
  ('30000000-0000-0000-0000-000000000031', 'S3.1-P1', 'Klassid (1.–6. kl), kus KiVa tunnid toimuvad plaanipäraselt', 'process', 'learner_reach',
   '60000000-0000-0000-0000-000000000003', '%', 'increase', 70, 2026, 100, null, false, '00000000-0000-0000-0000-000000000004', null),
  -- S3.2
  ('30000000-0000-0000-0000-000000000032', 'S3.2-P1', 'Vaadeldud tunnid, kus õppetöö algab rahulikult ja õigeaegselt', 'process', 'practice',
   '60000000-0000-0000-0000-000000000006', '%', 'increase', 65, 2026, 85, null, false, '00000000-0000-0000-0000-000000000004', null),
  ('30000000-0000-0000-0000-000000000032', 'S3.2-T1', '„Tundides on piisavalt rahulik, et keskenduda“', 'outcome', 'learner_result',
   '60000000-0000-0000-0000-000000000005', '% nõus', 'increase', 55, 2026, 70, null, false, '00000000-0000-0000-0000-000000000004', null),
  -- S3.3
  ('30000000-0000-0000-0000-000000000033', 'S3.3-T1', 'Õpetajate tööheaolu (rahulolu-uuring)', 'outcome', 'practice',
   '60000000-0000-0000-0000-000000000002', '% rahul', 'maintain', 82, 2026, 80, '50000000-0000-0000-0000-000000000002', false, '00000000-0000-0000-0000-000000000004', 'Eesmärk hoida vähemalt 80% (lubatud kõrvalekalle 3 p.p.).');

-- ---------- Tulemused 2027 ----------
insert into indicator_results (indicator_id, year, value, measured_on, sample_size, comment, entered_by)
select i.id, 2027, v.value, v.measured_on::date, v.n, v.comment, v.entered_by::uuid
from (values
  ('S1.1-T1', 66,   '2027-05-20', 112, null,                                     '00000000-0000-0000-0000-000000000002'),
  ('S1.1-T2', 73,   '2027-05-10', 104, null,                                     '00000000-0000-0000-0000-000000000002'),
  ('S1.1-P1', 38,   '2027-06-10',  44, '44 vaatlust',                            '00000000-0000-0000-0000-000000000002'),
  -- S1.3-T1: HARNO 2027 andmed pole veel saabunud → hall
  ('S1.3-P1', 45,   '2027-06-15', 410, null,                                     '00000000-0000-0000-0000-000000000002'),
  ('S2.1-T1', 50,   '2027-05-25', 380, 'Langus 6.–7. kl, vt kommentaar',         '00000000-0000-0000-0000-000000000003'),
  ('S2.1-P1', 74,   '2027-06-30', 520, null,                                     '00000000-0000-0000-0000-000000000003'),
  ('S2.2-P1', 41,   '2027-06-10',  44, null,                                     '00000000-0000-0000-0000-000000000003'),
  ('S2.2-T1', 64,   '2027-05-25', 380, null,                                     '00000000-0000-0000-0000-000000000003'),
  ('S3.1-T1', 10.5, '2027-04-30', 455, null,                                     '00000000-0000-0000-0000-000000000004'),
  ('S3.1-T2', 77,   '2027-03-15', 398, 'Vahetunnid ja garderoob kõige madalamad', '00000000-0000-0000-0000-000000000004'),
  ('S3.1-P1', 85,   '2027-06-01',  27, null,                                     '00000000-0000-0000-0000-000000000004'),
  ('S3.2-P1', 70,   '2027-06-10',  44, null,                                     '00000000-0000-0000-0000-000000000004'),
  ('S3.2-T1', 59,   '2027-05-25', 380, null,                                     '00000000-0000-0000-0000-000000000004'),
  ('S3.3-T1', 79,   '2027-03-15',  74, null,                                     '00000000-0000-0000-0000-000000000004')
) as v(code, value, measured_on, n, comment, entered_by)
join indicators i on i.code = v.code;

-- ---------- Tegevused 2027 ----------
insert into activities (goal_id, title, owner_id, year, start_date, due_date, status, completed_on, outcome_note)
select g.id, v.title, v.owner::uuid, 2027, v.start_date::date, v.due_date::date, v.status::activity_status, v.completed_on::date, v.note
from (values
  ('S1.1', 'Lugemisstrateegiate koolitus kõigile 1.–9. kl õpetajatele',              '00000000-0000-0000-0000-000000000002', '2027-01-10', '2027-03-31', 'done',        '2027-03-20', '58 õpetajat osales'),
  ('S1.1', 'Lugemisstrateegiate kolleegivaatlused (iga õpetaja 2 tundi)',            '00000000-0000-0000-0000-000000000002', '2027-04-01', '2027-06-15', 'in_progress', null,         '31 õpetajat 58-st'),
  ('S1.1', '4. kl koolisisene lugemistest',                                          '00000000-0000-0000-0000-000000000002', '2027-05-01', '2027-05-31', 'done',        '2027-05-10', null),
  ('S1.2', 'Õppimisstrateegiate mudeli kokkuleppimine kooliastmeti',                 '00000000-0000-0000-0000-000000000002', '2027-02-01', '2027-09-30', 'planned',     null,         null),
  ('S1.3', 'Eneseanalüüsi rutiin 5.–9. kl (2× aastas)',                              '00000000-0000-0000-0000-000000000002', '2027-01-15', '2027-12-20', 'in_progress', null,         null),
  ('S2.1', 'Arenguvestluse vormi uuendamine: järgmise sammu kokkulepe',              '00000000-0000-0000-0000-000000000003', '2026-11-01', '2027-01-31', 'done',        '2027-01-25', null),
  ('S2.1', 'Edasiviiva tagasiside õpikogukond',                                      '00000000-0000-0000-0000-000000000003', '2027-02-01', '2027-12-15', 'in_progress', null,         null),
  ('S2.2', 'Diferentseeritud ülesannete pank (matemaatika, eesti keel)',             '00000000-0000-0000-0000-000000000003', '2027-01-15', '2027-08-31', 'in_progress', null,         'Matemaatika valmis, eesti keel pooleli'),
  ('S2.2', 'Matemaatika koolisisese testi väljatöötamine ja algtaseme mõõtmine',     '00000000-0000-0000-0000-000000000003', '2027-09-01', '2027-11-30', 'planned',     null,         null),
  ('S3.1', 'KiVa tunnid 1.–6. kl kõigis klassides',                                 '00000000-0000-0000-0000-000000000004', '2026-09-01', '2027-06-10', 'done',        '2027-06-10', '23 klassi 27-st plaanipäraselt'),
  ('S3.1', 'Vahetunnikorrapidamise uus süsteem',                                     '00000000-0000-0000-0000-000000000004', '2027-01-15', '2027-04-30', 'postponed',   null,         'Lükatud 2028 algusesse'),
  ('S3.2', 'Rahuliku tunnialguse kokkulepe ja rakendamine',                          '00000000-0000-0000-0000-000000000004', '2027-03-01', '2027-09-01', 'done',        '2027-08-28', null),
  ('S3.3', 'Õpetajate töökoormuse kaardistus ja koosolekute vähendamine',            '00000000-0000-0000-0000-000000000004', '2027-01-15', '2027-06-30', 'done',        '2027-06-20', null)
) as v(goal_code, title, owner, start_date, due_date, status, completed_on, note)
join goals g on g.code = v.goal_code;

-- Tegevus → mõõdik, mida see peaks mõjutama
insert into activity_indicators (activity_id, indicator_id)
select a.id, i.id
from (values
  ('Lugemisstrateegiate koolitus kõigile 1.–9. kl õpetajatele',          'S1.1-P1'),
  ('Lugemisstrateegiate kolleegivaatlused (iga õpetaja 2 tundi)',        'S1.1-P1'),
  ('Lugemisstrateegiate kolleegivaatlused (iga õpetaja 2 tundi)',        'S1.1-T1'),
  ('Eneseanalüüsi rutiin 5.–9. kl (2× aastas)',                          'S1.3-P1'),
  ('Arenguvestluse vormi uuendamine: järgmise sammu kokkulepe',          'S2.1-P1'),
  ('Edasiviiva tagasiside õpikogukond',                                  'S2.1-T1'),
  ('Diferentseeritud ülesannete pank (matemaatika, eesti keel)',         'S2.2-P1'),
  ('Diferentseeritud ülesannete pank (matemaatika, eesti keel)',         'S2.2-T1'),
  ('Matemaatika koolisisese testi väljatöötamine ja algtaseme mõõtmine', 'S2.2-T2'),
  ('KiVa tunnid 1.–6. kl kõigis klassides',                             'S3.1-P1'),
  ('KiVa tunnid 1.–6. kl kõigis klassides',                             'S3.1-T1'),
  ('Vahetunnikorrapidamise uus süsteem',                                 'S3.1-T2'),
  ('Rahuliku tunnialguse kokkulepe ja rakendamine',                      'S3.2-P1'),
  ('Õpetajate töökoormuse kaardistus ja koosolekute vähendamine',        'S3.3-T1')
) as v(title, code)
join activities a on a.title = v.title
join indicators i on i.code = v.code;

-- ---------- Tõendid ----------
insert into evidence (indicator_result_id, title, url, added_by)
select r.id, v.title, v.url, '00000000-0000-0000-0000-000000000002'
from (values
  ('S1.1-T1', 'HARNO tasemetöö kooli koondraport 2027', 'https://example.org/demo/harno-2027.pdf'),
  ('S1.1-P1', 'Tunnivaatluste koondtabel 2027',          'https://example.org/demo/vaatlused-2027.xlsx')
) as v(code, title, url)
join indicators i on i.code = v.code
join indicator_results r on r.indicator_id = i.id and r.year = 2027;

-- ---------- Juhtimisotsused ----------
insert into decisions (direction_id, indicator_id, decided_on, kind, title, rationale, effective_year, owner_id, created_by)
values
  ('20000000-0000-0000-0000-000000000002', (select id from indicators where code = 'S2.1-T1'), '2027-06-12', 'change',
   'Arenguvestluse järgmise sammu kokkulepe ka 6.–7. kl õpilaste enda sõnastuses',
   'Õpilasküsitluses langes „tean oma järgmist sammu“ 52%→50%, kuigi 74% vestlustest lõppes kokkuleppega: kokkulepe on täiskasvanu sõnastatud ega jõua õpilaseni.',
   2028, '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000003', (select id from indicators where code = 'S3.1-T2'), '2027-06-12', 'change',
   'Vahetunnikorrapidamise süsteem lükatakse 2028 jaanuari, eelnevalt kaardistatakse ohtlikud kohad koos õpilasesindusega',
   'Turvatunne ei paranenud (78%→77%); madalaimad hinnangud vahetundides ja garderoobis.',
   2028, '00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000001', null, '2027-08-25', 'add',
   'S1.2 jaoks luuakse 2027/28 õppimisstrateegiate kasutamise mõõdik ja tehakse algtaseme mõõtmine',
   'Eesmärgil puudub mõõdik (andmelünk) – ilma algtasemeta ei saa 2030. aastal mõju hinnata.',
   2028, '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001');

-- ---------- Mõjuanalüüs 2027 (S3 mustand) ----------
insert into impact_analyses (direction_id, year, planned, done, practice_change, learner_experience, results_change,
                             keep_doing, change_next, stop_doing, status, created_by)
values ('20000000-0000-0000-0000-000000000003', 2027,
  'KiVa tunnid kõigis 1.–6. kl, uus vahetunnikorrapidamine, rahuliku tunnialguse kokkulepe, koormuse kaardistus.',
  'KiVa tunnid toimusid 23 klassis 27-st; tunnialguse kokkulepe rakendati; korrapidamise süsteem lükkus edasi.',
  'Rahulikult algavate tundide osakaal kasvas 65%→70%.',
  'Õpilased kogevad tundides rohkem rahu (55%→59%), kuid vahetunnid on endiselt ebaturvalised.',
  'Kiusamise kogemine langes 12%→10,5%; turvatunne ei paranenud (78%→77%).',
  'KiVa tunnid, rahuliku tunnialguse kokkulepe.',
  'Vahetunnikorrapidamine kavandatakse koos õpilasesindusega.',
  'Eraldi „turvalisuse nädala“ üritusest, sest sel puudus seos mõõdikutega.',
  'draft', '00000000-0000-0000-0000-000000000004');
