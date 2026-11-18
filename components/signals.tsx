import type { ActivityStatus } from "@/lib/types";
import type { Change, DataState } from "@/lib/status";
import { activityStatusLabel } from "@/lib/format";

/** Muutus eelmise mõõtmisega võrreldes; nool + sõna, mitte ainult värv. */
export function ChangeBadge({ change, title }: { change: Change | null; title?: string }) {
  if (!change) return <span className="text-xs text-ink-3" title={title}>võrdlus puudub</span>;
  const s = {
    improved: { icon: "↑", label: "paranes", cls: "bg-s-green-bg text-[#0b7a3a]" },
    unchanged: { icon: "→", label: "muutuseta", cls: "bg-surface-2 text-ink-2" },
    declined: { icon: "↓", label: "langes", cls: "bg-s-red-bg text-s-red" },
  }[change];
  return (
    <span title={title} className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${s.cls}`}>
      <span aria-hidden="true">{s.icon}</span>
      {s.label}
    </span>
  );
}

/** Andmete seis: ootab mõõtmist (planeeritud) või vajab tähelepanu (tähtaeg möödas). */
export function DataChip({ state, reason }: { state: DataState; reason: string }) {
  if (state === "ok") return null;
  return state === "waiting" ? (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-logo-blue/45 px-2 py-0.5 text-xs font-semibold text-brand" title={reason}>
      <span aria-hidden="true">◷</span> Ootab mõõtmist
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-s-yellow-bg px-2 py-0.5 text-xs font-semibold text-[#9a6400]" title={reason}>
      <span aria-hidden="true">!</span> Vajab tähelepanu
    </span>
  );
}

/** Tegevuse seis värvilise punkti ja sõnaga. */
export function ActivityStatusChip({
  kind,
  status,
  overdue,
}: {
  kind: "milestone" | "practice";
  status: ActivityStatus;
  overdue?: boolean;
}) {
  const color =
    status === "done" ? "bg-s-green" : status === "in_progress" ? "bg-s-yellow" : status === "postponed" ? "bg-ink-3" : "bg-line";
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm">
      <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${color} ${status === "planned" ? "ring-1 ring-ink-3" : ""}`} />
      {activityStatusLabel(kind, status)}
      {overdue && <span className="text-xs font-semibold text-s-red">· tähtaeg möödas</span>}
    </span>
  );
}
