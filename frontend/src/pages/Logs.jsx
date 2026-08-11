import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { inventoryApi } from '../api'
import { Pagination } from '../components/Pagination'
import { EmptyState } from '../components/EmptyState'
import { PageLoader } from '../components/Spinner'
import { useToast } from '../context/ToastContext'
import { formatDateTime } from '../utils/format'

const inputCls =
  'h-9 rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:border-slate-700 dark:bg-slate-800'

const TYPE_STYLE = {
  in: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
  out: 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400',
  adjustment: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  reserve: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400',
  release: 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
}

export function Logs() {
  const toast = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const productId = searchParams.get('product') || ''
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [params, setParams] = useState({
    page: 1,
    page_size: 25,
    product_id: productId,
    change_type: '',
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setData(await inventoryApi.logs(params))
    } catch (e) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }, [params, toast])

  useEffect(() => { load() }, [load])

  const changeType = (e) => {
    setParams((p) => ({ ...p, change_type: e.target.value, page: 1 }))
  }

  const clearProduct = () => {
    setParams((p) => ({ ...p, product_id: '', page: 1 }))
    setSearchParams({})
  }

  const showProductFilter = useMemo(() => params.product_id, [params.product_id])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Inventory Logs</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Complete audit trail of all stock changes</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {showProductFilter && (
          <button
            onClick={clearProduct}
            className="flex h-9 items-center gap-2 rounded-lg bg-indigo-50 px-3 text-sm font-medium text-indigo-700 transition-colors hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-500/20"
          >
            Product: <span className="font-mono">{showProductFilter.slice(-6)}</span> ✕
          </button>
        )}
        <select value={params.change_type} onChange={changeType} className={`${inputCls} cursor-pointer`}>
          <option value="">All change types</option>
          {Object.keys(TYPE_STYLE).map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">SKU</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider">Qty</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Prev → New</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Reason</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Ref</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading && !data ? (
                <tr><td colSpan="7"><PageLoader label="Loading logs…" /></td></tr>
              ) : data?.items.length === 0 ? (
                <tr>
                  <td colSpan="7">
                    <EmptyState title="No logs found" message="Inventory changes will appear here." />
                  </td>
                </tr>
              ) : (
                data.items.map((l) => (
                  <tr key={l._id || l.id} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="whitespace-nowrap px-6 py-3 text-xs text-slate-500 dark:text-slate-400">{formatDateTime(l.timestamp)}</td>
                    <td className="whitespace-nowrap px-6 py-3 font-mono text-[13px] text-slate-700 dark:text-slate-300">{l.product_sku}</td>
                    <td className="px-6 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_STYLE[l.change_type] || TYPE_STYLE.adjustment}`}>
                        {l.change_type}
                      </span>
                    </td>
                    <td className={`whitespace-nowrap px-6 py-3 text-right font-semibold ${
                      l.quantity > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                    }`}>{l.quantity > 0 ? `+${l.quantity}` : l.quantity}</td>
                    <td className="whitespace-nowrap px-6 py-3 font-mono text-xs text-slate-600 dark:text-slate-300">{l.previous_stock} → {l.new_stock}</td>
                    <td className="px-6 py-3 capitalize text-slate-600 dark:text-slate-400">{l.reason || '—'}</td>
                    <td className="whitespace-nowrap px-6 py-3 font-mono text-xs text-slate-400">{l.reference || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {data && !loading && data.total > 0 && (
          <div className="border-t border-slate-200 px-6 py-4 dark:border-slate-800">
            <Pagination
              page={data.page}
              pages={data.pages}
              total={data.total}
              pageSize={data.page_size}
              onPage={(page) => setParams((p) => ({ ...p, page }))}
            />
          </div>
        )}
      </div>
    </div>
  )
}
