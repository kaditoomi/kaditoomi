import Link from "next/link";
import { fmtNum, yearLabel } from "@/lib/format";
import type { IndicatorView } from "@/lib/model";
import { ChangeBadge, DataChip } from "./signals";
import { Sparkline } from "./sparkline";
import { StatusBadge } from "./status";

/** Mõõdiku rida "Kuidas meil läheb?" plokis: algtase → viimane → siht, muutus ja trend. */
export function IndicatorRow({ i }: { i: IndicatorView }) {
  const points = i.results.filter((r) => r.year <= (i.last?.year ?? Infinity)).map((r) => ({ year: r.year, value: r.value }));
  if (points.length < 2 && i.baselineValue != null && i.baselineYear != null && !points.some((p) => p.year === i.baselineYear)) {
    points.unshift({ year: i.baselineYear, value: i.baselineValue });
  }
  const hasData = i.last != null;
  return (
    <li>
      <Link
        href={`/moodikud/${i.id}`}
        className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg px-2 py-3 hover:bg-surface-2/70 md:grid-cols-[minmax(0,1fr)_5rem_7rem_6.5rem_5rem_8.5rem_7.5rem] md:items-center"
      >
        <div className="col-span-2 min-w-0 md:col-span-1">
          <span className="font-medium text-ink">
            {i.isKey && <span title="Võtmenäitaja">★ </span>}
            {i.name}
          </span>
          <span className="mt-0.5 block text-xs text-ink-3">{i.source?.name ?? "allikas määramata"}</span>
        </div>
        <Cell label="Algtase">{fmtNum(i.baselineValue)}</Cell>
        <Cell label={i.last ? `Viimane (${yearLabel(i.last.year)})` : "Viimane"}>
          {hasData ? (
            <span className="font-semibold">
              {fmtNum(i.last!.value)} <span className="text-xs font-normal text-ink-3">{i.unit}</span>
            </span>
          ) : (
            "—"
          )}
        </Cell>
        <Cell label="Muutus">
          <ChangeBadge
            change={i.change}
            title={i.prev && i.last ? `${yearLabel(i.prev.year)} ${fmtNum(i.prev.value)} → ${yearLabel(i.last.year)} ${fmtNum(i.last.value)}` : undefined}
          />
        </Cell>
        <Cell label="Siht 2030">{fmtNum(i.targetValue)}</Cell>
        <Cell label="Seis">
          {i.data.state !== "ok" ? (
            <span className="flex flex-col items-start gap-0.5">
              <DataChip state={i.data.state} reason={i.data.reason} />
              <span className="text-[11px] leading-tight text-ink-3">{i.data.reason}</span>
            </span>
          ) : (
            <StatusBadge status={i.evaluation.status} title={i.evaluation.reason} />
          )}
        </Cell>
        <div className="hidden md:block">{points.length > 0 && <Sparkline points={points} target={i.targetValue} unit={i.unit} width={110} />}</div>
      </Link>
    </li>
  );
}

function Cell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="text-sm tabular-nums">
      <span className="block text-[11px] text-ink-3 md:hidden">{label}</span>
      {children}
    </div>
  );
}

export function IndicatorHeader() {
  return (
    <div className="hidden gap-x-4 border-b border-line px-2 pb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-3 md:grid md:grid-cols-[minmax(0,1fr)_5rem_7rem_6.5rem_5rem_8.5rem_7.5rem]">
      <span>Mõõdik</span>
      <span>Algtase</span>
      <span>Viimane</span>
      <span>Muutus</span>
      <span>Siht</span>
      <span>Seis</span>
      <span>Trend</span>
    </div>
  );
}
