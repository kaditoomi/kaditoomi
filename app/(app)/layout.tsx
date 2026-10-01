import Link from "next/link";
import { logout } from "@/app/actions/session";
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
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2.5">
          <Link href="/" className="mr-2 leading-tight">
            <span className="block text-sm font-semibold">{model?.plan.schoolName ?? "Arengukava"}</span>
            <span className="block text-xs text-ink-3">{model?.plan.title ?? "seire"}</span>
          </Link>
          <nav className="flex flex-wrap items-center gap-1 text-sm">
            <Link href="/" className="rounded-md px-2 py-1 hover:bg-surface-2">
              Ülevaade
            </Link>
            {model?.directions.map((d) => (
              <Link
                key={d.id}
                href={`/suunad/${d.code}`}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 hover:bg-surface-2"
                title={d.title}
              >
                <StatusIcon status={d.status} size={12} />
                {d.code}
              </Link>
            ))}
            {user.role === "admin" && (
              <Link href="/seaded" className="rounded-md px-2 py-1 hover:bg-surface-2">
                Seaded
              </Link>
            )}
          </nav>
          <div className="ml-auto flex items-center gap-4">
            {model && <YearSelect years={model.years} value={model.reportYear} />}
            <div className="text-right text-xs leading-tight">
              <span className="block font-medium text-ink">{user.fullName}</span>
              <span className="block text-ink-3">{ROLE_LABEL[user.role]}</span>
            </div>
            <form action={logout}>
              <button className="btn btn-sm">Logi välja</button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">
        {model ? children : <p className="text-ink-2">Arengukava pole veel loodud. Käivita andmebaasi migratsioonid ja seed.</p>}
      </main>
    </div>
  );
}
