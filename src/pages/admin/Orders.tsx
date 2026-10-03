import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { formatDate, taka } from '../../lib/format'
import type { Order, OrderStatus } from '../../lib/types'
import { Badge, PageTitle, Spinner } from '../../components/ui'

const STATUS_TONE = { pending: 'amber', approved: 'green', rejected: 'red' } as const
const FILTERS: Array<{ value: OrderStatus | 'all'; label: string; icon: string }> = [
  { value: 'pending', label: 'Pending', icon: 'fa-solid fa-hourglass-half' },
  { value: 'approved', label: 'Approved', icon: 'fa-solid fa-circle-check' },
  { value: 'rejected', label: 'Rejected', icon: 'fa-solid fa-circle-xmark' },
  { value: 'all', label: 'All', icon: 'fa-solid fa-list' }
]

export function AdminOrders(): JSX.Element {
  const [orders, setOrders] = useState<Order[]>([])
  const [filter, setFilter] = useState<OrderStatus | 'all'>('pending')
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    let query = supabase
      .from('orders')
      .select('*, product:products(name), buyer:profiles(email, full_name)')
      .order('created_at', { ascending: false })
      .limit(200)
    if (filter !== 'all') query = query.eq('status', filter)
    const { data, error: err } = await query
    if (err) setError(err.message)
    setOrders((data as Order[]) ?? [])
    setLoading(false)
  }, [filter])

  useEffect(() => {
    setLoading(true)
    void load()
  }, [load])

  async function setStatus(id: string, status: OrderStatus): Promise<void> {
    setBusyId(id)
    setError(null)
    const { error: err } = await supabase.from('orders').update({ status }).eq('id', id)
    setBusyId(null)
    if (err) {
      setError(err.message)
      return
    }
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)))
  }

  return (
    <div>
      <PageTitle title="Orders" subtitle="Verify TrxIDs and unlock downloads." />

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              filter === f.value ? 'bg-brand-600 text-white' : 'border border-slate-200 bg-white text-slate-600'
            }`}
            onClick={() => setFilter(f.value)}
          >
            <i className={`${f.icon} mr-1.5`} aria-hidden="true" />
            {f.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600" role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <Spinner label="Loading orders…" />
      ) : orders.length === 0 ? (
        <div className="card p-10 text-center text-sm text-slate-500">No {filter === 'all' ? '' : filter} orders.</div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50/60 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3.5">Buyer</th>
                <th className="px-5 py-3.5">Tool</th>
                <th className="px-5 py-3.5">Method / TrxID</th>
                <th className="px-5 py-3.5">Amount</th>
                <th className="px-5 py-3.5">Date</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50/60">
                  <td className="px-5 py-3.5">
                    <div className="font-semibold text-slate-800">{o.buyer?.full_name || '—'}</div>
                    <div className="text-xs text-slate-400">{o.buyer?.email}</div>
                  </td>
                  <td className="px-5 py-3.5 font-semibold text-slate-800">{o.product?.name ?? 'Tool'}</td>
                  <td className="px-5 py-3.5">
                    <div className="capitalize text-slate-600">{o.method}</div>
                    <div className="font-mono text-xs text-slate-500">{o.trx_id}</div>
                  </td>
                  <td className="px-5 py-3.5 font-bold text-slate-800">{taka(Number(o.amount))}</td>
                  <td className="px-5 py-3.5 text-slate-500">{formatDate(o.created_at)}</td>
                  <td className="px-5 py-3.5">
                    <Badge tone={STATUS_TONE[o.status]}>{o.status}</Badge>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex gap-2">
                      {o.status !== 'approved' && (
                        <button
                          className="btn bg-emerald-600 px-3 py-1.5 text-xs text-white hover:bg-emerald-700"
                          onClick={() => void setStatus(o.id, 'approved')}
                          disabled={busyId === o.id}
                        >
                          <i className="fa-solid fa-circle-check" aria-hidden="true" />
                          Approve
                        </button>
                      )}
                      {o.status !== 'rejected' && (
                        <button
                          className="btn-danger px-3 py-1.5 text-xs"
                          onClick={() => void setStatus(o.id, 'rejected')}
                          disabled={busyId === o.id}
                        >
                          <i className="fa-solid fa-circle-xmark" aria-hidden="true" />
                          Reject
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
