import { useCallback, useEffect, useState } from 'react'
import { alertsApi } from '../api'
import { Pagination } from '../components/Pagination'
import { EmptyState } from '../components/EmptyState'
import { PageLoader } from '../components/Spinner'
import { Icon } from '../components/Icon'
import { useToast } from '../context/ToastContext'
import { timeAgo } from '../utils/format'

const TYPE_STYLE = {
  out_of_stock: 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400',
  critical_stock: 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400',
  low_stock: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
  reorder_needed: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400',
}

const inputCls =
  'h-9 rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:border-slate-700 dark:bg-slate-800'

export function Alerts() {
  const toast = useToast()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [params, setParams] = useState({ page: 1, page_size: 20, unread_only: false, alert_type: '' })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setData(await alertsApi.list(params))
    } catch (e) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }, [params, toast])

  useEffect(() => { load() }, [load])

  const acknowledge = async (id) => {
    try {
      await alertsApi.acknowledge(id)
      toast.success('Alert dismissed')
      load()
    } catch (e) {
      toast.error(e.message)
    }
  }

  const unread = data?.items.filter((a) => !a.is_read).length || 0

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Alerts</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {data ? `${data.total} total${unread ? ` · ${unread} unread` : ''}` : 'Loading alerts…'}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-3 text-sm dark:border-slate-700">
          <input
            type="checkbox"
            checked={params.unread_only}
            onChange={(e) => setParams((p) => ({ ...p, unread_only: e.target.checked, page: 1 }))}
            className="h-4 w-4 accent-indigo-600"
          />
          Unread only
        </label>
        <select
          value={params.alert_type}
          onChange={(e) => setParams((p) => ({ ...p, alert_type: e.target.value, page: 1 }))}
          className={`${inputCls} cursor-pointer`}
        >
          <option value="">All types</option>
          <option value="out_of_stock">Out of Stock</option>
          <option value="critical_stock">Critical</option>
          <option value="low_stock">Low Stock</option>
          <option value="reorder_needed">Reorder Needed</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft dark:border-slate-800 dark:bg-slate-900">
        {loading && !data ? (
          <PageLoader label="Loading alerts…" />
        ) : data?.items.length === 0 ? (
          <EmptyState title="No alerts" message="Nothing matches your filters right now." />
        ) : (
          <>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.items.map((a) => (
                <div key={a.id} className={`flex items-start gap-3 px-6 py-4 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 ${a.is_read ? 'opacity-60' : ''}`}>
                  <span className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${TYPE_STYLE[a.alert_type] || TYPE_STYLE.low_stock}`}>
                    <Icon.alert className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {a.alert_type.replace('_', ' ')}
                      </span>
                      {a.is_read && (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                          Acknowledged
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm font-medium leading-snug">{a.message}</p>
                    <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                      <span className="font-mono">{a.product_sku}</span> · {timeAgo(a.created_at)}
                      {a.acknowledged_by && ` · by ${a.acknowledged_by}`}
                    </p>
                  </div>
                  {!a.is_read && (
                    <button
                      onClick={() => acknowledge(a.id)}
                      className="shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium text-indigo-600 transition-colors hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-500/10"
                    >
                      Dismiss
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="border-t border-slate-200 px-6 py-4 dark:border-slate-800">
              <Pagination
                page={data.page}
                pages={data.pages}
                total={data.total}
                pageSize={data.page_size}
                onPage={(page) => setParams((p) => ({ ...p, page }))}
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
