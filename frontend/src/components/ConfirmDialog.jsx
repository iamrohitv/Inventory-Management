import { Modal } from './Modal'

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Delete', danger = true }) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="max-w-md">
      <p className="text-sm text-slate-600 dark:text-slate-400">{message}</p>
      <div className="mt-6 flex gap-3">
        <button
          onClick={onClose}
          className="h-11 flex-1 rounded-xl bg-slate-100 font-semibold text-slate-700 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className={`h-11 flex-1 rounded-xl font-semibold text-white transition-colors ${
            danger ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'
          }`}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
