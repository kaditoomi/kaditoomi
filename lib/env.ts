// Keskkonnamuutujad ühes kohas. Vt .env.example.
export const env = {
  databaseUrl: process.env.DATABASE_URL ?? "",
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseKey:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  /** Demosisselogimine kasutaja valikuga. Ainult arenduses — tootmises alati väljas. */
  devLogin: process.env.DEV_LOGIN === "1" && process.env.NODE_ENV !== "production",
  /** Valikuline "tänane kuupäev" demo jaoks (nt 2027-10-01), muidu päris kuupäev. */
  reportDate: process.env.ARUANDE_KUUPAEV ?? "",
};

export const supabaseConfigured = () => Boolean(env.supabaseUrl && env.supabaseKey);
