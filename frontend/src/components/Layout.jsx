import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { agentApi } from '../api'
import { useTheme } from '../hooks/useTheme'
import { Icon } from './Icon'
import { Spinner } from './Spinner'

const NAV = [
  { to: '/', label: 'Dashboard', icon: Icon.dashboard, end: true },
  { to: '/products', label: 'Products', icon: Icon.products },
  { to: '/alerts', label: 'Alerts', icon: Icon.bell },
  { to: '/logs', label: 'Logs', icon: Icon.logs },
]

function AgentStatus() {
  const [status, setStatus] = useState({ state: 'loading' })

  const load = async () => {
    try {
      const s = await agentApi.status()
      setStatus({ state: 'ok', running: s.running, next: s.next_check })
    } catch {
      setStatus({ state: 'error' })
    }
  }

  useEffect(() => {
    load()
    const t = setInterval(load, 15000)
    return () => clearInterval(t)
  }, [])

  if (status.state === 'loading') return null

  const ok = status.state === 'ok' && status.running
  const dot = status.state === 'error' ? 'bg-slate-400' : ok ? 'bg-emerald-500' : 'bg-red-500'
  const label = status.state === 'error' ? 'API offline' : ok ? 'Agent running' : 'Agent stopped'

  return (
    <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 md:flex" title={status.next ? `Next check: ${new Date(status.next).toLocaleString()}` : ''}>
      <span className={`h-2 w-2 rounded-full ${dot} ${ok ? 'animate-pulse' : ''}`} />
      <span className="text-slate-600 dark:text-slate-300">{label}</span>
    </div>
  )
}

export function Layout() {
  const { dark, toggle } = useTheme()
  const [refreshing, setRefreshing] = useState(false)
  const navigate = useNavigate()

  const refresh = async () => {
    setRefreshing(true)
    try {
      const res = await fetch('/api/v1/health')
      if (!res.ok) throw new Error()
      navigate(0)
    } finally {
      setTimeout(() => setRefreshing(false), 600)
    }
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/70">
        <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 shadow-glow">
              <Icon.box className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">StockPilot</h1>
              <p className="hidden text-[11px] leading-tight text-slate-500 dark:text-slate-400 sm:block">Inventory Intelligence</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <AgentStatus />
            <button
              onClick={toggle}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition-colors hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-300 dark:hover:border-indigo-700 dark:hover:text-indigo-400"
              title="Toggle theme"
            >
              {dark ? <Icon.sun className="h-5 w-5" /> : <Icon.moon className="h-5 w-5" />}
            </button>
            <button
              onClick={refresh}
              disabled={refreshing}
              className="flex h-10 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white transition-all hover:bg-indigo-700 hover:shadow-glow disabled:opacity-60"
            >
              {refreshing ? <Spinner className="h-4 w-4 text-white" /> : <Icon.refresh className="h-4 w-4" />}
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        <nav className="sticky top-16 hidden h-[calc(100vh-4rem)] w-56 shrink-0 flex-col gap-1 border-r border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 md:flex">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
                }`
              }
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <main className="min-w-0 flex-1 px-4 py-8 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>

      {/* Mobile nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 md:hidden">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${
                isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'
              }`
            }
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
