// Kuvatakse kohe lehte vahetades, kuni server andmed laadib.
export default function Loading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <p className="text-sm text-ink-3">Laen…</p>
      <div className="grid gap-4 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="card h-64 animate-pulse bg-surface-2" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="card h-40 animate-pulse bg-surface-2" />
        ))}
      </div>
    </div>
  );
}
