# 4. Kasutajavood

## Aasta rütm

```
 aug–sept            okt–mai                    mai–juuni                 juuni–aug
┌──────────────┐   ┌───────────────────────┐   ┌─────────────────────┐   ┌──────────────────────────┐
│ Tegevuskava  │ → │ Tegevuste elluviimine │ → │ Tulemuste sisestus  │ → │ Mõjuanalüüs → kinnitus   │
│ (eelmise aasta│   │ staatuste uuendamine, │   │ HARNO, KiVa, küsitlus│   │ → juhtimisotsused         │
│  analüüs näha)│   │ protsessimõõdikud     │   │ vaatlused, testid    │   │ → järgmise aasta tegevused│
└──────────────┘   └───────────────────────┘   └─────────────────────┘   └──────────────────────────┘
```

## A. Administraator / koolijuht

**A1. Esmane seadistus** (üks kord)
1. Logib sisse → **Seaded**.
2. Lisab kasutajad ja määrab rollid.
3. Loob arengukava 2027–2030 ja kolm arengusuunda (nimetus, lähtekoht, soovitud muutus, mõju õppijale).
4. Määrab igale suunale vastutaja(d).
5. Kontrollib andmeallikate loendit ja vaikimisi staatusereeglit (75 / 40).

**A2. Kuu- või koosolekuülevaade** (põhikasutus, ~2 minutit)
1. Avab **juhtkonna vaate** → näeb kolme suuna värvi ja mõjuahelat.
2. Vaatab plokke „Vajab tähelepanu“, „Tähtaeg ületatud“, „Andmelüngad“.
3. Klikib punasel mõõdikul → mõõdiku kaart: trend, päritolu, kommentaar, tõend, seotud tegevused.
4. Lisab juhtimisotsuse (nt „muudame“) otse mõõdiku või suuna juures.

**A3. Aasta mõjuanalüüsi kinnitamine**
1. Saab märguande dashboardil: „S3 mõjuanalüüs 2027 ootab kinnitamist“.
2. Loeb analüüsi kõrvuti automaatse kokkuvõttega (tegevused tehtud x/y, mõõdikute muutus).
3. Kinnitab → süsteem salvestab hetktõmmise, analüüs lukustub ja ilmub ajalukku.
4. Analüüsi „Mida muudame / loobume“ põhjal lisab juhtimisotsused (`effective_year = 2028`).

## B. Arengusuuna vastutaja

**B1. Mõõdiku loomine**
1. Avab oma suuna → eesmärk → **Lisa mõõdik**.
2. Täidab: nimetus, tüüp (tulemus/protsess), tasand, andmeallikas, ühik, trendisuund, algtase + aasta, sihttase 2030, kommentaar.
3. Kui algtaset veel pole, jätab tühjaks → mõõdik ilmub andmelünkade hulka „vaja algtaseme mõõtmist“.

**B2. Aastatulemuse sisestamine**
1. Mõõdiku kaardil **Lisa tulemus** → aasta, väärtus, mõõtmise kuupäev, (n), kommentaar, tõendi link.
2. Salvestamisel kuvatakse kohe arvutatud staatus ja selgitus („saavutatud 25% planeeritust 25% → 100% → roheline“).
3. Sisestaja ja aeg salvestatakse automaatselt.

**B3. Tegevuste haldus**
1. Eesmärgi all **Lisa tegevus**: nimetus, vastutaja, aasta, tähtaeg, seotud mõõdik(ud).
2. Uuendab staatust; „tehtud“ nõuab kuupäeva ja soovitavalt lühikest kirjeldust, mis toimus + tõendit.

**B4. Aasta mõjuanalüüsi koostamine**
1. Suuna vaates **Mõjuanalüüs 2027** → vorm 8 küsimusega.
2. Vormi kõrval on automaatne abiinfo: kavandatud tegevused ja nende staatus, mõõdikute muutus algtasemest ja eelmisest aastast, eelmise aasta analüüsi „Mida muudame“.
3. Salvestab mustandina; **Saada kinnitamiseks** → koolijuht kinnitab.

**B5. Järgmise aasta tegevuskava**
1. Uue aasta tegevusi lisades on külgpaneelis nähtav eelmise aasta kinnitatud mõjuanalüüs ja sellest tulenevad otsused.

## C. Vaatleja (nt hoolekogu, pidaja)

1. Logib sisse → juhtkonna vaade ja suunavaated ainult lugemiseks.
2. (2. etapp) laadib alla juhtkonna kokkuvõtte või aastaaruande.

## Navigatsioon

```
Juhtkonna vaade ─┬─ Arengusuund S1/S2/S3 ─┬─ Eesmärk ─┬─ Mõõdiku kaart (tulemused, päritolu, tõendid)
                 │                        │           └─ Tegevus
                 │                        ├─ Ajajoon 2027–2030
                 │                        ├─ Mõjuanalüüs (aastad)
                 │                        └─ Otsused
                 ├─ Andmelüngad (filtreeritud loend)
                 └─ Seaded (admin)
```
