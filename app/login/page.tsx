import { redirect } from "next/navigation";
import { devLogin } from "@/app/actions/session";
import { MagicLinkForm } from "@/components/login-form";
import { getCurrentUser, listDevUsers } from "@/lib/auth";
import { env, supabaseConfigured } from "@/lib/env";
import { ROLE_LABEL } from "@/lib/format";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ viga?: string }> }) {
  if (await getCurrentUser()) redirect("/");
  const { viga } = await searchParams;
  const devUsers = await listDevUsers();
  return (
    <main className="mx-auto mt-16 max-w-md px-4">
      <div className="card p-6">
        <h1 className="text-lg font-semibold">Arengukava seire</h1>
        <p className="mt-1 text-sm text-ink-2">Logi sisse, et näha arengukava elluviimise ja mõju seisu.</p>
        {viga && <p className="mt-3 rounded-md bg-s-red-bg px-2.5 py-1.5 text-sm text-s-red">Sisselogimine ebaõnnestus. Proovi uuesti.</p>}
        {env.devLogin ? (
          <div className="mt-5">
            <p className="h-section mb-2">Demo: vali kasutaja</p>
            <ul className="space-y-2">
              {devUsers.map((u) => (
                <li key={u.id}>
                  <form action={devLogin}>
                    <input type="hidden" name="userId" value={u.id} />
                    <button className="btn w-full justify-between">
                      <span>{u.fullName}</span>
                      <span className="text-xs font-normal text-ink-3">{ROLE_LABEL[u.role]}</span>
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          </div>
        ) : supabaseConfigured() ? (
          <div className="mt-5">
            <MagicLinkForm />
          </div>
        ) : (
          <p className="mt-4 text-sm text-s-red">
            Autentimine pole seadistatud: määra NEXT_PUBLIC_SUPABASE_URL ja NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (vt .env.example).
          </p>
        )}
      </div>
    </main>
  );
}
