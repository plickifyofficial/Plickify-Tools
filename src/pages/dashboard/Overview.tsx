import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { formatDate, taka } from '../../lib/format'
import type { License, Order } from '../../lib/types'
import { Badge, PageTitle, StatCard } from '../../components/ui'
import { useSession } from '../../hooks/useSession'

const STATUS_TONE = { pending: 'amber', approved: 'green', rejected: 'red' } as const

export function DashboardOverview(): JSX.Element {
  const { profile, session } = useSession()
  const [licenses, setLicenses] = useState<License[]>([])
  const [orders, setOrders] = useState<Order[]>([])

  const load = useCallback(async () => {
    if (!session) return
    const [licRes, ordRes] = await Promise.all([
      supabase.from('licenses').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }),
      supabase
        .from('orders')
        .select('*, product:products(*)')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(5)
    ])
    setLicenses((licRes.data as License[]) ?? [])
    setOrders((ordRes.data as Order[]) ?? [])
  }, [session])

  useEffect(() => {
    void load()
  }, [load])

  const activeLicenses = licenses.filter((l) => l.status === 'active').length

  return (
    <div>
      <PageTitle
        title={`Welcome, ${profile?.full_name || profile?.email?.split('@')[0] || 'there'}!`}
        subtitle="Keep learning, keep growing — your tools and licenses live here."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Active Licenses"
          value={activeLicenses}
          icon="fa-solid fa-key"
          hint="Manage in My License"
        />
        <StatCard
          label="Tools Owned"
          value={orders.filter((o) => o.status === 'approved').length}
          icon="fa-solid fa-toolbox"
        />
        <StatCard
          label="Pending Orders"
          value={orders.filter((o) => o.status === 'pending').length}
          icon="fa-solid fa-hourglass-half"
        />
        <StatCard
          label="Total Spent"
          value={taka(
            orders.filter((o) => o.status === 'approved').reduce((sum, o) => sum + Number(o.amount), 0)
          )}
          icon="fa-solid fa-bangladeshi-taka-sign"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* License shortcut */}
        <div className="card p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-bold text-slate-900">
              <i className="fa-solid fa-key text-brand-600" aria-hidden="true" />
              Your License
            </h2>
            <Link to="/dashboard/license" className="text-sm font-semibold text-brand-600 hover:underline">
              View All
              <i className="fa-solid fa-arrow-right ml-1" aria-hidden="true" />
            </Link>
          </div>
          {licenses.length === 0 ? (
            <div className="mt-4 rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">
              No license yet. Buy a licensed tool to get your activation key.{' '}
              <Link to="/tools" className="font-semibold text-brand-600 hover:underline">
                Browse tools
                <i className="fa-solid fa-arrow-right ml-1" aria-hidden="true" />
              </Link>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {licenses.slice(0, 2).map((l) => (
                <div key={l.id} className="flex items-center justify-between rounded-xl border border-slate-100 p-4">
                  <div>
                    <div className="text-sm font-bold text-slate-900">{l.label}</div>
                    <div className="mt-1 font-mono text-xs text-slate-500">{l.key}</div>
                  </div>
                  <Badge tone={l.status === 'active' ? 'green' : 'red'}>
                    {l.status === 'active' ? 'Active' : 'Revoked'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent orders */}
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-bold text-slate-900">
              <i className="fa-solid fa-receipt text-brand-600" aria-hidden="true" />
              Recent Orders
            </h2>
            <Link to="/dashboard/orders" className="text-sm font-semibold text-brand-600 hover:underline">
              View All
              <i className="fa-solid fa-arrow-right ml-1" aria-hidden="true" />
            </Link>
          </div>
          {orders.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">
              <i className="fa-regular fa-circle-xmark mr-1 text-slate-400" aria-hidden="true" />
              No orders yet.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {orders.map((o) => (
                <div key={o.id} className="flex items-center justify-between text-sm">
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-slate-800">{o.product?.name ?? 'Tool'}</div>
                    <div className="text-xs text-slate-400">
                      {formatDate(o.created_at)} · {taka(Number(o.amount))}
                    </div>
                  </div>
                  <Badge tone={STATUS_TONE[o.status]}>{o.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
