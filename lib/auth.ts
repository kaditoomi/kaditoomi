import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import { asUser, sql } from "./db";
import { env, supabaseConfigured } from "./env";
import { createSupabaseServer } from "./supabase/server";

export type Role = "admin" | "owner" | "viewer";

export interface CurrentUser {
  id: string;
  fullName: string;
  email: string | null;
  role: Role;
  /** Arengusuunad, mille andmeid kasutaja tohib muuta. */
  editableDirectionIds: string[];
}

export const DEV_COOKIE = "dev_user";

async function sessionUserId(): Promise<string | null> {
  // Sisselogimine on alati päringupõhine — leht ei tohi kunagi ehitusajal staatiliseks renderduda.
  await connection();
  if (env.devLogin) {
    const id = (await cookies()).get(DEV_COOKIE)?.value;
    if (id && /^[0-9a-f-]{36}$/i.test(id)) return id;
    return null;
  }
  if (!supabaseConfigured()) return null;
  const supabase = await createSupabaseServer();
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const id = await sessionUserId();
  if (!id) return null;
  return asUser(id, async (tx) => {
    const [profile] = await tx<{ fullName: string; email: string | null; role: Role }[]>`
      select full_name, email, role from profiles where id = ${id}`;
    if (!profile) return null;
    let editable: string[] = [];
    if (profile.role === "admin") {
      editable = (await tx<{ id: string }[]>`select id from directions`).map((r) => r.id);
    } else if (profile.role === "owner") {
      editable = (
        await tx<{ directionId: string }[]>`select direction_id from direction_owners where user_id = ${id}`
      ).map((r) => r.directionId);
    }
    return { id, ...profile, editableDirectionIds: editable };
  });
});

/** Sisselogitud, kuid profiil puudub või on peatatud (RLS ei näita profiili). */
export async function hasSessionWithoutAccess(): Promise<boolean> {
  return (await sessionUserId()) !== null && (await getCurrentUser()) === null;
}

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/");
  return user;
}

export const canEditDirection = (user: CurrentUser, directionId: string) =>
  user.editableDirectionIds.includes(directionId);

/** Demosisselogimise kasutajate loend (ainult DEV_LOGIN=1). Loeb RLS-ist mööda, sest kasutajat veel pole. */
export async function listDevUsers() {
  if (!env.devLogin) return [];
  try {
    return await sql<{ id: string; fullName: string; role: Role }[]>`
      select id, full_name, role from profiles where is_active order by role, full_name`;
  } catch {
    return []; // nt piiratud app_server ühendus: demoloendit ei saa ilma RLS-ita lugeda
  }
}
