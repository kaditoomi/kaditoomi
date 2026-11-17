"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { DEV_COOKIE } from "@/lib/auth";
import { YEAR_COOKIE } from "@/lib/data";
import { sql } from "@/lib/db";
import { env, supabaseConfigured } from "@/lib/env";
import { createSupabaseServer } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/action-utils";

export async function devLogin(formData: FormData) {
  if (!env.devLogin) throw new Error("Demosisselogimine pole lubatud");
  const id = String(formData.get("userId") ?? "");
  const [exists] = await sql`select 1 from profiles where id = ${id}`;
  if (!exists) redirect("/login");
  (await cookies()).set(DEV_COOKIE, id, { httpOnly: true, sameSite: "lax", path: "/" });
  redirect("/");
}

export async function sendMagicLink(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!supabaseConfigured()) return { error: "Supabase pole seadistatud (NEXT_PUBLIC_SUPABASE_URL / KEY puudub)." };
  const email = String(formData.get("email") ?? "").trim();
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "Sisesta korrektne e-posti aadress" };

  // Supabase'i aadress peab olema kujul https://<ref>.supabase.co (mitte dashboardi link ega andmebaasi host).
  let supabaseHost = "";
  try {
    const u = new URL(env.supabaseUrl);
    if (u.protocol !== "https:" && u.hostname !== "localhost") throw new Error("not https");
    supabaseHost = u.hostname;
  } catch {
    console.error("NEXT_PUBLIC_SUPABASE_URL on vigane — peab olema kujul https://<ref>.supabase.co");
    return {
      error:
        "Sisselogimine on valesti seadistatud: Supabase'i aadress (NEXT_PUBLIC_SUPABASE_URL) peab olema kujul https://<kood>.supabase.co.",
    };
  }
  if (supabaseHost === "supabase.com" || supabaseHost.endsWith(".pooler.supabase.com")) {
    console.error("NEXT_PUBLIC_SUPABASE_URL viitab dashboardile või andmebaasi poolerile, mitte projekti API-le");
    return {
      error:
        "Sisselogimine on valesti seadistatud: NEXT_PUBLIC_SUPABASE_URL peab olema projekti aadress https://<kood>.supabase.co (Supabase → Connect → Project URL).",
    };
  }

  try {
    const h = await headers();
    const origin = h.get("origin") ?? `https://${h.get("host")}`;
    const supabase = await createSupabaseServer();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${origin}/auth/callback`, shouldCreateUser: false },
    });
    if (error) {
      console.error("Sisselogimislingi saatmine ebaõnnestus:", error.status, error.code, error.message);
      if (!error.status || /fetch failed/i.test(error.message)) {
        return { error: "Supabase'iga ei saadud ühendust. Kontrolli, et Supabase'i projekt ei oleks peatatud, ja proovi uuesti." };
      }
      if (error.status === 429 || /rate limit/i.test(error.message)) {
        return { error: "Liiga palju katseid. Supabase saadab tasuta paketis vaid paar kirja tunnis — proovi hiljem uuesti." };
      }
      if (error.status === 401 || /api key/i.test(error.message)) {
        return { error: "Sisselogimine on valesti seadistatud: Supabase'i võti (NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ei sobi." };
      }
      return { error: "Sisselogimislinki ei saanud saata. Kas see aadress on kooli poolt kutsutud?" };
    }
  } catch (e) {
    console.error("Supabase Authiga ei saadud ühendust:", (e as Error).message);
    return { error: "Supabase'iga ei saadud ühendust. Kontrolli, et Supabase'i projekt ei oleks peatatud, ja proovi uuesti." };
  }
  return { ok: "Saatsime sisselogimislingi. Vaata oma postkasti (ka rämpsposti)." };
}

export async function logout() {
  const store = await cookies();
  store.delete(DEV_COOKIE);
  if (supabaseConfigured() && !env.devLogin) {
    const supabase = await createSupabaseServer();
    await supabase.auth.signOut();
  }
  redirect("/login");
}

export async function setReportYear(formData: FormData) {
  const year = Number(formData.get("year"));
  if (Number.isInteger(year)) {
    (await cookies()).set(YEAR_COOKIE, String(year), { sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
  }
  const back = String(formData.get("back") ?? "/");
  redirect(back.startsWith("/") && !back.startsWith("//") ? back : "/");
}
