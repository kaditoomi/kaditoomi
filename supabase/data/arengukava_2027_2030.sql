-- =====================================================================
-- Tartu Kesklinna Kooli arengukava 2027–2030: eesmärgid ja mõõdikud
-- Allikas: arengukava tekst (Edu näitajad, Protsessinäitajad).
--
-- Käivitamine: Supabase → SQL Editor → kleebi kogu fail → Run.
-- Eeldus: arengusuunad koodidega S1, S2, S3 on rakenduses juba loodud.
-- Võib käivitada korduvalt: olemasolevad eesmärgid/mõõdikud uuendatakse, topelt ei lisata.
-- Olemasolevaid tulemusi, tegevusi ega otsuseid see fail ei muuda.
--
-- Tõlgendused:
--   - Kahe klassi kohta eraldi väärtustega TN on jagatud kaheks mõõdikuks (nt TN1.1-8 ja TN1.1-4).
--   - Algtaseks on võetud arengukava tabeli "Algtase" väärtus; sulgudes olev 2026. a väärtus
--     on märkuses. Algtaseme aasta on 2026 (õppeaasta 2025/26), kui tabelis pole muud aastat.
--   - "Algtase puudub" ja "Siht määratakse pärast esimest mõõtmist" → väärtus jääb tühjaks;
--     rakendus näitab need andmelüngana, kuni väärtus sisestatakse.
--   - Siht on 2030 (õppeaasta 2029/30). Tähtajalised verstapostid (nt "analüüs esitatud 2028
--     kevadeks") ei ole mõõdikud, vaid lisatakse tegevustena iga-aastasesse tegevuskavasse.
-- =====================================================================

begin;

-- Kontroll: suunad S1–S3 peavad olemas olema
do $$
declare missing text;
begin
  select string_agg(c, ', ') into missing
  from unnest(array['S1', 'S2', 'S3']) c
  where not exists (select 1 from directions d where d.code = c);
  if missing is not null then
    raise exception 'Arengusuunad puuduvad: %. Lisa need rakenduses (Seaded → Lisa arengusuund) koodidega S1, S2, S3 või muuda selles failis koodid.', missing;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- Andmeallikad (lisatakse ainult puuduvad)
-- ---------------------------------------------------------------------
insert into data_sources (name, kind, note) values
  ('HARNO rahuloluküsitlus (õpilased)', 'national',      'HARNO rahuloluküsitlus, õpilaste skaalad 1–5'),
  ('HARNO rahuloluküsitlus (õpetajad)', 'national',      'HARNO rahuloluküsitlus, õpetajate skaalad 1–5'),
  ('Kooli pulsiküsitlus (õpilased)',    'survey',        '4.–9. kl, 2× aastas'),
  ('Kooli pulsiküsitlus (õpetajad)',    'survey',        null),
  ('KiVa küsitlus',                     'program',       'KiVa õpilasküsitlus'),
  ('KiVa juhtumiregister',              'register',      'Kooli kiusamisjuhtumite register'),
  ('Tugimeetmete register',             'register',      null),
  ('Stuudium',                          'register',      'E-päevik / Stuudiumi eksport'),
  ('Klassijuhatajate logi',             'register',      null),
  ('Juhtkonna register',                'register',      'Juhtkonna arvestus (vaatlused, arenguplaanid, koolitused)')
on conflict (name) do nothing;

-- ---------------------------------------------------------------------
-- Eesmärgid (üks igas suunas)
-- ---------------------------------------------------------------------
insert into goals (direction_id, position, code, title)
select d.id, 1, v.code, v.title
from (values
  ('S1', 'E1', 'Meie õpilane saab oma tasemel pingutada, näeb õppimises mõtet, saab vajaduse korral tuge ja juhib oma õppimist.'),
  ('S2', 'E2', 'Õpetajad töötavad ühiselt, õpivad üksteiselt ning õpilane kogeb ühiseid kokkuleppeid.'),
  ('S3', 'E3', 'Keegi ei jää kiusamisega üksi, iga õpilane tunneb end õiglaselt koheldud ning õpilased ja õpetajad saavad töö kõrvalt taastuda.')
) as v(dir, code, title)
join directions d on d.code = v.dir
on conflict (direction_id, code) do update set title = excluded.title;

-- ---------------------------------------------------------------------
-- Mõõdikud
--   kind: outcome = tulemusnäitaja (TN), process = protsessinäitaja
--   level: practice = praktika muutus, learner_reach = jõudis õppijani, learner_result = õppija tulemus/kogemus
-- ---------------------------------------------------------------------
insert into indicators (goal_id, code, name, kind, impact_level, source_id, unit, direction,
                        baseline_value, baseline_year, baseline_note, target_value, target_year, description)
select g.id, v.code, v.name, v.kind::indicator_kind, v.lvl::impact_level, s.id, v.unit, v.dir2::trend_direction,
       v.base, v.base_year, v.base_note, v.target, 2030, v.descr
from (values
  -- ===== Suund 1 / E1 =====
  ('S1','E1','TN1.1-8','TN 1.1 Õppetöö mõtestatus (8. kl)','outcome','learner_result','HARNO rahuloluküsitlus (õpilased)','skaala 1–5','increase',
     2.8, 2026, '2026. a väärtus 3,1', 3.4, 'Siht ≥ 3,4 (2028–2030).'),
  ('S1','E1','TN1.1-4','TN 1.1 Õppetöö mõtestatus (4. kl)','outcome','learner_result','HARNO rahuloluküsitlus (õpilased)','skaala 1–5','increase',
     3.2, 2026, '2026. a väärtus 3,3', 3.5, 'Siht ≥ 3,5 (2028–2030).'),
  ('S1','E1','TN1.2-8','TN 1.2 Ennastjuhtiv õppimine (8. kl)','outcome','learner_result','HARNO rahuloluküsitlus (õpilased)','skaala 1–5','increase',
     2.8, 2026, '2026. a väärtus 2,9', 3.3, 'Siht ≥ 3,3 (2028–2030).'),
  ('S1','E1','TN1.2-4','TN 1.2 Ennastjuhtiv õppimine (4. kl)','outcome','learner_result','HARNO rahuloluküsitlus (õpilased)','skaala 1–5','increase',
     3.5, 2026, '2026. a väärtus 3,5', 3.8, 'Siht ≥ 3,8 (2028–2030).'),
  ('S1','E1','TN1.3-8','TN 1.3 Arengut toetav tagasiside (8. kl)','outcome','learner_result','HARNO rahuloluküsitlus (õpilased)','skaala 1–5','increase',
     3.2, 2026, '2026. a väärtus 3,5', 3.7, 'Siht ≥ 3,7 (2028–2030).'),
  ('S1','E1','TN1.3-4','TN 1.3 Arengut toetav tagasiside (4. kl)','outcome','learner_result','HARNO rahuloluküsitlus (õpilased)','skaala 1–5','increase',
     3.9, 2026, '2026. a väärtus 4,0', 4.1, 'Siht ≥ 4,1 (2028–2030).'),
  ('S1','E1','TN1.4','TN 1.4 „Tunnis on ülesanded mulle paraja raskusega“ (enamasti/alati)','outcome','learner_result','Kooli pulsiküsitlus (õpilased)','%','increase',
     null, null, 'Algtase puudub, mõõdetakse 2027. a sügisel (5-küsimuseline küsitlus 4.–9. kl)', 70, 'Siht ≥ 70% ja 4.–6. ning 7.–9. kl vahe ≤ 10 protsendipunkti. Pulsiküsitlus 2× aastas.'),
  ('S1','E1','TN1.5','TN 1.5 Õpetajate hinnang HEV-õppe võimalustele','outcome','practice','HARNO rahuloluküsitlus (õpetajad)','skaala 1–5','increase',
     3.4, 2024, 'HARNO 2024; 2021. a tase 3,8', 3.8, 'Siht ≥ 3,8 (2021. aasta tase).'),
  ('S1','E1','TN1.6','TN 1.6 Õpilased, kelle tugimeetme kokkulepitud eesmärk täitus','outcome','learner_result','Tugimeetmete register','%','increase',
     null, null, 'Algtase puudub, mõõdetakse 2027/28. õppeaastal', null, 'Siht määratakse pärast esimest mõõtmist (2028).'),
  ('S1','E1','TN1.7','TN 1.7 „Ma saan õppetöös ise valida, mida või kuidas teen“ (enamasti/alati)','outcome','learner_result','Kooli pulsiküsitlus (õpilased)','%','increase',
     null, null, 'Algtase puudub, mõõdetakse 2027. a sügisel', null, 'Siht määratakse pärast esimest mõõtmist.'),
  ('S1','E1','P1.1','Õpilased, kes teavad pärast kokkuvõtvat tööd, mis õnnestus, mida veel õppida ja mida järgmiseks teha','process','learner_reach','Stuudium','%','increase',
     null, null, 'Algtase puudub, saab Stuudiumist 2027. a sügisel', 80, 'Siht vähemalt 80%.'),
  ('S1','E1','P1.2','6.–9. kl õpilased, kelle arenguvestlusel on eesmärk ja järgmisel vestlusel kontroll','process','learner_reach','Klassijuhatajate logi','%','increase',
     null, null, 'Algtase puudub', 80, 'Siht vähemalt 80%.'),
  ('S1','E1','P1.3','Klassid, kus üldpädevuste seire on tehtud','process','practice','Juhtkonna register','%','increase',
     null, null, 'Seire kord kehtib 2027/28. õa alguseks', 80, 'Siht: 2028/29. õppeaastal on seire tehtud vähemalt 80% klassides.'),
  ('S1','E1','P1.4','Tugimeetmed, millel on enne rakendamist kirjas eesmärk ja hindamise kuupäev','process','practice','Tugimeetmete register','%','increase',
     null, null, 'Algtase puudub', 90, 'Siht vähemalt 90%.'),

  -- ===== Suund 2 / E2 =====
  ('S2','E2','TN2.1-4','TN 2.1 Koostöine õpetamine, õpilaste hinnang (4. kl)','outcome','learner_result','HARNO rahuloluküsitlus (õpilased)','skaala 1–5','increase',
     2.3, 2023, 'HARNO 2023; küsimus tuleb HARNO-lt tagasi tellida või lisada kooli pulsiküsitlusse', 3.0, 'Siht ≥ 3,0.'),
  ('S2','E2','TN2.1-8','TN 2.1 Koostöine õpetamine, õpilaste hinnang (8. kl)','outcome','learner_result','HARNO rahuloluküsitlus (õpilased)','skaala 1–5','increase',
     1.8, 2023, 'HARNO 2023; küsimus tuleb HARNO-lt tagasi tellida või lisada kooli pulsiküsitlusse', 2.6, 'Siht ≥ 2,6.'),
  ('S2','E2','TN2.2','TN 2.2 Õppenädalad, mil ühelgi klassil ei ole rohkem kui kaks kokkuvõtvat tööd','outcome','learner_reach','Stuudium','%','increase',
     null, null, 'Algtase puudub, loetakse Stuudiumist 2027. a sügisel', 90, 'Siht ≥ 90% õppenädalatest.'),
  ('S2','E2','TN2.3','TN 2.3 7.–9. kl õpilased: õpetajad seostavad ainete teemasid ja on omavahel kokku leppinud','outcome','learner_result','Kooli pulsiküsitlus (õpilased)','%','increase',
     null, null, 'Algtase puudub, mõõdetakse 2027. a sügisel', 60, 'Siht ≥ 60%.'),
  ('S2','E2','TN2.4','TN 2.4 Õpetajate tööga rahulolu','outcome','practice','HARNO rahuloluküsitlus (õpetajad)','skaala 1–5','increase',
     4.3, 2024, 'HARNO 2024', null, 'Siht: statistiliselt selgelt paranenud (arvuline siht kokku leppida).'),
  ('S2','E2','TN2.5','TN 2.5 Õpetajad, kes on koolituse tulemusel oma praktikat muutnud','outcome','practice','Kooli pulsiküsitlus (õpetajad)','%','increase',
     null, null, 'Algtase puudub, mõõdetakse 2027. a kevadel', null, 'Siht määratakse pärast esimest mõõtmist.'),
  ('S2','E2','P2.1','Koolitustundide osakaal kolmel prioriteetsel teemal','process','practice','Juhtkonna register','%','increase',
     5, 2025, '172 tundi 3222-st (2022–2025)', 40, 'Siht vähemalt 40% kooli rahastatud ühise professionaalse arengu mahust. Iga õpiring analüüsib vähemalt ühe katsetatud praktika mõju õppijale.'),
  ('S2','E2','P2.2','Õpetajad, kes osalevad aastas vähemalt ühes vaatlus–tagasiside–katsetus tsüklis','process','practice','Juhtkonna register','%','increase',
     null, null, 'Algtase puudub', 80, 'Siht vähemalt 80%; igal õpetajal aastas vähemalt kaks kolleegi tunnivaatlust ja järelvestlust.'),
  ('S2','E2','P2.3','II–III kooliastme klassid, kus on aastas ≥ 2 ühiselt planeeritud ja hinnatud ainetevahelist ülesannet','process','learner_reach','Juhtkonna register','%','increase',
     null, null, 'Algtase „juhuslik“, loendatakse 2027. aastal', 100, 'Siht: iga II–III kooliastme klass.'),
  ('S2','E2','P2.4','Õpetajad, kellel on kolme õppimisprioriteediga seotud individuaalne arenguplaan','process','practice','Juhtkonna register','%','increase',
     null, null, 'Algtase puudub', 90, 'Siht vähemalt 90%; igal uuel õpetajal on mentor.'),

  -- ===== Suund 3 / E3 =====
  ('S3','E3','TN3.1','TN 3.1 Kiusamise all kannatajate osakaal (kõik klassid)','outcome','learner_result','KiVa küsitlus','%','decrease',
     18.7, 2026, 'KiVa 2026; riigis 14,9%', 14.5, 'Siht ≤ 14,5%. Hinnatakse kolmeaastase keskmisena ja koos TN 3.4-ga.'),
  ('S3','E3','TN3.1-1','TN 3.1 Kiusamise all kannatajate osakaal (1.–3. kl)','outcome','learner_result','KiVa küsitlus','%','decrease',
     27.3, 2026, 'KiVa 2026; riigis 21,4%', 21, 'Siht ≤ 21%.'),
  ('S3','E3','TN3.2','TN 3.2 Küberkiusamine 7.–9. klassis','outcome','learner_result','KiVa küsitlus','%','decrease',
     8.3, 2026, 'KiVa 2026; riigis 5,1%', 5, 'Siht ≤ 5%.'),
  ('S3','E3','TN3.3-jah','TN 3.3 7.–9. kl: töötajad kohtlevad kõiki võrdselt („jah“)','outcome','learner_result','KiVa küsitlus','%','increase',
     38.0, 2026, 'KiVa 2026', 50, 'Siht „jah“ ≥ 50%.'),
  ('S3','E3','TN3.3-ei','TN 3.3 7.–9. kl: töötajad ei kohtle kõiki võrdselt („ei“)','outcome','learner_result','KiVa küsitlus','%','decrease',
     31.4, 2026, 'KiVa 2026', 22, 'Siht „ei“ ≤ 22%.'),
  ('S3','E3','TN3.4','TN 3.4 Kiusatud õpilased, kelle sõnul kiusamine pärast vestlust lõppes või vähenes','outcome','learner_result','KiVa juhtumiregister','%','increase',
     60, 2026, 'KiVa 2026 (riigis 64%; vastajaid vähe)', 80, 'Siht ≥ 80% (kooli juhtumiregistrist, igal juhtumil 4 nädalat hiljem).'),
  ('S3','E3','TN3.5-8','TN 3.5 Õppedistsipliin (8. kl)','outcome','learner_result','HARNO rahuloluküsitlus (õpilased)','skaala 1–5','increase',
     3.3, 2026, '2026. a väärtus 3,0', 3.6, 'Siht ≥ 3,6.'),
  ('S3','E3','TN3.5-4','TN 3.5 Õppedistsipliin (4. kl)','outcome','learner_result','HARNO rahuloluküsitlus (õpilased)','skaala 1–5','increase',
     3.2, 2026, '2026. a väärtus 3,3', 3.5, 'Siht ≥ 3,5.'),
  ('S3','E3','TN3.6','TN 3.6 4.–9. kl õpilased: koolipäeva ja -nädala järel jääb piisavalt aega taastuda','outcome','learner_result','Kooli pulsiküsitlus (õpilased)','%','increase',
     null, null, 'Algtase puudub, mõõdetakse 2027. a sügisel', null, 'Siht määratakse pärast esimest mõõtmist.'),
  ('S3','E3','TN3.7','TN 3.7 Õpetajad: töökoormus lubab taastuda','outcome','practice','Kooli pulsiküsitlus (õpetajad)','%','increase',
     null, null, 'Algtase puudub, mõõdetakse 2027. a sügisel (võrdluseks TALIS 2024: 29% Eesti õpetajatest kogeb palju stressi)', null, 'Siht määratakse pärast esimest mõõtmist.'),
  ('S3','E3','P3.1','KiVa tunnid tehtud 1., 4. ja 7. klassis (ettenähtust)','process','learner_reach','Stuudium','%','increase',
     null, null, 'Algtase puudub', 75, 'Siht vähemalt 75% ettenähtust.'),
  ('S3','E3','P3.2','Kiusamisjuhtumid, kus esimene vestlus toimus 3 tööpäeva jooksul','process','practice','KiVa juhtumiregister','%','increase',
     null, null, 'Algtase puudub, mõõdetakse alates 2027', 90, 'Siht ≥ 90%.')
) as v(dir, goal, code, name, kind, lvl, source, unit, dir2, base, base_year, base_note, target, descr)
join directions d on d.code = v.dir
join goals g on g.direction_id = d.id and g.code = v.goal
left join data_sources s on s.name = v.source
on conflict (goal_id, code) do update set
  name = excluded.name, kind = excluded.kind, impact_level = excluded.impact_level,
  source_id = excluded.source_id, unit = excluded.unit, direction = excluded.direction,
  baseline_value = excluded.baseline_value, baseline_year = excluded.baseline_year,
  baseline_note = excluded.baseline_note, target_value = excluded.target_value,
  target_year = excluded.target_year, description = excluded.description;

commit;

-- Kontroll pärast käivitamist (peab näitama 3 eesmärki ja 36 mõõdikut):
-- select d.code, g.code, count(i.*) from goals g join directions d on d.id = g.direction_id
-- left join indicators i on i.goal_id = g.id where g.code in ('E1','E2','E3') group by 1, 2 order by 1;
