import { redirect } from "next/navigation";
import { devLogin, logout } from "@/app/actions/session";
import { MagicLinkForm } from "@/components/login-form";
import { LogoMark } from "@/components/logo";
import { getCurrentUser, hasSessionWithoutAccess, listDevUsers } from "@/lib/auth";
import { env, supabaseConfigured } from "@/lib/env";
import { ROLE_LABEL } from "@/lib/format";

const CHAIN = ["Tegevused toimusid", "Praktika muutus", "Jõudis õppijani", "Õppija tulemus muutus"];

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden overflow-hidden bg-brand text-white lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-logo-blue opacity-25 blur-3xl"
        />
        <div className="relative flex items-center gap-3">
          <LogoMark size={56} />
          <span className="text-lg font-bold">Tartu Kesklinna Kool</span>
        </div>
        <div className="relative max-w-md">
          <h2 className="text-4xl font-bold leading-tight">Kas meie tegevused muudavad õppija kogemust?</h2>
          <p className="mt-4 text-white/75">
            Arengukava 2027–2030 seire: eesmärgid, mõõdikud, tegevused ja aasta mõjuanalüüs ühes kohas.
          </p>
          <ol className="mt-8 space-y-2">
            {CHAIN.map((step, i) => (
              <li key={step} className="flex items-center gap-3 text-sm">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-white/15 text-xs font-bold">{i + 1}</span>
                {step}
              </li>
            ))}
          </ol>
        </div>
        <p className="relative text-sm text-white/70">
          <span className="font-semibold text-logo-blue">Üheskoos!</span> Tartu südames õpime koos, märkame üksteist ja
          julgeme ideid ellu viia.
        </p>
      </section>
      <section className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex items-center gap-3 lg:hidden">
            <LogoMark size={48} />
            <span className="font-bold">Tartu Kesklinna Kool</span>
          </div>
          {children}
        </div>
      </section>
    </main>
  );
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ viga?: string }> }) {
  if (await getCurrentUser()) redirect("/");
  const { viga } = await searchParams;
  if (await hasSessionWithoutAccess()) {
    return (
      <Shell>
        <div className="card p-7">
          <h1 className="text-xl font-bold">Ligipääs puudub</h1>
          <p className="mt-2 text-sm text-ink-2">
            Oled sisse logitud, kuid sul pole selles keskkonnas aktiivset kasutajakontot. Ligipääsu annab koolijuht.
          </p>
          <form action={logout} className="mt-5">
            <button className="btn">Logi välja</button>
          </form>
        </div>
      </Shell>
    );
  }
  const devUsers = await listDevUsers();
  return (
    <Shell>
      <div className="card p-7">
        <h1 className="text-2xl font-bold">Tere tulemast!</h1>
        <p className="mt-1.5 text-sm text-ink-2">
          Logi sisse kooli e-postiga. Saadame sulle lingi, millega pääsed sisse ilma paroolita.
        </p>
        {viga && (
          <p className="mt-4 rounded-lg bg-s-red-bg px-3 py-2 text-sm text-s-red">Sisselogimine ebaõnnestus. Proovi uuesti.</p>
        )}
        {env.devLogin ? (
          <div className="mt-6">
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
          <div className="mt-6">
            <MagicLinkForm />
          </div>
        ) : (
          <p className="mt-4 text-sm text-s-red">
            Autentimine pole seadistatud: määra NEXT_PUBLIC_SUPABASE_URL ja NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (vt .env.example).
          </p>
        )}
      </div>
      <p className="mt-4 text-center text-xs text-ink-3">Ligipääsu annab koolijuht. Probleemi korral pöördu juhtkonna poole.</p>
    </Shell>
  );
}
