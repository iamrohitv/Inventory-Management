export function Pagination({ page, pages, total, pageSize, onPage }) {
  if (total === 0) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">No results</p>
  }
  const start = (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Showing <span className="font-medium text-slate-700 dark:text-slate-200">{start}–{end}</span> of{' '}
        <span className="font-medium text-slate-700 dark:text-slate-200">{total}</span>
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          className="h-9 rounded-lg border border-slate-300 px-3 text-sm font-medium transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-800"
        >
          ← Prev
        </button>
        <span className="px-3 text-sm text-slate-500 dark:text-slate-400">
          Page {page} of {pages}
        </span>
        <button
          onClick={() => onPage(page + 1)}
          disabled={page >= pages}
          className="h-9 rounded-lg border border-slate-300 px-3 text-sm font-medium transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-800"
        >
          Next →
        </button>
      </div>
    </div>
  )
}
