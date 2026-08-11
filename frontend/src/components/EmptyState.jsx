import { Icon } from './Icon'

export function EmptyState({ title, message, action }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center text-slate-400 dark:text-slate-500">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
        <Icon.search className="h-6 w-6" />
      </span>
      <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{title}</p>
      <p className="max-w-sm text-sm">{message}</p>
      {action}
    </div>
  )
}
