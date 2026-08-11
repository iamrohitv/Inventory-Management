import { useState } from 'react'

const inputCls =
  'w-full h-11 rounded-xl border border-slate-300 bg-white px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:border-slate-700 dark:bg-slate-800'
const labelCls = 'mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300'

export function ProductForm({ initial, categories, onSubmit, onCancel, submitLabel = 'Create Product' }) {
  const [form, setForm] = useState({
    sku: initial?.sku || '',
    name: initial?.name || '',
    category: initial?.category || categories[0] || 'general',
    description: initial?.description || '',
    price: initial?.price ?? '',
    cost: initial?.cost ?? '',
    reorder_point: initial?.reorder_point ?? 10,
    reorder_quantity: initial?.reorder_quantity ?? 50,
    supplier: initial?.supplier || '',
    location: initial?.location || '',
    initial_stock: '',
  })
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    if (!form.sku.trim() || !form.name.trim()) {
      setError('SKU and Name are required')
      return
    }
    const price = parseFloat(form.price)
    if (isNaN(price) || price < 0) {
      setError('Please enter a valid price')
      return
    }

    const payload = {
      sku: form.sku.trim(),
      name: form.name.trim(),
      category: form.category.trim() || 'general',
      description: form.description.trim() || null,
      price,
      cost: parseFloat(form.cost || '0'),
      reorder_point: parseInt(form.reorder_point || '10', 10),
      reorder_quantity: parseInt(form.reorder_quantity || '50', 10),
      supplier: form.supplier.trim() || null,
      location: form.location.trim() || null,
    }
    if (!initial) payload.initial_stock = parseInt(form.initial_stock || '0', 10)

    setSaving(true)
    try {
      await onSubmit(payload)
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 dark:bg-red-500/10 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>SKU *</label>
          <input className={inputCls} value={form.sku} onChange={set('sku')} placeholder="e.g. itemxxx101" />
        </div>
        <div>
          <label className={labelCls}>Category</label>
          <select className={inputCls} value={form.category} onChange={set('category')}>
            <option value="">General</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className={labelCls}>Name *</label>
        <input className={inputCls} value={form.name} onChange={set('name')} placeholder="Product name" />
      </div>

      <div>
        <label className={labelCls}>Description</label>
        <textarea
          className={`${inputCls} h-auto resize-none py-2.5`}
          rows="2"
          value={form.description}
          onChange={set('description')}
          placeholder="Short description (optional)"
        />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div>
          <label className={labelCls}>Price *</label>
          <input type="number" min="0" step="0.01" className={inputCls} value={form.price} onChange={set('price')} placeholder="0.00" />
        </div>
        <div>
          <label className={labelCls}>Cost</label>
          <input type="number" min="0" step="0.01" className={inputCls} value={form.cost} onChange={set('cost')} placeholder="0.00" />
        </div>
        <div>
          <label className={labelCls}>Reorder Point</label>
          <input type="number" min="0" className={inputCls} value={form.reorder_point} onChange={set('reorder_point')} />
        </div>
        <div>
          <label className={labelCls}>Reorder Qty</label>
          <input type="number" min="1" className={inputCls} value={form.reorder_quantity} onChange={set('reorder_quantity')} />
        </div>
      </div>

      {!initial && (
        <div>
          <label className={labelCls}>Initial Stock</label>
          <input type="number" min="0" className={inputCls} value={form.initial_stock} onChange={set('initial_stock')} placeholder="0" />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Supplier</label>
          <input className={inputCls} value={form.supplier} onChange={set('supplier')} placeholder="Supplier name" />
        </div>
        <div>
          <label className={labelCls}>Location</label>
          <input className={inputCls} value={form.location} onChange={set('location')} placeholder="e.g. Warehouse A" />
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="h-11 flex-1 rounded-xl bg-slate-100 font-semibold text-slate-700 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="h-11 flex-1 rounded-xl bg-indigo-600 font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-60"
        >
          {saving ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  )
}
