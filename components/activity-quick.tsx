import Link from "next/link";
import { updateActivityStatus } from "@/app/actions/plan";
import { activityStatusLabel, ACTIVITY_KIND_LABEL, fmtDate, responsibleLabel, yearLabel } from "@/lib/format";
import type { ActivityView } from "@/lib/model";
import type { ActivityStatus } from "@/lib/types";
import { ActionForm, SubmitButton } from "./forms";
import { ActivityStatusChip } from "./signals";

const STATUSES: ActivityStatus[] = ["planned", "in_progress", "done", "postponed", "cancelled"];

/** Tegevuse rida; klõps avab lihtsa seisu-vormi (seis + lühike kommentaar). */
export function ActivityQuickRow({ a, canEdit, showYear }: { a: ActivityView; canEdit: boolean; showYear?: boolean }) {
  const row = (
    <div className="grid grid-cols-1 gap-x-4 gap-y-1 py-3 sm:grid-cols-[minmax(0,1fr)_10rem_7rem_11rem] sm:items-center">
      <div className="min-w-0">
        <span className="font-medium">{a.title}</span>
        <span className="mt-0.5 block text-xs text-ink-3">
          {ACTIVITY_KIND_LABEL[a.kind ?? "milestone"]}
          {showYear && ` · ${yearLabel(a.year)}`}
        </span>
      </div>
      <span className="text-sm text-ink-2">{responsibleLabel(a.ownerName, a.description)}</span>
      <span className="text-sm text-ink-2">{a.dueDate ? fmtDate(a.dueDate) : yearLabel(a.year)}</span>
      <ActivityStatusChip kind={a.kind ?? "milestone"} status={a.status} overdue={a.overdue} />
    </div>
  );
  if (!canEdit) {
    return (
      <li>
        <Link href={`/tegevused/${a.id}`} className="block rounded-lg px-2 hover:bg-surface-2">
          {row}
        </Link>
      </li>
    );
  }
  return (
    <li>
      <details className="group rounded-lg px-2 open:bg-surface-2/70 hover:bg-surface-2/60">
        <summary className="list-none [&::-webkit-details-marker]:hidden">{row}</summary>
        <ActionForm action={updateActivityStatus} className="grid gap-3 pb-4 sm:grid-cols-[12rem_minmax(0,1fr)_auto] sm:items-end">
          <input type="hidden" name="id" value={a.id} />
          <label className="block">
            <span className="label">Seis</span>
            <select name="status" defaultValue={a.status} className="input">
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {activityStatusLabel(a.kind ?? "milestone", s)}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="label">Lühike kommentaar (valikuline)</span>
            <input name="outcomeNote" defaultValue={a.outcomeNote ?? ""} className="input" placeholder="nt 31 õpetajat 58-st on alustanud" />
          </label>
          <div className="flex items-center gap-3">
            <SubmitButton small>Salvesta</SubmitButton>
            <Link href={`/tegevused/${a.id}`} className="link text-xs">
              Kõik andmed
            </Link>
          </div>
        </ActionForm>
      </details>
    </li>
  );
}
