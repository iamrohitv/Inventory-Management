export function StatCard({ label, value, icon, gradient, loading }) {
  return (
    <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
          {loading ? (
            <div className="mt-2 h-8 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
          ) : (
            <p className="mt-2 text-3xl font-extrabold tracking-tight">{value}</p>
          )}
        </div>
        <span className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-white`}>
          {icon}
        </span>
      </div>
    </div>
  )
}
