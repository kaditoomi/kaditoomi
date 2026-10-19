import "server-only";
import postgres from "postgres";
import { env } from "./env";

// Üks ühendusbassein serveri (Verceli funktsiooni eksemplari) kohta.
//
// Supabase'i Transaction pooler (port 6543): iga tehing võib minna erinevale
// andmebaasiühendusele. Seetõttu:
//   - prepare: false — pooler ei toeta prepared statement'e;
//   - kogu kasutajapõhine olek (roll, JWT-väide) seatakse ainult tehingu sees
//     (set local / set_config(..., true)) ja kaob tehingu lõpus — vt asUser.
const globalForDb = globalThis as unknown as { __sql?: postgres.Sql };

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

/**
 * TLS: väljapoole minev ühendus on alati krüpteeritud.
 *  - DATABASE_CA_CERT (Supabase → Database → SSL Configuration → Download certificate)
 *    olemas → serveri sertifikaati ka kontrollitakse (soovitatav);
 *  - muidu "require" — krüpteeritud, kuid sertifikaati ei kontrollita;
 *  - sslmode URL-is → kasutatakse seda;
 *  - kohalik andmebaas (localhost) → ilma TLS-ita.
 */
function sslOption(url: string): { ssl?: postgres.Options<Record<string, never>>["ssl"] } {
  const parsed = new URL(url);
  // NB! Võti "ssl" tuleb sel juhul üldse ära jätta: postgres.js loeb ka väärtust
  // undefined valikuks "TLS välja" ja eiraks URL-i sslmode'i.
  if (parsed.searchParams.has("sslmode")) return {};
  if (env.databaseCaCert) return { ssl: { ca: env.databaseCaCert, rejectUnauthorized: true } };
  if (LOCAL_HOSTS.has(parsed.hostname)) return { ssl: false };
  return { ssl: "require" };
}

function createPool() {
  if (!env.databaseUrl) throw new Error("DATABASE_URL puudub (vt .env.example)");
  return postgres(env.databaseUrl, {
    max: 5,
    prepare: false,
    ...sslOption(env.databaseUrl),
    idle_timeout: 20, // serverivaba: vabasta jõudeolekus ühendused kiiresti
    max_lifetime: 60 * 30,
    connect_timeout: 10,
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

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Käivitab päringud sisselogitud kasutaja nimel: rollis "authenticated" ja
 * JWT-väitega sub = kasutaja id. Nii jõustavad andmebaasi RLS-poliitikad
 * õigused samamoodi nagu Supabase'i API kaudu.
 *
 * userId peab tulema serveris kontrollitud sessioonist (lib/auth.ts → Supabase Auth
 * getUser), mitte kliendi saadetud andmetest.
 * Roll ja väide on tehingu-lokaalsed: Transaction pooleris ei jää need järgmisele
 * tehingule ega teisele kasutajale külge.
 * KÕIK rakenduse päringud peavad käima läbi selle funktsiooni.
 */
export async function asUser<T>(userId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  if (!UUID.test(userId)) throw new Error("asUser: vigane kasutaja id");
  const claims = JSON.stringify({ sub: userId, role: "authenticated" });
  const result = await sql.begin(async (tx) => {
    await tx`select set_config('request.jwt.claims', ${claims}, true),
                    set_config('request.jwt.claim.sub', ${userId}, true)`;
    await tx`set local role authenticated`;
    return fn(tx);
  });
  return result as T;
}
