import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { list, newest, where } from '../../lib/db'
import { formatDate, taka } from '../../lib/format'
import type { Order, Product } from '../../lib/types'
import { Badge, EmptyState, PageTitle, Spinner } from '../../components/ui'
import { useSession } from '../../hooks/useSession'

interface OwnedTool {
  productId: string
  name: string
  description: string | null
  version: string | null
  purchasedAt: string
  amount: number
}

export function Purchases(): JSX.Element {
  const { session, getIdToken } = useSession()
  const [tools, setTools] = useState<OwnedTool[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!session) return
    try {
      const [orderRows, productRows] = await Promise.all([
        list<Order>('orders', where('user_id', '==', session.user.id), where('status', '==', 'approved')),
        list<Product>('products', where('is_active', '==', true))
      ])
      const productsById = new Map(productRows.map((p) => [p.id, p]))
      const seen = new Set<string>()
      const owned: OwnedTool[] = []
      for (const row of newest(orderRows)) {
        if (seen.has(row.product_id)) continue
        seen.add(row.product_id)
        const product = productsById.get(row.product_id)
        owned.push({
          productId: row.product_id,
          name: product?.name ?? row.product_name ?? 'Tool',
          description: product?.description ?? null,
          version: product?.version ?? null,
          purchasedAt: row.created_at,
          amount: Number(row.amount)
        })
      }
      setTools(owned)
    } catch (err) {
      console.error('purchases load failed', err)
    }
    setLoading(false)
  }, [session])

  useEffect(() => {
    void load()
  }, [load])

  async function download(tool: OwnedTool): Promise<void> {
    setBusyId(tool.productId)
    setMessage(null)
    try {
      const token = await getIdToken()
      if (!token) {
        setMessage('Sign in again to download.')
        return
      }
      const res = await fetch(`/api/download?product=${encodeURIComponent(tool.productId)}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = (await res.json()) as { url?: string; error?: string }
      if (!res.ok || !data.url) {
        setMessage(data.error ?? 'Could not prepare the download link.')
        return
      }
      window.open(data.url, '_blank')
    } catch {
      setMessage('Download server unreachable — try again in a minute.')
    } finally {
      setBusyId(null)
    }
  }

  if (loading) return <Spinner label="Loading your tools…" />

  return (
    <div>
      <PageTitle title="My Tools" subtitle="Everything you have bought — download anytime." />

      {message && (
        <div className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700" role="status">
          {message}
        </div>
      )}

      {tools.length === 0 ? (
        <EmptyState
          title="No tools purchased yet"
          detail="Approved orders show up here with a permanent download button."
        />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          {tools.map((tool) => (
            <div key={tool.productId} className="card flex p-6">
              <div className="mr-4 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-violet-600 text-2xl text-white">
                <i className="fa-solid fa-toolbox" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-slate-900">{tool.name}</h3>
                  <Badge tone="green">Owned</Badge>
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-slate-500">{tool.description}</p>
                <div className="mt-2 text-xs text-slate-400">
                  {tool.version ? `v${tool.version} · ` : ''}
                  bought {formatDate(tool.purchasedAt)} · {taka(tool.amount)}
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <button
                    className="btn-primary"
                    onClick={() => void download(tool)}
                    disabled={busyId === tool.productId}
                  >
                    <i
                      className={busyId === tool.productId ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-download'}
                      aria-hidden="true"
                    />
                    {busyId === tool.productId ? 'Preparing…' : 'Download'}
                  </button>
                  <Link to="/dashboard/license" className="text-xs font-semibold text-brand-600 hover:underline">
                    <i className="fa-solid fa-key mr-1" aria-hidden="true" />
                    License key
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
