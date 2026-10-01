# 7. Tehtud otsused

✅ **Kinnitatud** — kõik allolevad eeldused kinnitati ja MVP on ehitatud nende järgi. Tabel jääb alles otsuste ajaloona.

| # | Küsimus | Eeldus / soovitus |
|---|---|---|
| 1 | **Aasta mõiste.** Kas „2027“ tähendab kalendriaastat või õppeaastat 2026/27? | Õppeaasta, mis lõpeb sel aastal (2026/27 → 2027). HARNO, KiVa ja küsitlused toimuvad kevadel, mõjuanalüüs suvel. UI näitab „2026/27“. |
| 2 | **Algtaseme aasta.** | 2026 (2025/26 õppeaasta andmed). Mõõdikupõhiselt muudetav, sest osa algtasemeid mõõdetakse alles 2027. |
| 3 | **Planeeritud areng.** Lineaarne algtasemest sihini või aastapõhised vahesihid? | MVP-s lineaarne. Vahesihid (`indicator_milestones`) 2. etapis, kui vaja. |
| 4 | **Suuna üldstaatus.** Kas arvutada ainult tulemusnäitajatest? | Jah; protsessinäitajad on nähtavad eraldi mõjuahela tasanditel. Reegel: võtmenäitaja punane → punane. |
| 5 | **Säilimine.** Kas „säilimine“ tähendab alati „vähemalt sihttase“? | Jah (suurem on parem). Kui on vaja ka „mitte üle“ (nt kiusamine ≤ 5%), kasutada trendisuunda „langus“. |
| 6 | **Hall vs viimane väärtus.** Kui jooksva aasta andmed puuduvad, kas staatus on hall? | Jah, hall + kuvatakse viimane olemasolev väärtus ja aasta. |
| 7 | **Eesmärgi tasand.** Kas arengusuuna all on alaeesmärgid (nagu S1.1–S1.3)? | Jah — see on vajalik andmelünga jaoks. Kui arengukavas alaeesmärke pole, saab igal suunal olla üks eesmärk. |
| 8 | **Mitu vastutajat suunal?** | Lubatud, üks on peavastutaja. |
| 9 | **Mõjuanalüüsi kinnitab** ainult koolijuht? | Jah; pärast kinnitamist on analüüs lukus (admin saab vajadusel avada). |
| 10 | **Eksport** MVP-sse või 2. etappi? | 2. etappi (briefi MVP loend seda ei sisalda). Excel on kõige lihtsam ja võiks tulla esimesena. |
| 11 | **Tõendid** MVP-s ainult lingid või ka failid? | Lingid MVP-s (kool kasutab tõenäoliselt juba Google Drive'i/OneDrive'i), failid 2. etapis. |
| 12 | **Isikuandmed.** | Süsteemi sisestatakse ainult koondnäitajad (%, keskmised), mitte õpilaste isikuandmeid. Tõendifailides ei tohiks olla nimelisi andmeid. |
| 13 | **Majutus.** | Supabase (EL-i regioon, nt Frankfurt) + Vercel või kooli/linna server. |
| 14 | **Keel.** | Kasutajaliides eesti keeles; koodi ja andmebaasi identifikaatorid inglise keeles (sõnastik andmemudelis). |

## Ehitusjärjekord (tehtud)

1. Next.js + Supabase projekt, skeem, seed, sisselogimine, rollid
2. `lib/status.ts` + ühiktestid (staatus, üldstaatus, mõjuahela signaal, lüngad)
3. Arengusuunad, eesmärgid, mõõdikud (CRUD)
4. Tulemuste sisestamine koos päritolu ja tõendi lingiga
5. Tegevused
6. Juhtkonna vaade
7. Suuna detailvaade + ajajoon
8. Aasta mõjuanalüüs (mustand → kinnitus → ajalugu)
