# Arengukava seire- ja juhtimisvahend

Tartu Kesklinna Kooli arengukava 2027–2030 elluviimise ja mõju jälgimise veebirakendus.

Tööriista keskne küsimus: **kas arengukava tegevused muudavad õppija kogemust ja tulemust?**

```
eesmärk → mõõdik → algtase → sihttase → tegevus → tõend → vahehinnang → mõju õppijale → juhtimisotsus
```

## Mis töötab (MVP)

1. **Arengusuunad ja eesmärgid:** lähtekoht, soovitud muutus, mõju õppijale, vastutajad.
2. **Mõõdikud:** tulemus- ja protsessinäitajad, mõjutasand, andmeallikas, ühik, trendisuund, kommentaar.
3. **Alg- ja sihttasemed.** Kui algtase on tühi, ilmub mõõdik andmelünkade hulka.
4. **Aastatulemused koos päritoluga:** allikas, mõõtmise kuupäev, n, sisestaja ja aeg, tõendi link.
5. **Tegevused:** tähtajad ja seis; iga tegevus on seotud mõõdikutega, mida see peaks mõjutama.
6. **Automaatne staatus** kasutaja määratava reegli järgi (vaikimisi 75 / 40). Toetab kasvu, langust ja säilimist.
7. **Juhtkonna vaade ühel lehel.** Kolm suunda ja nende üldstaatus, mõjuahela 4 tasandit, mõjuahela katkestuse signaal, võtmenäitajad koos muutusega, mõõdikud, mis vajavad tähelepanu, tähtaja ületanud tegevused, andmelüngad ja viimased juhtimisotsused.
8. **Aasta mõjuanalüüs** 8 küsimusega:
   - vastutaja koostab mustandi, koolijuht kinnitab ja analüüs lukustub;
   - kinnitamisel salvestatakse näitajate hetkeseis ajalukku;
   - järeldused on näha järgmise aasta tegevuste koostamisel.

Lisaks:

- arengusuuna ajajoon 2027–2030 (tegevused, protsessi- ja tulemusnäitajad, vahehinnangud, muudatused tegevuskavas);
- trendidiagrammid (tegelik vs planeeritud);
- juhtimisotsuste logi;
- rollid: administraator / koolijuht, arengusuuna vastutaja, vaatleja. Õigused jõustab andmebaas (RLS).

Teadlikult 2. etapis: eksport (Word/PDF/Excel), failide üleslaadimine, auditilogi, vahesihid. Vt [docs/01-arhitektuur.md](docs/01-arhitektuur.md).

## Käivitamine kohalikult (demo, ilma Supabase'ita)

Vaja: Node 20+ ja PostgreSQL 15+.

```bash
npm install
cp .env.example .env.local          # DATABASE_URL, DEV_LOGIN=1, ARUANDE_KUUPAEV=2027-10-01
DATABASE_URL=postgres://postgres:postgres@localhost:5432/arengukava npm run db:local
npm run dev                          # http://localhost:3000
```

Sisselogimislehel vali demokasutaja: koolijuht, ükskõik milline kolmest suuna vastutajast või vaatleja. Näidisandmed kirjeldavad olukorda 2027. aasta sügisel ja **arvud on illustratiivsed**.

## Juurutamine (Supabase + Vercel)

1. Loo Supabase'i projekt (EL-i regioon).
2. Käivita SQL Editoris järjest `supabase/migrations/0001_skeem.sql` ja `0002_kasutajad.sql`. Näidisandmeid (`seed.sql`) päris kasutuses ei käivitata.
3. Lisa arengukava ja koolijuht:
   - Authentication → Users → *Invite user* (koolijuhi e-post).
   - SQL-is: `insert into plans (school_name, title, start_year, end_year, baseline_year) values ('Tartu Kesklinna Kool', 'Arengukava 2027–2030', 2027, 2030, 2026);`
   - Seejärel: `update profiles set role = 'admin', full_name = '…' where email = '…';`
   - Lisa vähemalt üks staatusereegel (vaikereegel): `insert into status_rules (name, is_default) values ('Vaikereegel 75/40', true);`
4. Seadista Authentication → URL Configuration → Redirect URLs: `https://<sinu-domeen>/auth/callback`.
5. Seadista Vercelis keskkonnamuutujad:
   - `DATABASE_URL`: Supabase → Connect → *Transaction pooler* või *Session pooler*;
   - `NEXT_PUBLIC_SUPABASE_URL`;
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

   `DEV_LOGIN` ja `ARUANDE_KUUPAEV` jäta seadistamata.
6. Koolijuht logib sisse ja lisab **Seadetes** arengusuunad, vastutajad, andmeallikad ja reeglid. Uued kasutajad kutsutakse Supabase'is; esimesel sisselogimisel saavad nad rolli „vaatleja“.

## Arendus

```bash
npm run typecheck && npm run lint && npm test
# andmebaasi- ja õigustestid (värskelt loodud kohaliku andmebaasi vastu):
TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5432/arengukava npm test
```

## Dokumentatsioon

| # | Dokument | Sisu |
|---|---|---|
| 1 | [Arhitektuur](docs/01-arhitektuur.md) | neli hindamistasandit, tehnoloogia, andmepöördus, MVP ulatus |
| 2 | [Andmemudel](docs/02-andmemudel.md) | ER-diagramm, nõuete katvus, staatuse reegel, andmelünk, õigused |
| 3 | [Tabelite struktuur](docs/03-tabelid.md) | tabelid ja veerud |
| 4 | [Kasutajavood](docs/04-kasutajavood.md) | koolijuht, vastutaja, vaatleja; aasta rütm |
| 5 | [Wireframe'id](docs/05-wireframe.md) | esialgsed vaadete kavandid |
| 6 | [Näidisandmed](docs/06-naidisandmed.md) | 3 arengusuunda, 8 eesmärki, 16 mõõdikut |
| 7 | [Tehtud otsused](docs/07-kinnitamiseks.md) | kinnitatud eeldused |
