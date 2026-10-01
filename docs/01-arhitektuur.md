# 1. Arhitektuur

## Mida tööriist lahendab

Koolijuht peab kiiresti nägema, **kas arengukava tegevused muudavad õppija kogemust ja tulemust**. Seepärast on süsteemi keskmes mõjuahel, mitte tegevuste nimekiri:

```
eesmärk → mõõdik → algtase → sihttase → tegevus → tõend → vahehinnang → mõju õppijale → juhtimisotsus
```

Iga arengusuuna seisu hinnatakse neljal tasandil:

| Tasand | Küsimus | Kust andmed tulevad |
|---|---|---|
| 1 | Kas kavandatud tegevused toimusid? | `activities.status` (tehtud / tähtaeg ületatud) |
| 2 | Kas kooli või õpetaja praktika muutus? | mõõdikud, mille `impact_level = practice` (nt tunnivaatlus) |
| 3 | Kas muutus jõudis õppijani? | `impact_level = learner_reach` (nt KiVa tunnid toimusid klassis, arenguvestlus lõppes kokkuleppega) |
| 4 | Kas õppija tulemus või kogemus muutus? | `impact_level = learner_result` (HARNO, KiVa, küsitlus, test) |

Kui tasandid 1–2 on rohelised, aga tasand 4 punane, näitab süsteem **mõjuahela katkestust**: „praktika muutus, kuid see ei jõua õppijani“. See on juhtkonnale kõige väärtuslikum signaal.

## Tehniline lahendus

```
┌────────────────────────────────────────────────────────────────────┐
│ Next.js 16 (App Router, TypeScript)                                 │
│                                                                     │
│  app/(app)/…     Server Components — vaated                         │
│  app/actions     Server Actions — kõik kirjutamised (zod-valideerimine) │
│  lib/status.ts   staatuse, üldstaatuse ja mõjuahela loogika (testid) │
│  lib/model.ts    toorandmed → mõjuahel + arvutatud staatused         │
│  components      UI (Tailwind 4), Recharts diagrammid                │
└──────────┬──────────────────────────────────┬──────────────────────┘
           │ lib/db.ts: postgres.js            │ @supabase/ssr
           │ iga päring tehingus:              │ (ainult sisselogimine)
           │  set role authenticated           │
           │  request.jwt.claims = {sub: kasutaja}
┌──────────▼──────────────────────────────────▼──────────────────────┐
│ Supabase                                                            │
│  Postgres — tabelid, vaated, RLS-poliitikad (õigused)              │
│  Auth     — e-posti sisselogimine (magic link)                      │
└────────────────────────────────────────────────────────────────────┘
```

| Kiht | Valik | Miks |
|---|---|---|
| Frontend + backend | Next.js 16, React 19, TypeScript | üks projekt, üks juurutus (Vercel või kooli server) |
| Andmebaas | Supabase Postgres | relatsiooniline mudel sobib mõjuahelaga; RLS jõustab rolle andmebaasis, mitte ainult UI-s |
| Andmepöördus | `postgres.js` otse Postgresi, kasutaja rollis | vt allpool |
| Autentimine | Supabase Auth (magic link) | koolis pole paroolihaldust vaja |
| Diagrammid | Recharts | trendijooned; väikesed trendid on SVG |
| Failid (2. etapp) | Supabase Storage | MVP-s on tõend link (nt Google Drive / OneDrive) |
| Eksport (2. etapp) | `exceljs` (Excel), `docx` (Word), print-CSS → PDF | ilma eraldi serverita |
| Testid | Vitest: staatuseloogika + andmebaasi/RLS integratsioon | |

### Miks otse Postgres, mitte supabase-js päringud?

Juhtkonna vaade vajab korraga kogu arengukava andmeid (suunad, eesmärgid, mõõdikud, tulemused, tegevused, otsused, analüüsid). Selle laadimine on otse SQL-iga lihtsam ja kiirem. **Õigused jäävad samaks:** `lib/db.ts` funktsioon `asUser()` käivitab iga päringu tehingus rollis `authenticated` ja JWT-väitega `sub = kasutaja id`. Täpselt nii teeb ka Supabase'i enda API (PostgREST). Seega kehtivad samad RLS-poliitikad ja `auth.uid()`.

