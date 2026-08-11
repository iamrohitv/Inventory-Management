const MAP = {
  in_stock: {
    label: 'In Stock',
    cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
    dot: 'bg-emerald-500',
  },
  low_stock: {
    label: 'Low Stock',
    cls: 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
    dot: 'bg-amber-500',
  },
  critical: {
    label: 'Critical',
    cls: 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400',
    dot: 'bg-red-500',
  },
  out_of_stock: {
    label: 'Out of Stock',
    cls: 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
    dot: 'bg-slate-400 dark:bg-slate-500',
  },
}

export function StatusBadge({ status }) {
  const s = MAP[status] || {
    label: status,
    cls: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    dot: 'bg-slate-400',
  }
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${s.cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  )
}
