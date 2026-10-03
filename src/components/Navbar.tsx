import { Link, NavLink } from 'react-router-dom'
import { useSession } from '../hooks/useSession'

export function Navbar(): JSX.Element {
  const { session, isAdmin, signOut } = useSession()

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `rounded-lg px-3 py-2 text-sm font-semibold transition ${
      isActive ? 'text-brand-700 bg-brand-50' : 'text-slate-600 hover:text-slate-900'
    }`

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-violet-600 text-sm font-extrabold text-white">
            P
          </span>
          <span className="text-lg font-extrabold tracking-tight text-slate-900">
            Plickify <span className="text-brand-600">Tools</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 sm:flex">
          <NavLink to="/" className={linkClass} end>
            <i className="fa-solid fa-house mr-1.5 text-xs" aria-hidden="true" />
            Home
          </NavLink>
          <NavLink to="/tools" className={linkClass}>
            <i className="fa-solid fa-store mr-1.5 text-xs" aria-hidden="true" />
            Tools
          </NavLink>
          {session && (
            <NavLink to="/dashboard" className={linkClass}>
              <i className="fa-solid fa-gauge mr-1.5 text-xs" aria-hidden="true" />
              Dashboard
            </NavLink>
          )}
          {isAdmin && (
            <NavLink to="/admin" className={linkClass}>
              <i className="fa-solid fa-shield-halved mr-1.5 text-xs" aria-hidden="true" />
              Admin
            </NavLink>
          )}
        </nav>

        <div className="flex items-center gap-2">
          {session ? (
            <button className="btn-secondary" onClick={() => void signOut()}>
              <i className="fa-solid fa-right-from-bracket" aria-hidden="true" />
              Logout
            </button>
          ) : (
            <Link to="/login" className="btn-primary">
              <i className="fa-solid fa-right-to-bracket" aria-hidden="true" />
              Login
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
