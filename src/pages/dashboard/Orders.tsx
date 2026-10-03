import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { formatDate, taka } from '../../lib/format'
import type { Order } from '../../lib/types'
import { Badge, EmptyState, PageTitle, Spinner } from '../../components/ui'
import { useSession } from '../../hooks/useSession'

const STATUS_TONE = { pending: 'amber', approved: 'green', rejected: 'red' } as const
const STATUS_LABEL = { pending: 'Awaiting approval', approved: 'Approved', rejected: 'Rejected' } as const

export function Orders(): JSX.Element {
  const { session } = useSession()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!session) return
    const { data } = await supabase
      .from('orders')
      .select('*, product:products(name, price)')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
    setOrders((data as Order[]) ?? [])
    setLoading(false)
  }, [session])

  useEffect(() => {
    void load()
  }, [load])

  if (loading) return <Spinner label="Loading orders…" />

  return (
    <div>
      <PageTitle title="Orders" subtitle="Payment status and history for every purchase." />

      {orders.length === 0 ? (
        <EmptyState title="No orders yet" detail="Buy a tool and your order history will appear here." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50/60 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3.5">Tool</th>
                <th className="px-5 py-3.5">Date</th>
                <th className="px-5 py-3.5">Method</th>
                <th className="px-5 py-3.5">TrxID</th>
                <th className="px-5 py-3.5">Amount</th>
                <th className="px-5 py-3.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50/60">
                  <td className="px-5 py-3.5 font-semibold text-slate-800">{o.product?.name ?? 'Tool'}</td>
                  <td className="px-5 py-3.5 text-slate-500">{formatDate(o.created_at)}</td>
                  <td className="px-5 py-3.5 capitalize text-slate-500">{o.method}</td>
                  <td className="px-5 py-3.5 font-mono text-xs text-slate-500">{o.trx_id}</td>
                  <td className="px-5 py-3.5 font-bold text-slate-800">{taka(Number(o.amount))}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <Badge tone={STATUS_TONE[o.status]}>{STATUS_LABEL[o.status]}</Badge>
                      {o.status === 'approved' && (
                        <Link to="/dashboard/purchases" className="text-xs font-semibold text-brand-600 hover:underline">
                          <i className="fa-solid fa-download" aria-hidden="true" />
                          Download
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-xs text-slate-400">
        <i className="fa-solid fa-circle-info mr-1" aria-hidden="true" />
        Payment taking too long? Approval usually completes within 5–30 minutes — contact support with your TrxID.
      </p>
    </div>
  )
}
