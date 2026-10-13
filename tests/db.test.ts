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
        profiles: await tx`select id, full_name, email, role, is_active from profiles`,
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
    // vastutaja katse kinnitada: staatus jääb mustandiks (trigger guard_analysis + RLS)
    await asUser(S3_OWNER, (tx) =>
      tx`update impact_analyses set status = 'approved', approved_at = now(), snapshot = '{}' where year = 2027`,
    ).catch(() => undefined);
    const [still] = await sql`select status from impact_analyses where year = 2027`;
    expect(still.status).toBe("draft");
    const ok = await asUser(ADMIN, (tx) =>
      tx`update impact_analyses set status = 'approved', approved_at = now(), snapshot = '{}' where year = 2027`,
    );
    expect(ok.count).toBe(1);
    const locked = await asUser(S3_OWNER, (tx) => tx`update impact_analyses set keep_doing = 'x' where year = 2027`);
    expect(locked.count).toBe(0);
    await sql`update impact_analyses set status = 'draft', approved_at = null, snapshot = null where year = 2027`;
  });

  // ---------- turvatestid ----------
  const S2_GOAL = "30000000-0000-0000-0000-000000000021";
  const s1ActivityId = async () =>
    (await sql`select a.id from activities a join goals g on g.id = a.goal_id where g.code = 'S1.1' limit 1`)[0].id;
  const s2IndicatorId = async () => (await sql`select id from indicators where code = 'S2.1-T1'`)[0].id;

  it("vaade ja funktsioonid järgivad RLS-i: anon ja profiilita kasutaja ei näe midagi", async () => {
    await expect(sql.begin(async (tx) => {
      await tx`set local role anon`;
      return tx`select count(*) from v_indicator_latest`;
    })).rejects.toThrow(/permission denied/);
    const STRANGER = "99999999-9999-9999-9999-999999999999";
    await sql`insert into auth.users (id, email) values (${STRANGER}, 'võõras@example.org')`;
    try {
      const [p] = await sql`select count(*)::int as n from profiles where id = ${STRANGER}`;
      expect(p.n).toBe(0); // kutsumata kasutaja profiili ei saa
      const seen = await asUser(STRANGER, async (tx) => ({
        view: (await tx`select count(*)::int as n from v_indicator_latest`)[0].n,
        ind: (await tx`select count(*)::int as n from indicators`)[0].n,
        gaps: (await tx`select count(*)::int as n from data_gaps(2027)`)[0].n,
      }));
      expect(seen).toEqual({ view: 0, ind: 0, gaps: 0 });
    } finally {
      await sql`delete from auth.users where id = ${STRANGER}`;
    }
    const viewer = await asUser(VIEWER, (tx) => tx`select count(*)::int as n from v_indicator_latest`);
    expect(viewer[0].n).toBeGreaterThan(0);
  });

  it("kutsutud kasutaja saab profiili rolliga vaatleja", async () => {
    const INVITED = "88888888-8888-8888-8888-888888888888";
    await sql`insert into auth.users (id, email, invited_at) values (${INVITED}, 'uus.opetaja@example.org', now())`;
    try {
      const [p] = await sql`select role, full_name from profiles where id = ${INVITED}`;
      expect(p).toEqual({ role: "viewer", fullName: "uus.opetaja" });
    } finally {
      await sql`delete from auth.users where id = ${INVITED}`;
    }
  });

  it("TRUNCATE ja ajaloo muutmine on keelatud", async () => {
    await expect(asUser(ADMIN, (tx) => tx`truncate indicator_results`)).rejects.toThrow(/permission denied/);
    await expect(asUser(ADMIN, (tx) => tx`delete from audit_log`)).rejects.toThrow(/permission denied/);
    await expect(asUser(ADMIN, (tx) => tx`update audit_log set action = 'INSERT'`)).rejects.toThrow(/permission denied/);
  });

  it("vastutaja ei saa siduda oma tegevust teise suuna mõõdikuga", async () => {
    const act = await s1ActivityId();
    const ind = await s2IndicatorId();
    await expect(
      asUser(S1_OWNER, (tx) => tx`insert into activity_indicators (activity_id, indicator_id) values (${act}, ${ind})`),
    ).rejects.toThrow(/row-level security|samasse arengusuunda/);
    // ka admin ei saa siduda eri suundade andmeid
    await expect(
      asUser(ADMIN, (tx) => tx`insert into activity_indicators (activity_id, indicator_id) values (${act}, ${ind})`),
    ).rejects.toThrow(/samasse arengusuunda/);
  });

  it("vastutaja otsus ei saa viidata teise suuna mõõdikule ega eesmärgile", async () => {
    const ind = await s2IndicatorId();
    await expect(
      asUser(S1_OWNER, (tx) =>
        tx`insert into decisions (direction_id, indicator_id, kind, title)
           values ('20000000-0000-0000-0000-000000000001', ${ind}, 'change', 'x')`),
    ).rejects.toThrow(/sama arengusuuna/);
    await expect(
      asUser(S1_OWNER, (tx) =>
        tx`insert into decisions (direction_id, goal_id, kind, title)
           values ('20000000-0000-0000-0000-000000000001', ${S2_GOAL}, 'change', 'x')`),
    ).rejects.toThrow(/sama arengusuuna/);
  });

  it("vastutaja ei saa oma mõõdikut teise suunda tõsta", async () => {
    await expect(
      asUser(S1_OWNER, (tx) => tx`update indicators set goal_id = ${S2_GOAL} where code = 'S1.1-T1'`),
    ).rejects.toThrow(/row-level security/);
    const [row] = await sql`select g.code from indicators i join goals g on g.id = i.goal_id where i.code = 'S1.1-T1'`;
    expect(row.code).toBe("S1.1");
  });

  it("koostaja, lisaja ja kinnitaja paneb andmebaas, mitte klient", async () => {
    const [d] = await asUser(S1_OWNER, (tx) =>
      tx`insert into decisions (direction_id, kind, title, created_by)
         values ('20000000-0000-0000-0000-000000000001', 'other', 'test', ${ADMIN}) returning id, created_by`);
    expect(d.createdBy).toBe(S1_OWNER);
    await sql`delete from decisions where id = ${d.id}`;
    // vastutaja ei saa mustandile kinnitaja andmeid ega hetktõmmist panna
    const [a] = await asUser(S3_OWNER, (tx) =>
      tx`update impact_analyses set approved_by = ${ADMIN}, approved_at = now(), snapshot = '{"võlts":true}'
         where year = 2027 returning approved_by, snapshot, status`);
    expect(a).toEqual({ approvedBy: null, snapshot: null, status: "draft" });
  });

  it("evidence lubab ainult http(s) linke", async () => {
    const [r] = await sql`select r.id from indicator_results r join indicators i on i.id = r.indicator_id where i.code = 'S1.1-T1'`;
    await expect(
      asUser(S1_OWNER, (tx) => tx`insert into evidence (indicator_result_id, title, url) values (${r.id}, 'x', 'javascript:alert(1)')`),
    ).rejects.toThrow(/check constraint/);
  });

  it("viimast administraatorit ei saa eemaldada", async () => {
    await expect(asUser(ADMIN, (tx) => tx`update profiles set role = 'viewer' where id = ${ADMIN}`)).rejects.toThrow(
      /Vähemalt üks aktiivne administraator/,
    );
    // vastutaja ei saa endale rolli muuta
    const r = await asUser(S1_OWNER, (tx) => tx`update profiles set role = 'admin' where id = ${S1_OWNER}`);
    expect(r.count).toBe(0);
  });

  it("ajalugu salvestab algtaseme, sihi ja tulemuse muutused koos muutjaga", async () => {
    const before = (await sql`select coalesce(max(id), 0)::int as m from audit_log`)[0].m;
    await asUser(S1_OWNER, async (tx) => {
      await tx`update indicators set baseline_value = 65, target_value = 73 where code = 'S1.1-T1'`;
      await tx`update indicator_results r set value = 67 from indicators i
               where i.id = r.indicator_id and i.code = 'S1.1-T1' and r.year = 2027`;
    });
    const rows = await sql`select table_name, action, changed_by, changed_fields, old_data, new_data, direction_id
                           from audit_log where id > ${before} order by id`;
    expect(rows.map((r) => r.tableName)).toEqual(["indicators", "indicator_results"]);
    expect(rows[0].changedFields).toEqual(["baseline_value", "target_value"]);
    expect(rows[0].oldData.baselineValue).toBe(64);
    expect(rows[0].newData.targetValue).toBe(73);
    expect(rows[1].changedFields).toEqual(["value"]);
    expect(rows.every((r) => r.changedBy === S1_OWNER)).toBe(true);
    expect(rows[0].directionId).toBe("20000000-0000-0000-0000-000000000001");
    // vastutaja näeb oma suuna ajalugu, aga mitte teise suuna oma; vaatleja ei näe
    const s1 = await asUser(S1_OWNER, (tx) => tx`select count(*)::int as n from audit_log where id > ${before}`);
    const s2 = await asUser("00000000-0000-0000-0000-000000000003", (tx) => tx`select count(*)::int as n from audit_log where id > ${before}`);
    const v = await asUser(VIEWER, (tx) => tx`select count(*)::int as n from audit_log`);
    expect([s1[0].n, s2[0].n, v[0].n]).toEqual([2, 0, 0]);
    // taasta
    await sql`update indicators set baseline_value = 64, target_value = 72 where code = 'S1.1-T1'`;
    await sql`update indicator_results r set value = 66 from indicators i
              where i.id = r.indicator_id and i.code = 'S1.1-T1' and r.year = 2027`;
  });

  it("serveri roll app_server ei näe ilma kasutaja rollita midagi ega möödu RLS-ist", async () => {
    const [role] = await sql`select rolsuper, rolbypassrls, rolinherit, rolcreaterole from pg_roles where rolname = 'app_server'`;
    expect(role).toEqual({ rolsuper: false, rolbypassrls: false, rolinherit: false, rolcreaterole: false });
    await expect(sql.begin(async (tx) => {
      await tx`set local role app_server`;
      return tx`select count(*) from indicators`;
    })).rejects.toThrow(/permission denied/);
    const n = await sql.begin(async (tx) => {
      await tx`set local role app_server`;
      await tx`select set_config('request.jwt.claims', ${JSON.stringify({ sub: S1_OWNER })}, true)`;
      await tx`set local role authenticated`;
      return tx`update goals set title = title where code = 'S2.1'`;
    });
    expect(n.count).toBe(0);
  });

  it("kutse kahes sammus (Supabase Auth: kasutaja luuakse, siis märgitakse invited_at) loob profiili", async () => {
    const U2 = "77777777-7777-7777-7777-777777777777";
    await sql`insert into auth.users (id, email) values (${U2}, 'kutsutav@example.org')`;
    try {
      expect((await sql`select count(*)::int as n from profiles where id = ${U2}`)[0].n).toBe(0);
      await sql`update auth.users set invited_at = now() where id = ${U2}`;
      const [p] = await sql`select role, is_active from profiles where id = ${U2}`;
      expect(p).toEqual({ role: "viewer", isActive: true });
      // koolijuht määrab rolli
      await asUser(ADMIN, (tx) => tx`update profiles set role = 'admin' where id = ${U2}`);
      const ok = await asUser(U2, (tx) => tx`select count(*)::int as n from status_rules`);
      expect(ok[0].n).toBeGreaterThan(0);
      await sql`update profiles set role = 'viewer' where id = ${U2}`;
    } finally {
      await sql`delete from auth.users where id = ${U2}`;
    }
  });

  it("peatatud (mitteaktiivne) kasutaja ei näe ega muuda midagi", async () => {
    await asUser(ADMIN, (tx) => tx`update profiles set is_active = false where id = ${S1_OWNER}`);
    try {
      const seen = await asUser(S1_OWNER, async (tx) => ({
        ind: (await tx`select count(*)::int as n from indicators`)[0].n,
        own: (await tx`select count(*)::int as n from profiles`)[0].n,
        upd: (await tx`update goals set title = title where code = 'S1.1'`).count,
      }));
      expect(seen).toEqual({ ind: 0, own: 0, upd: 0 });
    } finally {
      await asUser(ADMIN, (tx) => tx`update profiles set is_active = true where id = ${S1_OWNER}`);
    }
    const back = await asUser(S1_OWNER, (tx) => tx`update goals set title = title where code = 'S1.1'`);
    expect(back.count).toBe(1);
  });

  it("viimast aktiivset administraatorit ei saa peatada", async () => {
    await expect(asUser(ADMIN, (tx) => tx`update profiles set is_active = false where id = ${ADMIN}`)).rejects.toThrow(
      /Vähemalt üks aktiivne administraator/,
    );
  });
});
