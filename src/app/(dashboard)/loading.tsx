// Shown instantly while a dashboard route's data is fetching, so navigation
// feels immediate instead of frozen. Generic card skeleton that fits every page.
export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-6 w-48 rounded-lg bg-cm-border/60" />
          <div className="h-3 w-32 rounded bg-cm-border/40" />
        </div>
        <div className="h-9 w-28 rounded-xl bg-cm-border/60" />
      </div>

      {/* Metric row */}
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
            <div className="h-10 w-10 rounded-xl bg-cm-border/50" />
            <div className="h-7 w-16 rounded bg-cm-border/60" />
            <div className="h-3 w-20 rounded bg-cm-border/40" />
          </div>
        ))}
      </div>

      {/* Body block */}
      <div className="bg-white rounded-2xl shadow-sm p-5 space-y-3">
        <div className="h-4 w-40 rounded bg-cm-border/50" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 w-full rounded-xl bg-cm-bg" />
        ))}
      </div>
    </div>
  )
}
