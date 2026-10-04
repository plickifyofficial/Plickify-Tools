import { useCallback, useEffect, useState } from 'react'
import { insert, list, newest, nowIso, put, remove, update } from '../../lib/db'
import { formatDate, taka } from '../../lib/format'
import type { Product } from '../../lib/types'
import { Badge, Modal, PageTitle, Spinner } from '../../components/ui'

interface ProductForm {
  name: string
  slug: string
  category: string
  price: string
  original_price: string
  version: string
  description: string
  is_active: boolean
  file_url: string
}

const EMPTY_FORM: ProductForm = {
  name: '',
  slug: '',
  category: '',
  price: '',
  original_price: '',
  version: '',
  description: '',
  is_active: true,
  file_url: ''
}

export function AdminProducts(): JSX.Element {
  const [products, setProducts] = useState<Product[]>([])
  const [fileUrls, setFileUrls] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Product | 'new' | null>(null)
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const rows = await list<Product>('products')
      setProducts(newest(rows))
      // File URLs live in their own admin-only collection.
      const files = await list<{ id: string; url: string }>('product_files')
      setFileUrls(Object.fromEntries(files.map((f) => [f.id, f.url])))
    } catch (err) {
      console.error('products load failed', err)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  function open(target: Product | 'new'): void {
    setError(null)
    if (target === 'new') {
      setForm(EMPTY_FORM)
    } else {
      setForm({
        name: target.name,
        slug: target.slug,
        category: target.category ?? '',
        price: String(target.price),
        original_price: target.original_price ? String(target.original_price) : '',
        version: target.version ?? '',
        description: target.description ?? '',
        is_active: target.is_active,
        file_url: fileUrls[target.id] ?? ''
      })
    }
    setEditing(target)
  }

  async function save(): Promise<void> {
    if (!form.name.trim() || !form.price) {
      setError('Name and price are required.')
      return
    }
    const url = form.file_url.trim()
    if (url && !/^https:\/\//i.test(url)) {
      setError('Download URL must start with https://')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const payload = {
        name: form.name.trim(),
        slug: (form.slug.trim() || form.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')).replace(/^-|-$/g, ''),
        category: form.category.trim() || null,
        price: Number(form.price) || 0,
        original_price: form.original_price ? Number(form.original_price) : null,
        version: form.version.trim() || null,
        description: form.description.trim() || null,
        is_active: form.is_active
      }
      let productId: string
      if (editing === 'new' || !editing) {
        productId = await insert('products', { ...payload, download_count: 0, created_at: nowIso() })
      } else {
        productId = editing.id
        await update('products', productId, payload)
      }
      // Keep the download URL in the admin-only product_files collection.
      if (url) await put('product_files', productId, { url, updated_at: nowIso() })
      else await remove('product_files', productId).catch(() => undefined)
      setEditing(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the product.')
    }
    setBusy(false)
  }

  async function removeProduct(product: Product): Promise<void> {
    if (!window.confirm(`Delete "${product.name}"? Orders keep their history.`)) return
    try {
      await remove('product_files', product.id).catch(() => undefined)
      await remove('products', product.id)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed.')
    }
  }

  if (loading) return <Spinner label="Loading products…" />

  return (
    <div>
      <PageTitle
        title="Products"
        subtitle="Tools users can buy — paste the download URL (GitHub Release link) for each."
      />

      <div className="mb-4 flex justify-end">
        <button className="btn-primary" onClick={() => open('new')}>
          <i className="fa-solid fa-plus" aria-hidden="true" />
          New Product
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600" role="alert">
          {error}
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50/60 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-5 py-3.5">Product</th>
              <th className="px-5 py-3.5">Price</th>
              <th className="px-5 py-3.5">File</th>
              <th className="px-5 py-3.5">Status</th>
              <th className="px-5 py-3.5">Created</th>
              <th className="px-5 py-3.5">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {products.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50/60">
                <td className="px-5 py-3.5">
                  <div className="font-semibold text-slate-800">{p.name}</div>
                  <div className="text-xs text-slate-400">
                    {p.category ?? 'uncategorized'} {p.version ? `· v${p.version}` : ''}
                  </div>
                </td>
                <td className="px-5 py-3.5 font-bold text-slate-800">{taka(p.price)}</td>
                <td className="px-5 py-3.5">
                  <span
                    className={`text-xs font-semibold ${fileUrls[p.id] ? 'text-emerald-600' : 'text-brand-600 underline'}`}
                  >
                    <i
                      className={fileUrls[p.id] ? 'fa-solid fa-file-circle-check mr-1' : 'fa-solid fa-link mr-1'}
                      aria-hidden="true"
                    />
                    {fileUrls[p.id] ? 'URL set' : 'No file URL'}
                  </span>
                  {fileUrls[p.id] && (
                    <div className="mt-0.5 max-w-[220px] truncate text-[10px] text-slate-400">{fileUrls[p.id]}</div>
                  )}
                </td>
                <td className="px-5 py-3.5">
                  <Badge tone={p.is_active ? 'green' : 'slate'}>{p.is_active ? 'Active' : 'Hidden'}</Badge>
                </td>
                <td className="px-5 py-3.5 text-slate-500">{formatDate(p.created_at)}</td>
                <td className="px-5 py-3.5">
                  <div className="flex gap-2">
                    <button className="btn-secondary px-3 py-1.5 text-xs" onClick={() => open(p)}>
                      <i className="fa-solid fa-pen" aria-hidden="true" />
                      Edit
                    </button>
                    <button className="btn-danger px-3 py-1.5 text-xs" onClick={() => void removeProduct(p)}>
                      <i className="fa-solid fa-trash" aria-hidden="true" />
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td className="px-5 py-8 text-center text-slate-400" colSpan={6}>
                  No products yet — create your first one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={editing !== null} title={editing === 'new' ? 'New Product' : 'Edit Product'} onClose={() => setEditing(null)}>
        <div className="space-y-4">
          <div>
            <label className="label">Name *</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Price (৳) *</label>
              <input
                className="input"
                type="number"
                min={0}
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Original price (৳)</label>
              <input
                className="input"
                type="number"
                min={0}
                value={form.original_price}
                onChange={(e) => setForm({ ...form, original_price: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Category</label>
              <input
                className="input"
                placeholder="e.g. AI, Automation"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Version</label>
              <input
                className="input"
                placeholder="e.g. 1.0.0"
                value={form.version}
                onChange={(e) => setForm({ ...form, version: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="label">Description</label>
            <textarea
              className="input min-h-[90px]"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div>
            <label className="label">
              <i className="fa-solid fa-link mr-1" aria-hidden="true" />
              Download URL
            </label>
            <input
              className="input font-mono text-xs"
              placeholder="https://github.com/OWNER/REPO/releases/download/v1.0.0/file.zip"
              value={form.file_url}
              onChange={(e) => setForm({ ...form, file_url: e.target.value })}
            />
            <p className="mt-1 text-xs text-slate-400">
              Upload the tool file to a GitHub Release first, then paste its direct link here. Buyers only get it after
              payment approval.
            </p>
          </div>
          <label className="flex items-center justify-between text-sm font-semibold text-slate-700">
            Visible on the store
            <input
              type="checkbox"
              className="h-4 w-4 accent-brand-600"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
            />
          </label>

          {error && (
            <div className="rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-600" role="alert">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button className="btn-secondary" onClick={() => setEditing(null)}>
              Cancel
            </button>
            <button className="btn-primary" onClick={() => void save()} disabled={busy}>
              <i className={busy ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-floppy-disk'} aria-hidden="true" />
              {busy ? 'Saving…' : 'Save Product'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
