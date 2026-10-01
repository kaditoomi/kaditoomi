# 3. Tabelite struktuur

Täielik, käivitatav skeem koos piirangute, vaadete ja õigustega: [`supabase/migrations/0001_skeem.sql`](../supabase/migrations/0001_skeem.sql). Allpool lühiülevaade.

### `profiles` — kasutajad
| veerg | tüüp | märkus |
|---|---|---|
| id | uuid PK → auth.users | |
| full_name, email | text | |
| role | `admin` / `owner` / `viewer` | administraator, vastutaja, vaatleja |

### `plans` — arengukava
`id`, `school_name`, `title`, `start_year` (2027), `end_year` (2030), `baseline_year` (2026)

### `directions` — arengusuund
| veerg | märkus |
|---|---|
| plan_id, position, code („S1“) | |
| title | eesmärgi nimetus |
| starting_point | lähtekoht |
| desired_change | soovitud muutus |
| learner_impact | mõju õppijale |

### `direction_owners` — vastutajad
`direction_id`, `user_id`, `is_lead` (peavastutaja). Määrab muutmisõiguse.

### `goals` — eesmärk
`direction_id`, `position`, `code` („S1.2“), `title`, `desired_change`, `learner_impact`

### `indicators` — mõõdik
| veerg | märkus |
|---|---|
| goal_id, code | |
| name | mõõdiku nimetus |
| kind | tulemusnäitaja / protsessinäitaja |
| impact_level | praktika / jõudis õppijani / õppija tulemus |
| source_id → data_sources | vaikimisi andmeallikas |
| unit | ühik |
| direction | kasv / langus / säilimine |
| baseline_value, baseline_year | algtase (NULL → andmelünk) |
| target_value, target_year | sihttase 2030 |
| status_rule_id → status_rules | NULL = vaikereegel |
| is_key | võtmenäitaja |
| owner_id | mõõdiku eest vastutaja |
| description | selgitav kommentaar |
| active | arhiveerimiseks (ajalugu säilib) |

### `indicator_results` — aasta vahetulemus
| veerg | märkus |
|---|---|
| indicator_id, year | unikaalne paar |
| value | |
| source_id | kui erineb mõõdiku vaikeallikast |
| measured_on | mõõtmise / andmete avaldamise kuupäev |
| sample_size | n |
| comment | |
| entered_by, entered_at, updated_by, updated_at | päritolu; täidab trigger |

### `data_sources` — andmeallikas
`name` (HARNO tasemetöö, HARNO rahulolu-uuring, KiVa, koolisisene test, küsitlus, tunnivaatlus, eKool/Stuudium), `kind`, `note`

### `status_rules` — staatusereegel
`green_min_pct` (75), `yellow_min_pct` (40), `red_on_negative` (true), `maintain_tolerance`, `is_default` (üks)

### `activities` — tegevus
| veerg | märkus |
|---|---|
| goal_id | |
| title, description | |
| owner_id | vastutaja |
| year | tegevuskava aasta |
| start_date, due_date | tähtaeg |
| status | planeeritud / töös / tehtud / edasi lükatud / loobutud |
| completed_on | kohustuslik, kui tehtud |
| outcome_note | mis tegelikult toimus |

### `activity_indicators`
`activity_id`, `indicator_id` — milliseid mõõdikuid tegevus peaks mõjutama.

### `evidence` — tõend
Seotud **täpselt ühega**: `indicator_result_id` / `activity_id` / `analysis_id`. `title`, `url` või `storage_path`, `added_by`, `added_at`.

### `impact_analyses` — aasta mõjuanalüüs
| veerg | küsimus |
|---|---|
| direction_id, year | unikaalne paar |
| planned | Mida kavandasime? |
| done | Mida tegime? |
| practice_change | Mis praktikas muutus? |
| learner_experience | Mida õppija koges teisiti? |
| results_change | Millised tulemused muutusid? |
| keep_doing | Mida jätkame? |
| change_next | Mida muudame? |
| stop_doing | Millest loobume? |
| status | mustand / kinnitatud |
| snapshot (jsonb) | kinnitamise hetke mõõdikud, staatused, tegevuste seis |
| approved_by, approved_at | |

### `decisions` — juhtimisotsus / tegevuskava muudatus
`direction_id`, valikuliselt `goal_id` / `indicator_id` / `activity_id` / `analysis_id`; `decided_on`, `kind` (jätkame / muudame / loobume / lisame / muu), `title`, `rationale`, `effective_year`, `owner_id`.

## Vaated ja funktsioonid

| Nimi | Otstarve |
|---|---|
| `v_indicator_latest` | mõõdik + viimane ja eelmine tulemus + päritolu (dashboard, „viimase aasta muutus“) |
| `data_gaps(aasta)` | andmelüngad |
| `overdue_activities(kuupäev)` | tähtaja ületanud tegevused |
| `is_admin()`, `can_edit_direction(id)` | RLS-abifunktsioonid |
