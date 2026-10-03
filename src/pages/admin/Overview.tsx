import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { formatDate, taka } from '../../lib/format'
import type { Order } from '../../lib/types'
import { Badge, PageTitle, Spinner, StatCard } from '../../components/ui'

const STATUS_TONE = { pending: 'amber', approved: 'green', rejected: 'red' } as const

export function AdminOverview(): JSX.Element {
  const [stats, setStats] = useState({ users: 0, products: 0, pending: 0, revenue: 0 })
  const [pendingOrders, setPendingOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const [usersRes, productsRes, pendingRes, approvedRes] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('products').select('id', { count: 'exact', head: true }),
      supabase
        .from('orders')
        .select('*, product:products(name), buyer:profiles(email, full_name)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false }),
      supabase.from('orders').select('amount').eq('status', 'approved')
    ])
    const approved = (approvedRes.data as { amount: number }[]) ?? []
    setStats({
      users: usersRes.count ?? 0,
      products: productsRes.count ?? 0,
      pending: pendingRes.data?.length ?? 0,
      revenue: approved.reduce((sum, o) => sum + Number(o.amount), 0)
    })
    setPendingOrders((pendingRes.data as Order[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  if (loading) return <Spinner label="Loading admin overview…" />

  return (
    <div>
      <PageTitle title="Admin Overview" subtitle="Everything happening across the store." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Users" value={stats.users} icon="fa-solid fa-users" />
        <StatCard label="Products" value={stats.products} icon="fa-solid fa-boxes-stacked" />
        <StatCard label="Pending Orders" value={stats.pending} icon="fa-solid fa-hourglass-half" hint="Needs verification" />
        <StatCard label="Revenue" value={taka(stats.revenue)} icon="fa-solid fa-bangladeshi-taka-sign" hint="Approved orders" />
      </div>

      <div className="card mt-6 p-6">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-bold text-slate-900">
            <i className="fa-solid fa-clipboard-check text-brand-600" aria-hidden="true" />
            Pending verifications
          </h2>
          <Link to="/admin/orders" className="text-sm font-semibold text-brand-600 hover:underline">
            All orders
            <i className="fa-solid fa-arrow-right ml-1" aria-hidden="true" />
          </Link>
        </div>
        {pendingOrders.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">
            <i className="fa-solid fa-circle-check mr-1 text-emerald-500" aria-hidden="true" />
            All clear — no pending orders.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {pendingOrders.slice(0, 6).map((o) => (
              <div
                key={o.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 px-4 py-3 text-sm"
              >
                <div>
                  <span className="font-semibold text-slate-800">{o.product?.name ?? 'Tool'}</span>
                  <span className="ml-2 text-slate-400">
                    {o.buyer?.full_name || o.buyer?.email} · {formatDate(o.created_at)}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-slate-800">{taka(Number(o.amount))}</span>
                  <Badge tone={STATUS_TONE[o.status]}>{o.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
