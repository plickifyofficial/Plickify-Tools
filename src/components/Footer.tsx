import { Link } from 'react-router-dom'

export function Footer(): JSX.Element {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-violet-600 font-extrabold text-white">
              P
            </span>
            <span className="text-lg font-extrabold text-slate-900">Plickify Tools</span>
          </div>
          <p className="mt-3 max-w-xs text-sm text-slate-500">
            Premium software tools &amp; extensions — buy once, download from your dashboard.
          </p>
          <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-slate-500">
            <i className="fa-solid fa-wallet text-brand-600" aria-hidden="true" />
            <span className="rounded-lg bg-pink-100 px-2.5 py-1 text-xs font-bold text-pink-700">bKash</span>
            <span className="rounded-lg bg-orange-100 px-2.5 py-1 text-xs font-bold text-orange-700">Nagad</span>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-bold uppercase tracking-wide text-slate-500">
            <i className="fa-solid fa-link mr-1.5" aria-hidden="true" />
            Quick Links
          </h4>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link className="inline-flex items-center gap-2 text-slate-600 hover:text-brand-600" to="/">
                <i className="fa-solid fa-house w-3.5 text-xs text-slate-400" aria-hidden="true" />
                Home
              </Link>
            </li>
            <li>
              <Link className="inline-flex items-center gap-2 text-slate-600 hover:text-brand-600" to="/tools">
                <i className="fa-solid fa-store w-3.5 text-xs text-slate-400" aria-hidden="true" />
                Tools
              </Link>
            </li>
            <li>
              <Link className="inline-flex items-center gap-2 text-slate-600 hover:text-brand-600" to="/dashboard">
                <i className="fa-solid fa-gauge w-3.5 text-xs text-slate-400" aria-hidden="true" />
                Dashboard
              </Link>
            </li>
            <li>
              <Link className="inline-flex items-center gap-2 text-slate-600 hover:text-brand-600" to="/login">
                <i className="fa-solid fa-right-to-bracket w-3.5 text-xs text-slate-400" aria-hidden="true" />
                Login
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-bold uppercase tracking-wide text-slate-500">
            <i className="fa-solid fa-headset mr-1.5" aria-hidden="true" />
            Contact
          </h4>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li className="flex items-center gap-2">
              <i className="fa-solid fa-envelope w-3.5 text-xs text-slate-400" aria-hidden="true" />
              plickifyofficial+hello@gmail.com
            </li>
            <li className="flex items-center gap-2">
              <i className="fa-solid fa-phone w-3.5 text-xs text-slate-400" aria-hidden="true" />
              +880 1888 745262
            </li>
            <li className="flex items-center gap-2">
              <i className="fa-solid fa-location-dot w-3.5 text-xs text-slate-400" aria-hidden="true" />
              Dhaka, Bangladesh
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-100 py-4 text-center text-xs text-slate-400">
        <i className="fa-regular fa-copyright" aria-hidden="true" /> 2026 Plickify Tools. All rights reserved.
      </div>
    </footer>
  )
}
