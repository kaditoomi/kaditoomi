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
┌───────────────────────────────────────────────────────────────┐
│ Next.js 15 (App Router, TypeScript)                           │
│                                                               │
│  app/(vaated)  Server Components — loevad andmed Supabase'ist  │
│  app/actions   Server Actions — kirjutamine (vormid)           │
│  lib/status    staatuse ja andmelünga loogika (puhas TS, testid)│
│  components    UI (Tailwind + shadcn/ui), Recharts diagrammid  │
└──────────────┬────────────────────────────────────────────────┘
               │ @supabase/ssr (kasutaja sessioon → RLS kehtib)
┌──────────────▼────────────────────────────────────────────────┐
│ Supabase                                                       │
│  Postgres — tabelid, vaated, RLS-poliitikad (õigused)         │
│  Auth     — e-posti sisselogimine (magic link)                 │
│  Storage  — bucket "evidence" tõendifailidele (privaatne)      │
└───────────────────────────────────────────────────────────────┘
```

| Kiht | Valik | Miks |
|---|---|---|
| Frontend + backend | Next.js 15, TypeScript | üks projekt, üks juurutus (Vercel või kooli server) |
| Andmebaas | Supabase Postgres | relatsiooniline mudel sobib mõjuahelaga; RLS jõustab rolle andmebaasis, mitte ainult UI-s |
| Autentimine | Supabase Auth (magic link) | koolis pole paroolihaldust vaja |
| Diagrammid | Recharts | ajajoon ja trendijooned |
| Failid | Supabase Storage | tõendid (PDF, XLSX, pildid) |
| Eksport (2. etapp) | `exceljs` (Excel), `docx` (Word), brauseri print-CSS → PDF | ilma eraldi serverita |
| Testid | Vitest (staatuseloogika), Playwright (põhivood) | |

### Põhimõtted

- **Õigused andmebaasis.** Kõik kirjutamised käivad kasutaja sessiooniga, seega RLS-poliitikad (`supabase/migrations/0001_skeem.sql`) otsustavad, kes mida muudab. Vastutaja ei saa teise suuna andmeid muuta ka siis, kui UI-s on viga.
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

## Kaustastruktuur (kavandatud)

```
app/
  (auth)/login/
  page.tsx                    → juhtkonna vaade
  suunad/[code]/page.tsx      → arengusuuna detailvaade + ajajoon
  suunad/[code]/analyys/[year]/ → aasta mõjuanalüüs
  moodikud/[id]/page.tsx      → mõõdiku kaart (ajalugu, päritolu, tõendid)
  seaded/                     → kasutajad, allikad, staatusereeglid (admin)
  actions/                    → server actions
lib/
  status.ts  status.test.ts   → staatuse ja üldstaatuse arvutus
  gaps.ts                     → andmelüngad
  supabase/                   → kliendid (server/brauser)
components/
supabase/
  migrations/0001_skeem.sql
  seed.sql
```
