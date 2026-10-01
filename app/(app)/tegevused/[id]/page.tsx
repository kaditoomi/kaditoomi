import Link from "next/link";
import { notFound } from "next/navigation";
import { addEvidence, deleteActivity, deleteEvidence } from "@/app/actions/plan";
import { ActivityForm } from "@/components/activity-form";
import { ActionForm, SubmitButton } from "@/components/forms";
import { PlanContext } from "@/components/plan-context";
import { canEditDirection, requireUser } from "@/lib/auth";
import { loadPlanModel } from "@/lib/data";
import { ACTIVITY_LABEL, fmtDate, yearLabel } from "@/lib/format";

export default async function ActivityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const model = await loadPlanModel();
  const a = model?.activities.find((x) => x.id === id);
  if (!model || !a) notFound();
  const dir = model.directions.find((d) => d.id === a.directionId)!;
  const canEdit = canEditDirection(user, dir.id);
  const evidence = model.evidence.filter((e) => e.activityId === a.id);
  const owner = model.profiles.find((p) => p.id === a.ownerId)?.fullName ?? "—";
  const linked = model.indicators.filter((i) => a.indicatorIds.includes(i.id));

  return (
    <div className="space-y-4">
      <Link href={`/suunad/${dir.code}#tegevused`} className="text-sm text-ink-3 hover:underline">
        ← {dir.code} · {a.goal.code} {a.goal.title}
      </Link>
      <header className="card p-4">
        <p className="text-xs text-ink-3">
          Tegevus · {yearLabel(a.year)} · vastutaja {owner}
        </p>
        <h1 className="mt-1 text-xl font-semibold">{a.title}</h1>
        <p className="mt-1 text-sm">
          <span className={a.overdue ? "font-semibold text-s-red" : ""}>
            {a.overdue ? `⚠ Tähtaeg ületatud (${fmtDate(a.dueDate)})` : ACTIVITY_LABEL[a.status]}
          </span>
          {a.status === "done" && ` · toimus ${fmtDate(a.completedOn)}`}
          {a.dueDate && !a.overdue && ` · tähtaeg ${fmtDate(a.dueDate)}`}
        </p>
        {a.outcomeNote && <p className="mt-1 text-sm text-ink-2">Mis toimus: {a.outcomeNote}</p>}
        {linked.length > 0 && (
          <p className="mt-2 text-xs text-ink-3">
            Peaks mõjutama:{" "}
            {linked.map((i, n) => (
              <span key={i.id}>
                {n > 0 && ", "}
                <Link href={`/moodikud/${i.id}`} className="link">
                  {i.code} {i.name}
                </Link>
              </span>
            ))}
          </p>
        )}
      </header>

      <section className="card p-4">
        <h2 className="mb-2 text-sm font-semibold">Tõendid</h2>
        {evidence.length === 0 && <p className="text-sm text-ink-3">Tõendeid pole lisatud.</p>}
        <ul className="space-y-1 text-sm">
          {evidence.map((e) => (
            <li key={e.id} className="flex items-center gap-2">
              <a href={e.url ?? "#"} target="_blank" rel="noreferrer noopener" className="link">
                🔗 {e.title}
              </a>
              <span className="text-xs text-ink-3">{fmtDate(e.addedAt)}</span>
              {canEdit && (
                <ActionForm action={deleteEvidence} confirm="Eemaldada tõend?">
                  <input type="hidden" name="id" value={e.id} />
                  <button className="text-xs text-ink-3 hover:text-s-red">Eemalda</button>
                </ActionForm>
              )}
            </li>
          ))}
        </ul>
        {canEdit && (
          <ActionForm action={addEvidence} className="mt-3 flex flex-wrap items-end gap-2" resetOnSuccess>
            <input type="hidden" name="activityId" value={a.id} />
            <input name="title" placeholder="Pealkiri (nt koolituse osalejate nimekiri)" className="input max-w-xs" required />
            <input name="url" type="url" placeholder="https://…" className="input max-w-sm" required />
            <SubmitButton small>Lisa tõend</SubmitButton>
          </ActionForm>
        )}
      </section>

      {canEdit && (
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <section className="card p-4">
            <h2 className="mb-3 text-sm font-semibold">Muuda tegevust</h2>
            <ActivityForm model={model} dir={dir} goalId={a.goalId} activity={a} linked={a.indicatorIds} />
            <ActionForm action={deleteActivity} confirm="Kustutada tegevus?" className="mt-6 border-t border-line pt-4">
              <input type="hidden" name="id" value={a.id} />
              <SubmitButton variant="danger">Kustuta tegevus</SubmitButton>
            </ActionForm>
          </section>
          <PlanContext dir={dir} year={a.year} />
        </div>
      )}
    </div>
  );
}
