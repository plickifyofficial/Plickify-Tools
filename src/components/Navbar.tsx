import { useEffect, useRef, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useSession } from '../hooks/useSession'

export function Navbar(): JSX.Element {
  const { session, profile, isAdmin, signOut } = useSession()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close the profile dropdown when clicking anywhere outside it.
  useEffect(() => {
    if (!menuOpen) return
    const onDocClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [menuOpen])

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `rounded-lg px-3 py-2 text-sm font-semibold transition ${
      isActive ? 'text-brand-700 bg-brand-50' : 'text-slate-600 hover:text-slate-900'
    }`

  const displayName = profile?.full_name || profile?.email?.split('@')[0] || 'Account'

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <img src="/logo.png" alt="" className="h-9 w-9 rounded-xl object-cover" />
          <span className="text-lg font-extrabold tracking-tight text-slate-900">
            Plickify <span className="text-brand-600">Tools</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 sm:flex">
          <NavLink to="/" className={linkClass} end>
            Home
          </NavLink>
          <NavLink to="/tools" className={linkClass}>
            Tools
          </NavLink>
          <NavLink to="/about" className={linkClass}>
            About
          </NavLink>
          <NavLink to="/contact" className={linkClass}>
            Contact
          </NavLink>
          {session && (
            <NavLink to="/dashboard" className={linkClass}>
              Dashboard
            </NavLink>
          )}
          {isAdmin && (
            <NavLink to="/admin" className={linkClass}>
              Admin
            </NavLink>
          )}
        </nav>

        <div className="flex items-center gap-2">
          {session ? (
            <div className="relative" ref={menuRef}>
              <button
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white py-1.5 pl-1.5 pr-2.5 transition hover:bg-slate-50"
                onClick={() => setMenuOpen((o) => !o)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
              >
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt=""
                    className="h-8 w-8 rounded-lg object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold uppercase text-white">
                    {displayName.charAt(0)}
                  </span>
                )}
                <span className="hidden max-w-[120px] truncate text-sm font-semibold text-slate-700 sm:block">
                  {displayName}
                </span>
                <i
                  className={`fa-solid fa-chevron-down text-[10px] text-slate-400 transition ${
                    menuOpen ? 'rotate-180' : ''
                  }`}
                  aria-hidden="true"
                />
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                  <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
                    <div className="truncate text-sm font-bold text-slate-900">
                      {profile?.full_name || 'User'}
                    </div>
                    <div className="truncate text-xs text-slate-500">{profile?.email}</div>
                  </div>
                  <div className="p-1.5">
                    <Link
                      to="/dashboard"
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      onClick={() => setMenuOpen(false)}
                    >
                      <i className="fa-solid fa-gauge w-4 text-center text-slate-400" aria-hidden="true" />
                      Dashboard
                    </Link>
                    <Link
                      to="/dashboard/purchases"
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      onClick={() => setMenuOpen(false)}
                    >
                      <i className="fa-solid fa-box-open w-4 text-center text-slate-400" aria-hidden="true" />
                      My Tools
                    </Link>
                    <Link
                      to="/dashboard/license"
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      onClick={() => setMenuOpen(false)}
                    >
                      <i className="fa-solid fa-key w-4 text-center text-slate-400" aria-hidden="true" />
                      My License
                    </Link>
                    {isAdmin && (
                      <Link
                        to="/admin"
                        className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        onClick={() => setMenuOpen(false)}
                      >
                        <i className="fa-solid fa-shield-halved w-4 text-center text-slate-400" aria-hidden="true" />
                        Admin Panel
                      </Link>
                    )}
                    <div className="my-1 border-t border-slate-100" />
                    <button
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50"
                      onClick={() => {
                        setMenuOpen(false)
                        void signOut()
                      }}
                    >
                      <i className="fa-solid fa-right-from-bracket w-4 text-center" aria-hidden="true" />
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
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
