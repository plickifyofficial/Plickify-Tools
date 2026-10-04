import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { count, list, newest, sumOf, where } from '../../lib/db'
import { formatDate, taka } from '../../lib/format'
import type { Order, Profile, Product } from '../../lib/types'
import { Badge, PageTitle, Spinner, StatCard } from '../../components/ui'

const STATUS_TONE = { pending: 'amber', approved: 'green', rejected: 'red' } as const

export function AdminOverview(): JSX.Element {
  const [stats, setStats] = useState({ users: 0, products: 0, pending: 0, revenue: 0 })
  const [pendingOrders, setPendingOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const [users, products, pendingRows, revenue] = await Promise.all([
        count('profiles'),
        count('products'),
        list<Order>('orders', where('status', '==', 'pending')),
        sumOf('orders', 'amount', where('status', '==', 'approved'))
      ])
      const sortedPending = newest(pendingRows)
      // Buyer + product labels come from separate collections (no joins in Firestore).
      const [profiles, productRows] = await Promise.all([
        list<Profile>('profiles'),
        list<Product>('products')
      ])
      const buyerById = new Map(profiles.map((p) => [p.id, p]))
      const productById = new Map(productRows.map((p) => [p.id, p]))
      for (const o of sortedPending) {
        o.buyer = buyerById.get(o.user_id) ?? null
        o.product = productById.get(o.product_id) ?? null
      }
      setStats({ users, products, pending: pendingRows.length, revenue })
      setPendingOrders(sortedPending)
    } catch (err) {
      console.error('admin overview load failed', err)
    }
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
                  <span className="font-semibold text-slate-800">{o.product?.name ?? o.product_name ?? 'Tool'}</span>
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
