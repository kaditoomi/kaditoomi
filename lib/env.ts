import "server-only";

// Keskkonnamuutujad ühes kohas. Vt .env.example.
// "server-only": see moodul (sh DATABASE_URL) ei saa kunagi sattuda brauseri koodi —
// kui klientkomponent seda impordiks, katkeb ehitus veaga.
export const env = {
  databaseUrl: process.env.DATABASE_URL ?? "",
  /** Supabase'i CA-sertifikaat (PEM). Olemasolul kontrollitakse andmebaasi serveri sertifikaati. */
  databaseCaCert: process.env.DATABASE_CA_CERT?.replace(/\\n/g, "\n") ?? "",
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseKey:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  /**
   * Demosisselogimine kasutaja valikuga (klient saadab kasutaja id küpsisena!).
   * Ainult kohalikus arenduses: tootmises ja koos päris Supabase'iga alati väljas.
   */
  devLogin:
    process.env.DEV_LOGIN === "1" &&
    process.env.NODE_ENV !== "production" &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL,
  /** Valikuline "tänane kuupäev" demo jaoks (nt 2027-10-01), muidu päris kuupäev. */
  reportDate: process.env.ARUANDE_KUUPAEV ?? "",
};

export const supabaseConfigured = () => Boolean(env.supabaseUrl && env.supabaseKey);