Teine eelis: rakendust saab käivitada ja testida ka **ilma Supabase'ita** tavalise PostgreSQL-iga (`supabase/local/auth-stub.sql` jäljendab `auth` skeemi). Kohalikuks demoks on demosisselogimine (`DEV_LOGIN=1`), mis on tootmisrežiimis alati välja lülitatud.

### Põhimõtted

- **Õigused andmebaasis.** Kõik kirjutamised käivad kasutaja nimel, seega RLS-poliitikad (`supabase/migrations/0001_skeem.sql`) otsustavad, kes mida muudab. Vastutaja ei saa teise suuna andmeid muuta ka siis, kui UI-s on viga. Seda kontrollivad testid `tests/db.test.ts`.
- **Staatust ei salvestata, see arvutatakse.** Staatus tuleb alati reeglist + andmetest (`lib/status.ts`). Nii ei saa keegi värvi käsitsi „roheliseks keerata“ ja reegli muutmine kajastub kohe kõikjal.
- **Ajalugu on muutumatu.** Kinnitatud aasta mõjuanalüüs salvestab hetktõmmise (`snapshot`) mõõdikute väärtustest ja staatustest; hilisemad parandused ei muuda möödunud aasta hinnangut tagantjärele.
- **Päritolu alati nähtav.** Iga tulemus kannab allikat, mõõtmise kuupäeva, sisestajat ja sisestamise aega (sisestaja ja aja paneb andmebaasi trigger, mitte klient).

## MVP ulatus (1. etapp)

1. Arengusuundade ja eesmärkide loomine
2. Mõõdikute lisamine (tüüp, tasand, allikas, ühik, trendisuund)
3. Alg- ja sihttasemete seadmine
4. Aastatulemuste sisestamine koos päritolu ja tõendi lingiga
5. Tegevuste lisamine, seostamine mõõdikutega, staatus ja tähtaeg
6. Automaatne staatus (kasutaja määratav reegel)
7. Juhtkonna vaade (üks leht) + andmelüngad
8. Aasta mõjuanalüüs (8 küsimust, mustand → kinnitamine → ajalugu)

Lisaks MVP-s: arengusuuna detailvaade koos ajajoonega 2027–2030 ja juhtimisotsuste logi (need on dashboardi ja mõjuanalüüsi sisend, ilma nendeta pole ahel terviklik).

## Teadlikult hiljem (2. etapp)

- Eksport: aastaaruanne (Word/PDF), mõõdikute tabel (Excel), juhtkonna ühe lehe raport (PDF). Andmemudel on selleks valmis.
- Failide üleslaadimine (MVP-s tõend = link; skeemis on `storage_path` juba olemas).
- Muudatuste täielik auditilogi (MVP-s: sisestaja/muutja ja ajatemplid).
- Vahesihid aastate kaupa (MVP-s eeldatakse lineaarset liikumist algtasemest sihini, vt [staatuse reegel](02-andmemudel.md#staatuse-arvutamine)).
- Klassi/kooliastme kaupa jaotatud tulemused, mitme kooli tugi, teavitused.

## Kaustastruktuur

```
app/
  login/                         sisselogimine (magic link / demo)
  auth/callback/                 magic linki tagasisuunamine
  (app)/page.tsx                 juhtkonna vaade
  (app)/suunad/[code]/           arengusuuna detailvaade + ajajoon
  (app)/suunad/[code]/analuus/[aasta]/  aasta mõjuanalüüs
  (app)/moodikud/[id]/, uus/     mõõdiku kaart (tulemused, päritolu, tõendid), uus mõõdik
  (app)/tegevused/[id]/, uus/    tegevus
  (app)/seaded/                  kasutajad, vastutajad, allikad, reeglid (admin)
  actions/                       server actions
lib/
  status.ts (+ test)             staatus, üldstaatus, mõjuahela katkestus
  model.ts                       mõjuahela mudel, hetktõmmis
  series.ts (+ test)             diagrammi andmed (tegelik vs plaan)
  data.ts                        andmete laadimine, aruandeaasta
  db.ts                          ühendus + asUser() (RLS)
  auth.ts                        sessioon, rollid
components/                      UI komponendid
supabase/
  migrations/                    skeem, RLS, triggerid
  seed.sql                       näidisandmed
  local/auth-stub.sql            ainult kohalikuks arenduseks
tests/db.test.ts                 RLS ja näidisandmete integratsioonitestid
```
