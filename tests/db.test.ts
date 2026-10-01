// Andmebaasi integratsioonitestid: RLS-õigused ja näidisandmete staatused.
// Käivituvad ainult siis, kui TEST_DATABASE_URL on määratud ja andmebaas on
// loodud skriptiga `npm run db:local` (testid taastavad muudetud andmed).
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const url = process.env.TEST_DATABASE_URL;
const suite = url ? describe : describe.skip;
if (url) process.env.DATABASE_URL = url;

const ADMIN = "00000000-0000-0000-0000-000000000001";
const S1_OWNER = "00000000-0000-0000-0000-000000000002";
const S3_OWNER = "00000000-0000-0000-0000-000000000004";
const VIEWER = "00000000-0000-0000-0000-000000000005";

suite("andmebaas", () => {
  let asUser: typeof import("@/lib/db").asUser;
  let sql: typeof import("@/lib/db").sql;
  let buildModel: typeof import("@/lib/model").buildModel;

  beforeAll(async () => {
    ({ asUser, sql } = await import("@/lib/db"));
    ({ buildModel } = await import("@/lib/model"));
  });
  afterAll(async () => {
    await sql?.end();
  });

  async function loadModel(userId: string, year: number) {
    return asUser(userId, async (tx) => {
      const [plan] = await tx`select * from plans limit 1`;
      const q = async (t: string) => tx.unsafe(`select * from ${t}`);
      const raw = {
        plan,
        directions: await tx`select * from directions order by position`,
        owners: await q("direction_owners"),
        goals: await tx`select * from goals order by position`,
        indicators: await tx`select * from indicators where active`,
        results: await q("indicator_results"),
        activities: await q("activities"),
        activityIndicators: await q("activity_indicators"),
        rules: await q("status_rules"),
        sources: await q("data_sources"),
        evidence: await q("evidence"),
        decisions: await q("decisions"),
        analyses: await q("impact_analyses"),
        profiles: await tx`select id, full_name, email, role from profiles`,
        gaps: await tx`select * from data_gaps(${year})`,
      };
      return buildModel(raw as unknown as Parameters<typeof buildModel>[0], year, "2027-10-01");
    });
  }

  it("näidisandmete staatused vastavad dokumentatsioonile", async () => {
    const m = await loadModel(VIEWER, 2027);
    expect(m.directions.map((d) => [d.code, d.status])).toEqual([
      ["S1", "yellow"],
      ["S2", "red"],
      ["S3", "yellow"],
    ]);
    expect(m.gaps.map((g) => g.gapType).sort()).toEqual(["no_baseline", "no_current_result", "no_outcome_indicator"]);
    expect(m.overdue).toHaveLength(3);
    expect(m.directions[1].chainBreakGoals.map((g) => g.code)).toEqual(["S2.1"]);
  });

  it("vastutaja muudab oma suunda, aga mitte teist", async () => {
    const own = await asUser(S1_OWNER, (tx) => tx`update goals set title = title where code = 'S1.1'`);
    const other = await asUser(S1_OWNER, (tx) => tx`update goals set title = title where code = 'S2.1'`);
    expect(own.count).toBe(1);
    expect(other.count).toBe(0);
    await expect(
      asUser(S1_OWNER, (tx) =>
        tx`insert into goals (direction_id, position, code, title) values ('20000000-0000-0000-0000-000000000002', 9, 'X', 'X')`,
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it("vaatleja ei saa midagi muuta", async () => {
    const r = await asUser(VIEWER, (tx) => tx`update indicators set name = name`);
    expect(r.count).toBe(0);
  });

  it("tulemuse päritolu (sisestaja) paneb andmebaas, mitte klient", async () => {
    const [row] = await asUser(S1_OWNER, (tx) =>
      tx`insert into indicator_results (indicator_id, year, value, entered_by)
         select id, 2029, 1, ${ADMIN} from indicators where code = 'S1.1-T1'
         returning entered_by`,
    );
    expect(row.enteredBy).toBe(S1_OWNER);
    await sql`delete from indicator_results where year = 2029`;
  });

  it("ainult admin kinnitab mõjuanalüüsi ja kinnitatut vastutaja ei muuda", async () => {
    await expect(
      asUser(S3_OWNER, (tx) =>
        tx`update impact_analyses set status = 'approved', approved_at = now(), snapshot = '{}' where year = 2027`,
      ),
    ).rejects.toThrow(/row-level security/);
    const ok = await asUser(ADMIN, (tx) =>
      tx`update impact_analyses set status = 'approved', approved_at = now(), snapshot = '{}' where year = 2027`,
    );
    expect(ok.count).toBe(1);
    const locked = await asUser(S3_OWNER, (tx) => tx`update impact_analyses set keep_doing = 'x' where year = 2027`);
    expect(locked.count).toBe(0);
    await sql`update impact_analyses set status = 'draft', approved_at = null, snapshot = null where year = 2027`;
  });
});
