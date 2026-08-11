const BAR_COLORS = {
  in_stock: 'bg-emerald-500',
  low_stock: 'bg-amber-500',
  critical: 'bg-red-500',
  out_of_stock: 'bg-slate-400 dark:bg-slate-600',
}

export function StockBar({ product }) {
  const pct = product.reorder_point > 0
    ? Math.min(100, Math.round((product.current_stock / product.reorder_point) * 100))
    : product.current_stock > 0 ? 100 : 0

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3">
        <span className={`text-sm font-bold ${
          product.available_stock <= 0
            ? 'text-red-600 dark:text-red-400'
            : product.current_stock <= 3
              ? 'text-amber-600 dark:text-amber-400'
              : 'text-slate-900 dark:text-slate-100'
        }`}>
          {product.current_stock}
        </span>
        {product.reorder_point > 0 && (
          <span className="text-xs text-slate-400 dark:text-slate-500">/ {product.reorder_point}</span>
        )}
      </div>
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className={`h-full rounded-full transition-all duration-500 ${BAR_COLORS[product.stock_status] || 'bg-indigo-500'}`}
          style={{ width: `${Math.max(pct, product.current_stock > 0 ? 4 : 0)}%` }}
        />
      </div>
    </div>
  )
}
