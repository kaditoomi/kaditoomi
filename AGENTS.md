<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Projekti reeglid

- Kõik andmebaasipäringud käivad läbi `asUser()` (`lib/db.ts`), et RLS kehtiks. Otse `sql` ainult demosisselogimise kasutajaloendis.
- Staatust ei salvestata — see arvutatakse `lib/status.ts` reeglitest. Muudatused seal vajavad testi `lib/status.test.ts`.
- Server Actionid kasutavad `mutate()` + `parseForm()` (`lib/action-utils.ts`); veateated on eesti keeles.
- Vormid kasutavad `ActionForm` komponenti (ei tühjenda vormi vea korral).
- Kasutajaliides eesti keeles, identifikaatorid inglise keeles. Aasta 2027 = õppeaasta 2026/27 (`yearLabel`).
- Kontroll enne commit'i: `npm run typecheck && npm run lint && npm test` (+ `TEST_DATABASE_URL=… npm test` värske `npm run db:local` andmebaasi vastu).
- Uus tabel vajab migratsioonis: RLS + poliitikad (lugemine `is_member()`), `grant` rollile `authenticated` (mitte `anon`), vajadusel audit-trigger (`write_audit`). Security definer funktsioonid: `set search_path = ''` ja täielikult kvalifitseeritud nimed.
