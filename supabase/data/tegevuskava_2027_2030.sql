-- =====================================================================
-- Tartu Kesklinna Kooli arengukava 2027–2030: tegevuskava
-- Allikas: arengukava "Peamised tegevussuunad", "Protsessinäitajad", "Baasmõõtmised".
--
-- Käivitamine: Supabase → SQL Editor → kleebi kogu tekst → Run.
-- Eeldus: eesmärgid E1–E3 ja mõõdikud on lisatud (arengukava_2027_2030.sql).
-- Võib käivitada korduvalt: sama nimega tegevust samas eesmärgis topelt ei lisata.
--
-- Aasta = õppeaasta lõpu aasta (2027 = 2026/27, 2028 = 2027/28) nagu arengukavas
-- ("2027. õppeaastal" = 2026/27). Tähtaeg on ainult siis, kui arengukavas on see kirjas;
-- muidu tühi ("tähtaeg määrata"). Vastutaja roll on kirjelduses.
-- =====================================================================

begin;

do $$
begin
  if (select count(*) from goals g join directions d on d.id = g.direction_id
      where (d.code, g.code) in (('S1','E1'), ('S2','E2'), ('S3','E3'))) <> 3 then
    raise exception 'Eesmärgid E1–E3 puuduvad. Käivita enne arengukava_2027_2030.sql.';
  end if;
end $$;

create temporary table tk (
  dir text, goal text, title text, year int, due date, descr text, inds text[]
) on commit drop;

