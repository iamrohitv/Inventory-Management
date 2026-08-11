import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { dashboardApi, alertsApi } from '../api'
import { StatCard } from '../components/StatCard'
import { Icon } from '../components/Icon'
import { EmptyState } from '../components/EmptyState'
import { Spinner } from '../components/Spinner'
import { formatCurrency, timeAgo } from '../utils/format'

function CategoryBar({ categories }) {
  const max = Math.max(1, ...categories.map((c) => c.count))
  return (
    <div className="space-y-3">
      {categories.map((c) => (
        <div key={c.category}>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="font-medium capitalize text-slate-700 dark:text-slate-200">{c.category}</span>
            <span className="text-slate-500 dark:text-slate-400">{c.count}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-600 transition-all duration-700"
              style={{ width: `${(c.count / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

export function Dashboard() {
  const [stats, setStats] = useState(null)
  const [alerts, setAlerts] = useState(null)

  const load = async () => {
    const [s, a] = await Promise.all([dashboardApi.stats(), alertsApi.list({ unread_only: true, page_size: 6 })])
    setStats(s)
    setAlerts(a)
  }

  useEffect(() => {
    load().catch((e) => console.error(e))
    const t = setInterval(load, 30000)
    return () => clearInterval(t)
  }, [])

  if (!stats || !alerts) return <Spinner className="mx-auto mt-24 block h-10 w-10" />

  const cards = [
    { label: 'Total Products', value: stats.total_products.toLocaleString(), gradient: 'from-indigo-500 to-indigo-700', icon: <Icon.box className="h-5 w-5 text-white" /> },
    { label: 'Low Stock', value: stats.low_stock_count.toLocaleString(), gradient: 'from-amber-400 to-amber-600', icon: <Icon.alert className="h-5 w-5 text-white" /> },
    { label: 'Critical Stock', value: stats.critical_stock_count.toLocaleString(), gradient: 'from-red-500 to-red-700', icon: <Icon.alert className="h-5 w-5 text-white" /> },
    { label: 'Inventory Value', value: formatCurrency(stats.total_inventory_value), gradient: 'from-emerald-500 to-emerald-700', icon: <Icon.box className="h-5 w-5 text-white" /> },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Dashboard</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Live stock monitoring with AI-powered alerts
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <StatCard key={c.label} {...c} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <section className="rounded-2xl border border-slate-200 bg-white shadow-soft dark:border-slate-800 dark:bg-slate-900 xl:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">Recent Alerts</h3>
              <span className="inline-flex h-5 min-w-[1.5rem] items-center justify-center rounded-full bg-red-100 px-1.5 text-xs font-bold text-red-700 dark:bg-red-500/15 dark:text-red-400">
                {stats.unread_alerts}
              </span>
            </div>
            <Link to="/alerts" className="text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">
              View all
            </Link>
          </div>
          <div className="max-h-[380px] overflow-y-auto scrollbar-thin">
            {alerts.items.length === 0 ? (
              <EmptyState title="All clear" message="No active alerts right now." />
            ) : (
              alerts.items.map((a) => (
                <div key={a.id} className="flex items-start gap-3 border-b border-slate-100 px-6 py-3.5 last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50">
                  <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                    a.alert_type === 'out_of_stock' || a.alert_type === 'critical_stock'
                      ? 'bg-red-50 text-red-500 dark:bg-red-500/10'
                      : 'bg-amber-50 text-amber-500 dark:bg-amber-500/10'
                  }`}>
                    <Icon.alert className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-snug">{a.message}</p>
                    <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">{timeAgo(a.created_at)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-soft dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-200 px-6 py-4 dark:border-slate-800">
            <h3 className="text-lg font-semibold">Categories</h3>
          </div>
          <div className="p-6">
            {stats.categories.length ? (
              <CategoryBar categories={stats.categories} />
            ) : (
              <p className="text-center text-sm text-slate-400">No products yet</p>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
