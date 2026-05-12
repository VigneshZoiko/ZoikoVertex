export default function DashboardLoading() {
  return (
    <div className="max-w-6xl mx-auto animate-in fade-in duration-300">
      {/* Page header skeleton */}
      <div className="mb-8">
        <div className="h-9 w-56 bg-[var(--surface)] rounded-xl animate-pulse mb-3" />
        <div className="h-4 w-80 bg-[var(--surface)] rounded-lg animate-pulse opacity-60" />
      </div>

      {/* Metrics grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="w-9 h-9 bg-[var(--surface)] rounded-lg animate-pulse" />
              <div className="w-14 h-6 bg-[var(--surface)] rounded-full animate-pulse" />
            </div>
            <div className="h-3 w-24 bg-[var(--surface)] rounded animate-pulse mb-3" />
            <div className="h-8 w-20 bg-[var(--surface)] rounded-lg animate-pulse" />
          </div>
        ))}
      </div>

      {/* Chart area skeleton */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="h-5 w-52 bg-[var(--surface)] rounded-lg animate-pulse mb-2" />
            <div className="h-3 w-72 bg-[var(--surface)] rounded animate-pulse opacity-60" />
          </div>
          <div className="h-8 w-32 bg-[var(--surface)] rounded-lg animate-pulse" />
        </div>
        <div className="h-72 w-full flex items-end gap-2">
          {Array.from({ length: 14 }).map((_, i) => (
            <div key={i} className="flex-1 flex flex-col justify-end">
              <div
                className="w-full bg-[var(--surface)] rounded-t-sm animate-pulse"
                style={{ height: `${30 + (i % 5) * 12}%`, animationDelay: `${i * 50}ms` }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
