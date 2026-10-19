// Transaction pooleri testid (Supabase'i port 6543 või PgBouncer pool_mode=transaction).
// Käivituvad ainult siis, kui TEST_POOLER_URL on määratud, nt
//   TEST_POOLER_URL="postgres://app_server:<parool>@localhost:6543/arengukava?sslmode=require" npm test
// Ühendus peab olema rolliga app_server ja andmebaas loodud skriptiga `npm run db:local`.
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const url = process.env.TEST_POOLER_URL;
const suite = url ? describe : describe.skip;

const ADMIN = "00000000-0000-0000-0000-000000000001";
const S1_OWNER = "00000000-0000-0000-0000-000000000002";
const VIEWER = "00000000-0000-0000-0000-000000000005";

suite("Transaction pooler + app_server", () => {
  let asUser: typeof import("@/lib/db").asUser;
  let sql: typeof import("@/lib/db").sql;

  beforeAll(async () => {
    process.env.DATABASE_URL = url;
    (globalThis as { __sql?: unknown }).__sql = undefined;
    ({ asUser, sql } = await import("@/lib/db"));
  });
  afterAll(async () => {
    await sql?.end();
  });

  it("ilma asUser'ita ei näe app_server ühtegi tabelit", async () => {
    await expect(sql`select count(*) from indicators`).rejects.toThrow(/permission denied/);
    const [r] = await sql`select current_user as u, coalesce(current_setting('request.jwt.claim.sub', true), '') as sub`;
    expect(r).toEqual({ u: "app_server", sub: "" });
  });

  it("paralleelsed päringud eri kasutajatena ei sega identiteete (jagatud ühendused)", async () => {
    const users = [ADMIN, S1_OWNER, VIEWER];
    const runs = Array.from({ length: 90 }, (_, i) => users[i % users.length]);
    const results = await Promise.all(
      runs.map((id) =>
        asUser(id, async (tx) => {
          const [a] = await tx`select auth.uid() as uid, current_user as role`;
          await tx`select pg_sleep(0.005)`;
          const [b] = await tx`select auth.uid() as uid`;
          const [w] = await tx`select count(*)::int as n from goals where code = 'S2.1'`;
          return { id, a, b, n: w.n };
        }),
      ),
    );
    for (const r of results) {
      expect(r.a.uid).toBe(r.id);
      expect(r.b.uid).toBe(r.id); // sama tehingu sees ei vahetu
      expect(r.a.role).toBe("authenticated");
      expect(r.n).toBe(1);
    }
  });

  it("pärast tehingut (ka vea korral) ei jää roll ega kasutaja ühendusele külge", async () => {
    await expect(
      asUser(ADMIN, async (tx) => {
        await tx`select 1`;
        throw new Error("katkestus");
      }),
    ).rejects.toThrow("katkestus");
    await expect(asUser(ADMIN, (tx) => tx`select 1/0`)).rejects.toThrow(/division by zero/);
    const rows = await Promise.all(
      Array.from({ length: 10 }, () =>
        sql`select current_user as u, coalesce(current_setting('request.jwt.claim.sub', true), '') as sub`,
      ),
    );
    for (const [r] of rows) expect(r).toEqual({ u: "app_server", sub: "" });
  });

  it("RLS kehtib pooleri kaudu: vaatleja ei muuda, vastutaja muudab ainult oma suunda", async () => {
    const v = await asUser(VIEWER, (tx) => tx`update goals set title = title`);
    const own = await asUser(S1_OWNER, (tx) => tx`update goals set title = title where code = 'S1.1'`);
    const other = await asUser(S1_OWNER, (tx) => tx`update goals set title = title where code = 'S2.1'`);
    expect([v.count, own.count, other.count]).toEqual([0, 1, 0]);
  });

  it("tehingusisene 'reset role' ei anna administraatori õigusi", async () => {
    await expect(
      asUser(VIEWER, async (tx) => {
        await tx`reset role`;
        return tx`select count(*) from indicators`;
      }),
    ).rejects.toThrow(/permission denied/);
  });

  it("vigane kasutaja id lükatakse tagasi enne andmebaasi", async () => {
    await expect(asUser("' or 1=1 --", (tx) => tx`select 1`)).rejects.toThrow(/vigane kasutaja id/);
  });
});
