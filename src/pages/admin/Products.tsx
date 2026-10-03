import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
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
}

const EMPTY_FORM: ProductForm = {
  name: '',
  slug: '',
  category: '',
  price: '',
  original_price: '',
  version: '',
  description: '',
  is_active: true
}

export function AdminProducts(): JSX.Element {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Product | 'new' | null>(null)
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadingId, setUploadingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false })
    setProducts((data as Product[]) ?? [])
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
        is_active: target.is_active
      })
    }
    setEditing(target)
  }

  async function save(): Promise<void> {
    if (!form.name.trim() || !form.price) {
      setError('Name and price are required.')
      return
    }
    setBusy(true)
    setError(null)
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
    const result =
      editing === 'new' || !editing
        ? await supabase.from('products').insert(payload)
        : await supabase.from('products').update(payload).eq('id', editing.id)
    setBusy(false)
    if (result.error) {
      setError(result.error.message)
      return
    }
    setEditing(null)
    await load()
  }

  async function remove(product: Product): Promise<void> {
    if (!window.confirm(`Delete "${product.name}"? Orders keep their history.`)) return
    const { error: err } = await supabase.from('products').delete().eq('id', product.id)
    if (err) setError(err.message)
    else await load()
  }

  async function uploadFile(product: Product, file: File): Promise<void> {
    setUploadingId(product.id)
    setError(null)
    const path = `${product.id}/${Date.now()}-${file.name.replace(/[^\w.\-]/g, '_')}`
    const { error: uploadErr } = await supabase.storage.from('tool-files').upload(path, file, {
      upsert: false
    })
    if (uploadErr) {
      setError(`Upload failed: ${uploadErr.message}`)
      setUploadingId(null)
      return
    }
    const { error: updateErr } = await supabase.from('products').update({ file_path: path }).eq('id', product.id)
    setUploadingId(null)
    if (updateErr) setError(updateErr.message)
    else await load()
  }

  if (loading) return <Spinner label="Loading products…" />

  return (
    <div>
      <PageTitle
        title="Products"
        subtitle="Tools users can buy — upload the file buyers will download."
        // eslint-disable-next-line react/no-unescaped-entities
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
                  <label className="cursor-pointer">
                    <span
                      className={`text-xs font-semibold ${p.file_path ? 'text-emerald-600' : 'text-brand-600 underline'}`}
                    >
                      <i
                        className={
                          uploadingId === p.id
                            ? 'fa-solid fa-spinner fa-spin mr-1'
                            : p.file_path
                              ? 'fa-solid fa-file-circle-check mr-1'
                              : 'fa-solid fa-upload mr-1'
                        }
                        aria-hidden="true"
                      />
                      {uploadingId === p.id ? 'Uploading…' : p.file_path ? 'Replace file' : 'Upload file'}
                    </span>
                    <input
                      type="file"
                      className="hidden"
                      disabled={uploadingId === p.id}
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) void uploadFile(p, file)
                        e.target.value = ''
                      }}
                    />
                  </label>
                  {p.file_path && <div className="mt-0.5 max-w-[160px] truncate text-[10px] text-slate-400">{p.file_path}</div>}
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
                    <button className="btn-danger px-3 py-1.5 text-xs" onClick={() => void remove(p)}>
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
