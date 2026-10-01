import "server-only";
import postgres from "postgres";
import { env } from "./env";

// Üks ühendusbassein serveri kohta. Supabase'i pooler (transaction mode) ei toeta
// prepared statement'e, seetõttu prepare: false.
const globalForDb = globalThis as unknown as { __sql?: postgres.Sql };

function createPool() {
  if (!env.databaseUrl) throw new Error("DATABASE_URL puudub (vt .env.example)");
  return postgres(env.databaseUrl, {
    max: 5,
    prepare: false,
    transform: postgres.camel,
    types: {
      // numeric → number (vaikimisi string)
      numeric: { to: 1700, from: [1700], serialize: (x: number) => String(x), parse: (x: string) => Number(x) },
      // date → "YYYY-MM-DD" string (vaikimisi Date, mis nihkub ajavöönditega)
      date: { to: 1082, from: [1082], serialize: (x: string) => x, parse: (x: string) => x },
    },
  });
}

export const sql: postgres.Sql = globalForDb.__sql ?? (globalForDb.__sql = createPool());

export type Tx = postgres.TransactionSql;

/**
 * Käivitab päringud sisselogitud kasutaja nimel: rollis "authenticated" ja
 * JWT-väitega sub = kasutaja id. Nii jõustavad andmebaasi RLS-poliitikad
 * õigused samamoodi nagu Supabase'i API kaudu.
 * KÕIK rakenduse päringud peavad käima läbi selle funktsiooni.
 */
export async function asUser<T>(userId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  const claims = JSON.stringify({ sub: userId, role: "authenticated" });
  const result = await sql.begin(async (tx) => {
    await tx`select set_config('request.jwt.claims', ${claims}, true),
                    set_config('request.jwt.claim.sub', ${userId}, true)`;
    await tx`set local role authenticated`;
    return fn(tx);
  });
  return result as T;
}
