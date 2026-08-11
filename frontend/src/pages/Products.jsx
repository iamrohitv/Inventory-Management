import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { productsApi, inventoryApi } from '../api'
import { Modal } from '../components/Modal'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { Pagination } from '../components/Pagination'
import { StatusBadge } from '../components/StatusBadge'
import { StockBar } from '../components/StockBar'
import { EmptyState } from '../components/EmptyState'
import { Spinner, PageLoader } from '../components/Spinner'
import { ProductForm } from '../components/ProductForm'
import { Icon } from '../components/Icon'
import { useToast } from '../context/ToastContext'
import { formatCurrency } from '../utils/format'

const inputCls =
  'h-9 rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:border-slate-700 dark:bg-slate-800'

export function Products() {
  const toast = useToast()
  const [data, setData] = useState(null)
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [params, setParams] = useState({
    page: 1,
    page_size: 20,
    q: '',
    category: '',
    stock_status: '',
    supplier: '',
    location: '',
    sort: 'name',
    order: 'asc',
  })
  const [searchInput, setSearchInput] = useState('')
  const debounceRef = useRef(null)

  // modals
  const [addOpen, setAddOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [adjusting, setAdjusting] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await productsApi.list(params)
      setData(res)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }, [params, toast])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    productsApi.categories().then(setCategories).catch(() => {})
  }, [])

  // debounced search
  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setParams((p) => ({ ...p, q: searchInput, page: 1 }))
    }, 300)
    return () => clearTimeout(debounceRef.current)
  }, [searchInput])

  const set = (key) => (e) => setParams((p) => ({ ...p, [key]: e.target.value, page: 1 }))

  const toggleSort = (key) => {
    setParams((p) => {
      if (p.sort === key) return { ...p, order: p.order === 'asc' ? 'desc' : 'asc' }
      return { ...p, sort: key, order: 'asc' }
    })
  }

  const sortIndicator = (key) => {
    if (params.sort !== key) return ''
    return params.order === 'asc' ? ' ↑' : ' ↓'
  }

  const onSaved = async (promise, msg) => {
    try {
      await promise
      toast.success(msg)
      setAddOpen(false)
      setEditing(null)
      load()
    } catch (e) {
      toast.error(e.message)
    }
  }

  const handleDelete = async () => {
    try {
      await productsApi.remove(deleting.id)
      toast.success(`Deleted ${deleting.sku}`)
      setDeleting(null)
      load()
    } catch (e) {
      toast.error(e.message)
    }
  }

  const submitAdjustment = async (body) => {
    try {
      await inventoryApi.adjust(body)
      toast.success('Stock adjusted')
      setAdjusting(null)
      load()
    } catch (e) {
      toast.error(e.message)
    }
  }

  const quickReserve = async (p) => {
    try {
      await inventoryApi.reserve({ product_id: p.id, quantity: 1, reference: 'quick' })
      toast.success('1 unit reserved')
      load()
    } catch (e) {
      toast.error(e.message)
    }
  }

  const quickRelease = async (p) => {
    try {
      await inventoryApi.release({ product_id: p.id, quantity: 1, reference: 'quick' })
      toast.success('1 unit released')
      load()
    } catch (e) {
      toast.error(e.message)
    }
  }

  const exportCSV = () => {
    if (!data?.items.length) {
      toast.warning('No products to export')
      return
    }
    const headers = ['SKU', 'Name', 'Category', 'Price', 'Cost', 'Current Stock', 'Reserved', 'Available', 'Reorder Point', 'Status']
    const rows = data.items.map((p) => [
      p.sku, p.name, p.category, p.price, p.cost,
      p.current_stock, p.reserved_stock, p.available_stock, p.reorder_point, p.stock_status,
    ])
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `inventory-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('CSV exported')
  }

  const thCls = (key) =>
    `px-5 sm:px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider ${
      key ? 'cursor-pointer select-none hover:text-indigo-600 dark:hover:text-indigo-400' : ''
    }`

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Products</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {data ? `${data.total} products found` : 'Manage your inventory'}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="flex h-10 items-center gap-2 rounded-xl border border-slate-300 px-4 text-sm font-semibold transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
            <Icon.download className="h-4 w-4" /> Export
          </button>
          <button onClick={() => setAddOpen(true)} className="flex h-10 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white transition-all hover:bg-indigo-700 hover:shadow-glow">
            <Icon.plus className="h-4 w-4" /> Add Product
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Icon.search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search SKU or name…"
            className={`${inputCls} w-56 pl-9`}
          />
        </div>
        <select value={params.category} onChange={set('category')} className={`${inputCls} cursor-pointer`}>
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
          ))}
        </select>
        <select value={params.stock_status} onChange={set('stock_status')} className={`${inputCls} cursor-pointer`}>
          <option value="">All Status</option>
          <option value="in_stock">In Stock</option>
          <option value="low_stock">Low Stock</option>
          <option value="critical">Critical</option>
          <option value="out_of_stock">Out of Stock</option>
        </select>
        <select value={params.supplier} onChange={set('supplier')} className={`${inputCls} cursor-pointer`}>
          <option value="">All Suppliers</option>
          {[...new Set(data?.items.map((p) => p.supplier).filter(Boolean) || [])].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className={thCls('sku')} onClick={() => toggleSort('sku')}>SKU{sortIndicator('sku')}</th>
                <th className={thCls('name')} onClick={() => toggleSort('name')}>Product{sortIndicator('name')}</th>
                <th className={`${thCls('price')} text-right`} onClick={() => toggleSort('price')}>Price{sortIndicator('price')}</th>
                <th className={thCls('current_stock')} onClick={() => toggleSort('current_stock')}>Stock{sortIndicator('current_stock')}</th>
                <th className={`${thCls('available_stock')} text-right`} onClick={() => toggleSort('available_stock')}>Available{sortIndicator('available_stock')}</th>
                <th className={thCls()}>Status</th>
                <th className={`${thCls()} text-right`}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading && !data ? (
                <tr><td colSpan="7"><PageLoader /></td></tr>
              ) : data?.items.length === 0 ? (
                <tr>
                  <td colSpan="7">
                    <EmptyState
                      title="No products found"
                      message="Try adjusting your filters, or add a new product."
                      action={
                        <button onClick={() => setAddOpen(true)} className="mt-1 flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
                          <Icon.plus className="h-4 w-4" /> Add Product
                        </button>
                      }
                    />
                  </td>
                </tr>
              ) : (
                data.items.map((p, i) => (
                  <tr key={p.id} className={`transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 ${i % 2 === 1 ? 'bg-slate-50/50 dark:bg-slate-800/20' : ''}`}>
                    <td className="whitespace-nowrap px-5 py-3.5 font-mono text-[13px] text-slate-700 dark:text-slate-300 sm:px-6">{p.sku}</td>
                    <td className="px-5 py-3.5 sm:px-6">
                      <div className="max-w-[220px] truncate text-sm font-semibold">{p.name}</div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 capitalize dark:text-slate-400">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-indigo-400" />
                        {p.category}
                        {p.supplier && <span className="text-slate-400 dark:text-slate-500">· {p.supplier}</span>}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-right font-semibold sm:px-6">{formatCurrency(p.price)}</td>
                    <td className="px-5 py-3.5 sm:px-6"><StockBar product={p} /></td>
                    <td className={`whitespace-nowrap px-5 py-3.5 text-right font-medium sm:px-6 ${
                      p.available_stock <= 0 ? 'text-red-600 dark:text-red-400' : p.available_stock <= 10 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
                    }`}>{p.available_stock}</td>
                    <td className="px-5 py-3.5 sm:px-6"><StatusBadge status={p.stock_status} /></td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-right sm:px-6">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => setAdjusting(p)} title="Adjust stock" className="flex h-7 items-center gap-1 rounded-lg bg-indigo-50 px-2.5 text-xs font-medium text-indigo-700 transition-colors hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-500/20">
                          <Icon.adjust className="h-3.5 w-3.5" /> Adjust
                        </button>
                        <button onClick={() => quickReserve(p)} title="Reserve 1 unit" className="h-7 rounded-lg bg-emerald-50 px-2 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20">+Res</button>
                        <button onClick={() => quickRelease(p)} title="Release 1 unit" className="h-7 rounded-lg bg-amber-50 px-2 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:hover:bg-amber-500/20">-Rel</button>
                        <Link to={`/logs?product=${p.id}`} title="View logs" className="flex h-7 items-center rounded-lg bg-slate-100 px-2.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700">
                          <Icon.logs className="h-3.5 w-3.5" />
                        </Link>
                        <button onClick={() => setEditing(p)} title="Edit" className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200">
                          <Icon.edit className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => setDeleting(p)} title="Delete" className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400">
                          <Icon.trash className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
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

      {/* Add modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add Product" subtitle="Create a new product in inventory">
        <ProductForm
          categories={categories}
          onCancel={() => setAddOpen(false)}
          onSubmit={(payload) => onSaved(productsApi.create(payload), 'Product created')}
        />
      </Modal>

      {/* Edit modal */}
      <Modal open={!!editing} onClose={() => setEditing(null)} title={`Edit ${editing?.sku || ''}`} subtitle={editing?.name}>
        <ProductForm
          key={editing?.id}
          initial={editing}
          categories={categories}
          submitLabel="Save Changes"
          onCancel={() => setEditing(null)}
          onSubmit={(payload) => onSaved(productsApi.update(editing.id, payload), 'Product updated')}
        />
      </Modal>

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Delete product"
        message={`Are you sure you want to delete "${deleting?.name}" (${deleting?.sku})? This removes the product, its alerts and logs.`}
        confirmLabel="Delete"
      />

      {/* Adjust modal */}
      <Modal
        open={!!adjusting}
        onClose={() => setAdjusting(null)}
        title={`Adjust stock · ${adjusting?.sku || ''}`}
        subtitle={adjusting?.name}
      >
        <AdjustForm product={adjusting} onSubmit={submitAdjustment} onCancel={() => setAdjusting(null)} />
      </Modal>
    </div>
  )
}

function AdjustForm({ product, onSubmit, onCancel }) {
  const [qty, setQty] = useState('')
  const [reason, setReason] = useState('restock')
  const [reference, setReference] = useState('')
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    const n = parseInt(qty, 10)
    if (isNaN(n) || n === 0) {
      setError('Enter a non-zero quantity (e.g. +10 or -5)')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await onSubmit({ product_id: product.id, quantity: n, reason, reference: reference.trim() || null })
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  const inputCls =
    'w-full h-11 rounded-xl border border-slate-300 bg-white px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:border-slate-700 dark:bg-slate-800'
  const labelCls = 'mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300'

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800">
        <span className="text-sm text-slate-500 dark:text-slate-400">Current stock</span>
        <span className="text-lg font-bold">{product?.current_stock}</span>
      </div>
      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 dark:bg-red-500/10 dark:text-red-400">{error}</div>
      )}
      <div>
        <label className={labelCls}>Quantity Change</label>
        <input className={inputCls} value={qty} onChange={(e) => setQty(e.target.value)} placeholder="e.g. +10 or -5" />
      </div>
      <div>
        <label className={labelCls}>Reason</label>
        <select className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)}>
          {['restock', 'sale', 'return', 'adjustment', 'damaged', 'other'].map((r) => (
            <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelCls}>Reference (optional)</label>
        <input className={inputCls} value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Order #, PO #, etc." />
      </div>
      <div className="flex gap-3">
        <button type="button" onClick={onCancel} className="h-11 flex-1 rounded-xl bg-slate-100 font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
          Cancel
        </button>
        <button type="submit" disabled={saving} className="h-11 flex-1 rounded-xl bg-indigo-600 font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
          {saving ? 'Applying…' : 'Apply Change'}
        </button>
      </div>
    </form>
  )
}
