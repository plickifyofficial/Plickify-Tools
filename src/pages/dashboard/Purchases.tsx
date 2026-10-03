import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { formatDate, taka } from '../../lib/format'
import type { Order, Product } from '../../lib/types'
import { Badge, EmptyState, PageTitle, Spinner } from '../../components/ui'
import { useSession } from '../../hooks/useSession'

interface OwnedTool {
  product: Product
  purchasedAt: string
  amount: number
}

export function Purchases(): JSX.Element {
  const { session } = useSession()
  const [tools, setTools] = useState<OwnedTool[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!session) return
    const { data } = await supabase
      .from('orders')
      .select('*, product:products(*)')
      .eq('user_id', session.user.id)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
    const rows = (data as Order[]) ?? []
    const seen = new Set<string>()
    const owned: OwnedTool[] = []
    for (const row of rows) {
      if (row.product && !seen.has(row.product.id)) {
        seen.add(row.product.id)
        owned.push({ product: row.product, purchasedAt: row.created_at, amount: Number(row.amount) })
      }
    }
    setTools(owned)
    setLoading(false)
  }, [session])

  useEffect(() => {
    void load()
  }, [load])

  async function download(tool: OwnedTool): Promise<void> {
    if (!tool.product.file_path) {
      setMessage('This tool has no file uploaded yet — check back soon.')
      return
    }
    setBusyId(tool.product.id)
    setMessage(null)
    const { data, error } = await supabase.storage
      .from('tool-files')
      .createSignedUrl(tool.product.file_path, 600)
    if (error || !data) {
      setMessage(error?.message ?? 'Could not create the download link.')
      setBusyId(null)
      return
    }
    // Count the download (best effort — RLS lets owners increment their product).
    void supabase.rpc('increment_download', { p_product_id: tool.product.id })
    window.open(data.signedUrl, '_blank')
    setBusyId(null)
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
            <div key={tool.product.id} className="card flex p-6">
              <div className="mr-4 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-violet-600 text-2xl text-white">
                <i className="fa-solid fa-toolbox" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-slate-900">{tool.product.name}</h3>
                  <Badge tone="green">Owned</Badge>
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-slate-500">{tool.product.description}</p>
                <div className="mt-2 text-xs text-slate-400">
                  {tool.product.version ? `v${tool.product.version} · ` : ''}
                  bought {formatDate(tool.purchasedAt)} · {taka(tool.amount)}
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <button
                    className="btn-primary"
                    onClick={() => void download(tool)}
                    disabled={busyId === tool.product.id}
                  >
                    <i
                      className={busyId === tool.product.id ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-download'}
                      aria-hidden="true"
                    />
                    {busyId === tool.product.id ? 'Preparing…' : 'Download'}
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
