// DATABASE_URL vigade kontroll: server ei kuku mooduli laadimisel ja viga on arusaadav (parooli ei näidata).
import { beforeEach, describe, expect, it, vi } from "vitest";

async function freshSql(url: string | undefined) {
  vi.resetModules();
  if (url === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = url;
  (globalThis as { __sql?: unknown }).__sql = undefined;
  return (await import("@/lib/db")).sql;
}

describe("DATABASE_URL kontroll", () => {
  const saved = process.env.DATABASE_URL;
  beforeEach(() => {
    process.env.DATABASE_URL = saved;
  });

  it("moodul laadib ka ilma DATABASE_URL-ita; viga tuleb alles päringul", async () => {
    const sql = await freshSql(undefined);
    expect(() => sql`select 1`).toThrow(/DATABASE_URL puudub/);
  });

  it("asendamata [YOUR-PASSWORD]", async () => {
    const sql = await freshSql("postgresql://app_server.abc:[YOUR-PASSWORD]@x.pooler.supabase.com:6543/postgres");
    expect(() => sql`select 1`).toThrow(/parool on asendamata/);
  });

  it("kodeerimata erimärgid paroolis — parooli ei kuvata", async () => {
    const sql = await freshSql("postgresql://app_server.abc:Sal#a/1@x.pooler.supabase.com:6543/postgres");
    let msg = "";
    try {
      sql`select 1`;
    } catch (e) {
      msg = (e as Error).message;
    }
    expect(msg).toMatch(/DATABASE_URL on vigane/);
    expect(msg).not.toContain("Sal#a");
  });

  it("keeldub administraatorist postgres", async () => {
    const sql = await freshSql("postgresql://postgres.abc:Parool1@x.pooler.supabase.com:6543/postgres");
    expect(() => sql`select 1`).toThrow(/administraatorit postgres/);
  });
});
