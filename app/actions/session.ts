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
  if (!supabaseConfigured()) return { error: "Supabase pole seadistatud" };
  const email = String(formData.get("email") ?? "").trim();
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "Sisesta korrektne e-posti aadress" };
  const h = await headers();
  const origin = h.get("origin") ?? `https://${h.get("host")}`;
  const supabase = await createSupabaseServer();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/auth/callback`, shouldCreateUser: false },
  });
  if (error) return { error: "Sisselogimislinki ei saanud saata. Kas see aadress on kooli poolt lisatud?" };
  return { ok: "Saatsime sisselogimislingi. Vaata oma postkasti." };
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
