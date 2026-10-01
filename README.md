# Arengukava seire- ja juhtimisvahend

Tartu Kesklinna Kooli arengukava 2027–2030 elluviimise ja mõju jälgimise veebirakendus.

Tööriista keskne küsimus: **kas arengukava tegevused muudavad õppija kogemust ja tulemust?**

```
eesmärk → mõõdik → algtase → sihttase → tegevus → tõend → vahehinnang → mõju õppijale → juhtimisotsus
```

## Seis: arhitektuur ja andmemudel ootavad kinnitust

Rakenduse koodi pole veel kirjutatud. Enne seda on valmis:

| # | Dokument | Sisu |
|---|---|---|
| 1 | [Arhitektuur](docs/01-arhitektuur.md) | neli hindamistasandit, tehnoloogia, MVP ulatus, mis jääb hilisemaks |
| 2 | [Andmemudel](docs/02-andmemudel.md) | ER-diagramm, nõuete katvus, staatuse reegel, andmelünk, õigused |
| 3 | [Tabelite struktuur](docs/03-tabelid.md) | tabelid ja veerud · käivitatav SQL: [`supabase/migrations/0001_skeem.sql`](supabase/migrations/0001_skeem.sql) |
| 4 | [Kasutajavood](docs/04-kasutajavood.md) | koolijuht, vastutaja, vaatleja; aasta rütm |
| 5 | [Wireframe'id](docs/05-wireframe.md) | juhtkonna vaade, suuna ajajoon, mõõdiku kaart, mõjuanalüüs |
| 6 | [Näidisandmed](docs/06-naidisandmed.md) | 3 arengusuunda, 8 eesmärki, 16 mõõdikut · [`supabase/seed.sql`](supabase/seed.sql) |
| 7 | [**Kinnitamiseks**](docs/07-kinnitamiseks.md) | 14 eeldust, mis vajavad sinu kinnitust |

Tehnoloogia: Next.js 15 · Supabase (Postgres, Auth, Storage, RLS) · Recharts · Tailwind.
