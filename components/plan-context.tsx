import Link from "next/link";
import { DECISION_LABEL, fmtDate, yearLabel } from "@/lib/format";
import type { DirectionView } from "@/lib/model";

/** Tegevuskava koostamise abi: eelmise kinnitatud mõjuanalüüsi järeldused ja kehtivad otsused. */
export function PlanContext({ dir, year }: { dir: DirectionView; year: number }) {
  const prev = dir.analyses.filter((a) => a.status === "approved" && a.year < year).sort((a, b) => b.year - a.year)[0];
  const decisions = dir.decisions.filter((x) => x.effectiveYear === year);
  return (
    <aside className="card space-y-4 p-4 text-sm">
      <div>
        <p className="h-section mb-1">Eelmine kinnitatud mõjuanalüüs</p>
        {prev ? (
          <>
            <Link href={`/suunad/${dir.code}/analuus/${prev.year}`} className="link text-xs">
              {dir.code} · {yearLabel(prev.year)}
            </Link>
            <dl className="mt-2 space-y-2">
              <Item label="Jätkame">{prev.keepDoing}</Item>
              <Item label="Muudame">{prev.changeNext}</Item>
              <Item label="Loobume">{prev.stopDoing}</Item>
            </dl>
          </>
        ) : (
          <p className="text-xs text-ink-3">Kinnitatud mõjuanalüüsi enne aastat {yearLabel(year)} pole.</p>
        )}
      </div>
      <div>
        <p className="h-section mb-1">Otsused, mis kehtivad {yearLabel(year)}</p>
        {decisions.length === 0 ? (
          <p className="text-xs text-ink-3">—</p>
        ) : (
          <ul className="space-y-1.5">
            {decisions.map((x) => (
              <li key={x.id} className="text-xs">
                <span className="text-ink-3">{fmtDate(x.decidedOn)}</span>{" "}
                <span className="font-semibold uppercase text-accent-ink">{DECISION_LABEL[x.kind]}</span> {x.title}
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-ink-2">{label}</dt>
      <dd className="text-xs text-ink">{children || "—"}</dd>
    </div>
  );
}
