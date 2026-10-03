import { NavLink, Outlet, Link } from 'react-router-dom'
import { useSession } from '../hooks/useSession'

interface NavItem {
  to: string
  label: string
  icon: string
  end?: boolean
}

const USER_NAV: NavItem[] = [
  { to: '/dashboard', label: 'Overview', icon: 'fa-house', end: true },
  { to: '/dashboard/license', label: 'My License', icon: 'fa-key' },
  { to: '/dashboard/purchases', label: 'My Tools', icon: 'fa-box-open' },
  { to: '/dashboard/orders', label: 'Orders', icon: 'fa-receipt' }
]

const ADMIN_NAV: NavItem[] = [
  { to: '/admin', label: 'Overview', icon: 'fa-chart-pie', end: true },
  { to: '/admin/orders', label: 'Orders', icon: 'fa-list-check' },
  { to: '/admin/products', label: 'Products', icon: 'fa-boxes-stacked' },
  { to: '/admin/licenses', label: 'Licenses', icon: 'fa-key' },
  { to: '/admin/users', label: 'Users', icon: 'fa-users' },
  { to: '/admin/settings', label: 'Site Settings', icon: 'fa-gear' }
]

export function DashboardLayout({ variant }: { variant: 'user' | 'admin' }): JSX.Element {
  const { profile, signOut, isAdmin } = useSession()
  const items = variant === 'admin' ? ADMIN_NAV : USER_NAV

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition ${
      isActive
        ? 'bg-white/10 text-white'
        : 'text-slate-300 hover:bg-white/5 hover:text-white'
    }`

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 z-30 flex w-64 flex-col bg-slate-900 p-4">
        <Link to="/" className="mb-6 flex items-center gap-2.5 px-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-violet-600 font-extrabold text-white">
            P
          </span>
          <div>
            <div className="text-sm font-extrabold text-white">Plickify Tools</div>
            <div className="text-[11px] uppercase tracking-widest text-slate-400">
              {variant === 'admin' ? 'Admin Panel' : 'Dashboard'}
            </div>
          </div>
        </Link>

        <nav className="flex-1 space-y-1">
          {items.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={linkClass}>
              <i className={`fa-solid ${item.icon} w-4 text-center text-base`} aria-hidden="true" />
              {item.label}
            </NavLink>
          ))}
          {variant === 'user' && isAdmin && (
            <NavLink to="/admin" className={linkClass}>
              <i className="fa-solid fa-shield-halved w-4 text-center text-base" aria-hidden="true" />
              Admin Panel
            </NavLink>
          )}
          <NavLink to="/tools" className={linkClass}>
            <i className="fa-solid fa-cart-shopping w-4 text-center text-base" aria-hidden="true" />
            Browse Tools
          </NavLink>
        </nav>

        <div className="border-t border-slate-700 pt-4">
          <div className="flex items-center gap-3 px-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-sm font-bold uppercase text-white">
              {(profile?.full_name || profile?.email || '?').charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-white">{profile?.full_name || 'User'}</div>
              <div className="truncate text-xs text-slate-400">{profile?.email}</div>
            </div>
          </div>
          <button
            className="mt-3 w-full rounded-xl bg-white/5 px-3 py-2 text-sm font-semibold text-slate-300 hover:bg-white/10 hover:text-white"
            onClick={() => void signOut()}
          >
            <i className="fa-solid fa-right-from-bracket mr-1.5" aria-hidden="true" />
            Logout
          </button>
        </div>
      </aside>

      <main className="ml-64 min-w-0 flex-1 px-4 py-8 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
