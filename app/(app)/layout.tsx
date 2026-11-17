import Link from "next/link";
import { logout } from "@/app/actions/session";
import { LogoMark } from "@/components/logo";
import { NavLink } from "@/components/nav-link";
import { StatusIcon } from "@/components/status";
import { YearSelect } from "@/components/year-select";
import { requireUser } from "@/lib/auth";
import { loadPlanModel } from "@/lib/data";
import { env } from "@/lib/env";
import { ROLE_LABEL, fmtDate } from "@/lib/format";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const model = await loadPlanModel();
  return (
    <div className="min-h-screen">
      {(env.devLogin || env.reportDate) && (
        <div className="bg-s-yellow-bg px-4 py-1 text-center text-xs text-ink-2">
          Demorežiim{env.reportDate ? ` · simuleeritud kuupäev ${fmtDate(env.reportDate)}` : ""} · näidisandmed on
          illustratiivsed
        </div>
      )}
      <header className="border-b-[3px] border-logo-blue bg-brand text-white shadow-[0_2px_12px_rgb(19_38_61/0.25)]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link href="/" className="mr-2 flex items-center gap-2.5 leading-tight">
            <LogoMark size={42} />
            <span>
              <span className="block text-[15px] font-bold">{model?.plan.schoolName ?? "Arengukava"}</span>
              <span className="block text-xs text-white/70">{model?.plan.title ?? "seire"}</span>
            </span>
          </Link>
          <nav className="flex flex-wrap items-center gap-1 text-sm font-medium">
            <NavLink href="/">Ülevaade</NavLink>
            {model?.directions.map((d) => (
              <NavLink key={d.id} href={`/suunad/${d.code}`} title={d.title}>
                <StatusIcon status={d.status} size={12} />
                {d.code}
              </NavLink>
            ))}
            {user.role === "admin" && (
              <NavLink href="/seaded">Seaded</NavLink>
            )}
          </nav>
          <div className="ml-auto flex items-center gap-4">
            {model && <YearSelect years={model.years} value={model.reportYear} />}
            <div className="text-right text-xs leading-tight">
              <span className="block font-semibold text-white">{user.fullName}</span>
              <span className="block text-white/70">{ROLE_LABEL[user.role]}</span>
            </div>
            <form action={logout}>
              <button className="rounded-lg border border-white/30 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-white/12">
                Logi välja
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8">
        {model ? children : <p className="text-ink-2">Arengukava pole veel loodud. Käivita andmebaasi migratsioonid ja seed.</p>}
      </main>
    </div>
  );
}