insert into tk values
  -- ===================== Suund 1 / E1 =====================
  ('S1','E1','Tugisüsteemi kord õpivajadustega õppijatele', 2027, '2027-06-30',
   'Ühtne kord: märkamine, tugimeetme valik, eesmärk ja tähtaeg, mõju hindamine; tugispetsialistide, aineõpetajate ja klassijuhataja rollid. Iga tugimeetme mõju hinnatakse enne jätkamist. Kord kirjutatakse üles 2027. õppeaasta jooksul. Vastutaja: õppejuht koos tugimeeskonnaga.',
   array['P1.4','TN1.6','TN1.5']),
  ('S1','E1','Üldpädevuste seire kokkulepe (õpipädevus ja digipädevus)', 2027, '2027-08-31',
   'Kooliüleselt lepitakse kokku, mida jälgitakse, kui sageli, kes seda teeb ja kus tulemus nähtavaks muutub (Stuudium, arenguvestlus). Alustatakse õpipädevusest ja digipädevusest. Seire tulemus ei muutu hindeks. Kord kehtib 2027/28. õppeaasta alguseks. Vastutaja: õppejuht.',
   array['P1.3']),
  ('S1','E1','Õpioskuste arenguplaan 1.–9. klassile', 2028, null,
   'Iga kooliaste lepib kokku 2–3 fookusoskust ja kirjeldab, mida õpilane kooliastme lõpuks iseseisvalt oskab. Õpioskusi õpetatakse ja harjutatakse ainetundides. Ainevaldkonnad kirjeldavad plaanis ka õpilase valikud. Tähtaeg määrata. Vastutaja: õppejuht ja aineharu juhid.',
   array['TN1.2-8','TN1.2-4','TN1.1-8','TN1.1-4']),
  ('S1','E1','Õpilane juhib arenguvestlust (alates 6. klassist)', 2028, null,
   'Õpilane seab eesmärgi ja tutvustab seda; klassijuhataja kirjutab eesmärgi ja vestluse kokkuvõtte Stuudiumisse; järgmisel vestlusel eesmärgi kontroll. Tähtaeg määrata. Vastutaja: klassijuhatajad, õppejuht.',
   array['P1.2','TN1.2-8']),
  ('S1','E1','Eneseanalüüs pärast kokkuvõtvat tööd (3 küsimust)', 2028, null,
   'Pärast iga kokkuvõtvat tööd vastab õpilane: mis õnnestus, mis vajab arendamist, mis on järgmine samm. Enne uue teema algust töötatakse vead läbi. Tähtaeg määrata. Vastutaja: aineõpetajad, õppejuht.',
   array['P1.1','TN1.3-8','TN1.3-4']),
  ('S1','E1','Õpilase valik ja vastutus ainetunnis', 2028, null,
   'Iga aineõpetaja pakub õppeaastas vähemalt ühe teema või ülesande, kus õpilane valib vormi, raskusastme või teema ja vastutab oma valiku eest. Tähtaeg määrata. Vastutaja: aineõpetajad, aineharu juhid.',
   array['TN1.7']),
  ('S1','E1','Eritasemeliste ülesannete pank TERAs (matemaatika ja eesti keel esimesena)', 2028, null,
   'E-päeviku Terasse luuakse teemapõhine eritasemeliste ülesannete pank. Seos Suunaga 2 (ainevaldkondade juhid). Tähtaeg määrata. Vastutaja: aineharu juhid.',
   array['TN1.4']),
  ('S1','E1','Tasemerühmade vajaduse ja võimalikkuse analüüs (eesti keel, matemaatika)', 2028, null,
   'Analüüsitakse tasemerühmade vajadust ja võimalikkust lähtuvalt ruumi- ja õpetajate tunniressurssidest. Tähtaeg määrata. Vastutaja: õppejuht.',
   array['TN1.4']),
  ('S1','E1','Õppekorralduslike võimaluste analüüs kasvava toetusvajaduse tingimustes', 2028, '2028-05-31',
   '2027/28. õppeaastal kaardistatakse, millised lahendused (paindlikud rühmad, tugiõpetaja tunnis, tunniplaani ülesehitus, tugitunnid) on kooli otsustada ja millised vajavad koolipidaja otsust või rahastust. Analüüs esitatakse koolipidajale 2028. aasta kevadeks. Vastutaja: õppejuht, direktor.',
   array['TN1.5']),
  ('S1','E1','Õppimine väljaspool klassiruumi (iga klass vähemalt 2× aastas)', 2028, null,
   'Iga klass rakendab vähemalt kaks korda õppeaastas õpitut autentses keskkonnas, kasutades Tartu kesklinna võimalusi ja kogukonna eksperte. Tähtaeg määrata. Vastutaja: klassijuhatajad, aineõpetajad.',
   array['TN1.1-8','TN1.1-4']),
  ('S1','E1','Algtaseme mõõtmine: TN 1.4 ja TN 1.7 (õpilaste pulsiküsitlus, sügis 2027)', 2028, null,
   'Esimene mõõtmine 2027. aasta sügisel (4.–9. kl). Täpne kuupäev määrata. Vastutaja: õppejuht.',
   array['TN1.4','TN1.7']),
  ('S1','E1','Algtaseme mõõtmine: TN 1.6 tugimeetmete registrist', 2028, null,
   'Mõõdetakse 2027/28. õppeaastal. Tähtaeg määrata. Vastutaja: tugimeeskond.',
   array['TN1.6']),
  ('S1','E1','Puuduvate sihtide kinnitamine õppenõukogus (TN 1.6, TN 1.7)', 2028, '2028-01-31',
   'Sihid, mis on märgitud „määratakse pärast esimest mõõtmist“, kinnitab õppenõukogu 2028. aasta jaanuariks.',
   array['TN1.6','TN1.7']),

  -- ===================== Suund 2 / E2 =====================
  ('S2','E2','Kolm ühist koolitusprioriteeti ja nende osa koolituseelarvest', 2028, null,
   'Prioriteedid: hindamine ja tagasiside; diferentseerimine ja HEV; õpioskused ainetunnis. Iga õpetaja eneseanalüüs ja koostöövestlus seotakse nendega; koolitustundide eelarvest suunatakse neile määratud osa. Tähtaeg määrata. Vastutaja: direktor.',
   array['P2.1','TN2.5']),
  ('S2','E2','Struktureeritud koostööaeg klassi- ja aineharutiimidele', 2028, null,
   'Juhtkond leiab tunniplaanis ja töökorralduses kokkulepitud aja. Kuni aega ei ole, ei käivitata uusi koostöökohustusi. Uue püsiva tegevuse lisamisel nimetatakse tegevus, millest loobutakse. Tähtaeg määrata. Vastutaja: direktor.',
   array['TN2.1-4','TN2.1-8','TN2.4']),
  ('S2','E2','Õpiringid ja kolleegi tunnivaatlus (teaduspõhine koosõppimine)', 2028, null,
   'Iga õpiring võtab ühe küsimuse, uurib seda kirjanduse või uuringu põhjal, katsetab praktikat, kogub tõendi ja teeb järelduse. Igal õpetajal aastas vähemalt kaks kolleegi tunnivaatlust ja järelvestlust. Tähtaeg määrata. Vastutaja: direktor, ainevaldkonna juhid.',
   array['P2.2','TN2.5']),
  ('S2','E2','Ühine hinnatavate suuremate tööde kalender Stuudiumis ja koormuspiir', 2028, null,
   'Klassi tasandil on Stuudiumis nähtav suuremate hinnatavate tööde koormus. Koormuspiir lepitakse kokku õpilaste tagasiside ja esimese mõõteaasta põhjal. Seos Suunaga 1 ja 3. Tähtaeg määrata. Vastutaja: õppejuht.',
   array['TN2.2']),
  ('S2','E2','Õppekava järjepidevus kooliastmete üleminekul (3.→4. ja 6.→7. kl)', 2028, '2028-05-31',
   '2027/28. õppeaastal kirjeldab iga ainevaldkond, mida õpilane peab kooliastme lõpuks oskama, ning kontrollib kordusi, lünki, teemade järjestust ja ainetevahelist seotust. Muudatused viiakse üldtööplaani 2028. aasta kevadeks. Vastutaja: ainevaldkondade juhid.',
   array['TN2.3']),
  ('S2','E2','Ühiselt planeeritud ja hinnatud ainetevahelised ülesanded (II–III kooliaste)', 2028, null,
   'Iga II–III kooliastme klass teeb aastas vähemalt kaks ühiselt planeeritud ja ühiselt hinnatud ainetevahelist ülesannet. Algtase loendatakse 2027. aastal. Tähtaeg määrata. Vastutaja: ainevaldkondade juhid.',
   array['P2.3','TN2.3']),
  ('S2','E2','Tervikliku professionaalse arengu süsteemi kirjeldamine', 2028, '2028-06-30',
   'Individuaalne arenguplaan (seotud kolme õppimisprioriteediga), mentor igale uuele õpetajale, karjääriastmed, koolituse järel katsetatud praktika ja mõju hindamine. Kirjeldatakse 2027/28. õppeaasta jooksul. Vastutaja: direktor koos õpetajatega.',
   array['P2.4','TN2.5']),
  ('S2','E2','Algtaseme mõõtmine: TN 2.5 (õpetajate pulsiküsitlus, kevad 2027)', 2027, null,
   'Esimene mõõtmine 2027. aasta kevadel. Täpne kuupäev määrata. Vastutaja: direktor.',
   array['TN2.5']),
  ('S2','E2','Algtaseme mõõtmine: TN 2.2 (Stuudium) ja TN 2.3 (pulsiküsitlus), sügis 2027', 2028, null,
   'Esimene mõõtmine 2027. aasta sügisel. Lisaks: TN 2.1 küsimus tellida HARNO-lt tagasi või lisada kooli pulsiküsitlusse. Täpne kuupäev määrata. Vastutaja: õppejuht.',
   array['TN2.2','TN2.3','TN2.1-4','TN2.1-8']),
  ('S2','E2','Puuduvate sihtide kinnitamine õppenõukogus (TN 2.5; TN 2.4 arvuline siht)', 2028, '2028-01-31',
   'Sihid, mis on märgitud „määratakse pärast esimest mõõtmist“, kinnitab õppenõukogu 2028. aasta jaanuariks.',
   array['TN2.5','TN2.4']),

  -- ===================== Suund 3 / E3 =====================
  ('S3','E3','KiVa täielik rakendamine kõigis sihtklassides (aeg tunniplaanis)', 2028, null,
   'KiVa tundidele fikseeritud aeg tunniplaanis 1., 4. ja 7. klassis (õpetajad nimetasid paigutust raskeks). Tähtaeg määrata. Vastutaja: KiVa meeskond, õppejuht.',
   array['P3.1','TN3.1','TN3.1-1']),
  ('S3','E3','Kiusamisjuhtumite jälgimise kord ja register', 2028, null,
   'Iga juhtum registris; esimene vestlus kolme tööpäeva jooksul; tulemus neli nädalat hiljem; KiVa meeskond vaatab klasside lõikes üle kord trimestris. Mõõdetakse alates 2027. Tähtaeg määrata. Vastutaja: KiVa meeskond.',
   array['P3.2','TN3.4']),
  ('S3','E3','Klassipõhiste KiVa andmete tellimine KiVa platvormilt', 2028, null,
   'Tähtaeg määrata. Vastutaja: KiVa meeskond.',
   array['TN3.1','TN3.1-1']),
  ('S3','E3','Ühised suhtlus- ja reageerimispõhimõtted kõigile töötajatele', 2028, null,
   'Võrdne kohtlemine, õpilast ei alandata klassi ees, õpilane kuulatakse enne hinnangut ära; ühine kokkulepe tunni segava käitumise korral; töötajate omavahelise ja vanematega suhtlemise kokkulepped (sh Stuudiumi sõnumid). Tähtaeg määrata. Vastutaja: KiVa meeskond, tugimeeskond.',
   array['TN3.3-jah','TN3.3-ei','TN3.5-8','TN3.5-4']),
  ('S3','E3','Küberkiusamise ennetus 7.–9. klassis', 2028, null,
   'Teavitus ja kokkulepe vanematega; õpilaste teadlikkus, kellele küberkiusamisest rääkida. Tähtaeg määrata. Vastutaja: KiVa meeskond.',
   array['TN3.2']),
  ('S3','E3','Õpilaste ja õpetajate koormuse ja taastumise pulsiküsitlus (sügis 2027, edaspidi igal aastal)', 2028, null,
   'Esimene mõõtmine 2027. aasta sügisel (TN 3.6, TN 3.7); tulemused arutatakse õppenõukogus ja õpilasesinduses. Küsitlust korratakse igal õppeaastal. Täpne kuupäev määrata. Vastutaja: tugimeeskond koos direktoriga.',
   array['TN3.6','TN3.7']),
  ('S3','E3','Koormuse ja taastumise otsused küsitluse põhjal', 2028, null,
   'Trimestri lõpu tööde kuhjumise piirid (seos TN 2.2), suursündmuste ajastus, põhimõte „üks uus kohustus ainult koos ühe loobumisega“. Kui esimene mõõtmine probleemi ei näita, jääb teema jälgimisele. Tähtaeg määrata. Vastutaja: direktor.',
   array['TN3.6','TN3.7']),
  ('S3','E3','Puuduvate sihtide kinnitamine õppenõukogus (TN 3.6, TN 3.7)', 2028, '2028-01-31',
   'Sihid, mis on märgitud „määratakse pärast esimest mõõtmist“, kinnitab õppenõukogu 2028. aasta jaanuariks.',
   array['TN3.6','TN3.7']);

-- Tegevused (topelt ei lisata)
insert into activities (goal_id, title, description, year, due_date, status)
select g.id, t.title, t.descr, t.year, t.due, 'planned'
from tk t
join directions d on d.code = t.dir
join goals g on g.direction_id = d.id and g.code = t.goal
where not exists (select 1 from activities a where a.goal_id = g.id and a.title = t.title);

-- Seosed tegevus → mõõdik (ainult sama arengusuuna mõõdikud)
insert into activity_indicators (activity_id, indicator_id)
select a.id, i.id
from tk t
join directions d on d.code = t.dir
join goals g on g.direction_id = d.id and g.code = t.goal
join activities a on a.goal_id = g.id and a.title = t.title
cross join lateral unnest(t.inds) as u(ind_code)
join indicators i on i.goal_id = g.id and i.code = u.ind_code
on conflict do nothing;

commit;
