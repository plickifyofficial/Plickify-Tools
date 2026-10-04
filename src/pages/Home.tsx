import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { backendConfigured } from '../lib/firebase'
import { list, newest, where } from '../lib/db'
import { taka } from '../lib/format'
import type { Product } from '../lib/types'
import { Badge, Thumb } from '../components/ui'

const FEATURES = [
  {
    icon: 'fa-solid fa-bolt',
    title: 'Instant Access',
    text: 'Payment approved? Your download unlocks immediately in the dashboard.'
  },
  {
    icon: 'fa-solid fa-lock',
    title: 'Google Login Only',
    text: 'No passwords to remember — sign in securely with your Google account.'
  },
  {
    icon: 'fa-solid fa-screwdriver-wrench',
    title: 'Tools & Extensions',
    text: 'One place for every premium tool we ship — past and future.'
  },
  {
    icon: 'fa-solid fa-credit-card',
    title: 'bKash & Nagad',
    text: 'Pay the way you already do in Bangladesh — verified by our team.'
  }
]

const STEPS = [
  { no: '01', icon: 'fa-solid fa-right-to-bracket', title: 'Login', text: 'Sign in with your Google account.' },
  { no: '02', icon: 'fa-solid fa-cart-shopping', title: 'Buy a tool', text: 'Pay via bKash or Nagad and submit your TrxID.' },
  { no: '03', icon: 'fa-solid fa-user-check', title: 'Admin approval', text: 'We verify the payment — usually within minutes.' },
  { no: '04', icon: 'fa-solid fa-download', title: 'Download', text: 'Grab your file anytime from your dashboard.' }
]

const FAQ = [
  {
    q: 'How do I receive the tool after buying?',
    a: 'After your payment is verified by our team, the Download button appears in your dashboard under “My Tools”. You can download it any time from there.'
  },
  {
    q: 'Which payment methods are supported?',
    a: 'bKash and Nagad. Submit your TrxID after payment — approval usually takes 5–30 minutes during working hours.'
  },
  {
    q: 'How does the app activation work?',
    a: 'Paid tools that need a license key (like Firefox Automation Manager) show the key on your dashboard’s “My License” page. Paste it into the app once — it stays activated on your device.'
  },
  {
    q: 'Can I use my license on multiple devices?',
    a: 'Each license allows a set number of devices (shown on the license page). You can free a seat yourself with the Deactivate button in the app’s Settings.'
  }
]

export function Home(): JSX.Element {
  const [products, setProducts] = useState<Product[]>([])

  useEffect(() => {
    if (!backendConfigured) return
    void list<Product>('products', where('is_active', '==', true))
      .then((rows) => setProducts(newest(rows).slice(0, 6)))
      .catch((err: unknown) => console.error('products load failed', err))
  }, [])

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-700 via-brand-600 to-violet-600 text-white">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold tracking-wide">
              <i className="fa-solid fa-rocket" aria-hidden="true" />
              Premium Tools &amp; Extensions
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
              এক Dashboard-এ আপনার সব Premium Tools
            </h1>
            <p className="mt-4 max-w-xl text-white/85">
              Buy once, download forever. Google দিয়ে login করুন, bKash/Nagad-এ payment করুন, আর tools গুলো
              আপনার dashboard থেকে যেকোনো সময় download করুন।
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/tools" className="btn bg-white text-brand-700 hover:bg-slate-100">
                <i className="fa-solid fa-store" aria-hidden="true" />
                Browse Tools
              </Link>
              <Link to="/login" className="btn border border-white/40 text-white hover:bg-white/10">
                <i className="fa-brands fa-google" aria-hidden="true" />
                Login with Google
              </Link>
            </div>
            <div className="mt-10 grid max-w-md grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-extrabold">10+</div>
                <div className="text-xs text-white/70">
                  <i className="fa-solid fa-box" aria-hidden="true" /> Premium Tools
                </div>
              </div>
              <div>
                <div className="text-2xl font-extrabold">500+</div>
                <div className="text-xs text-white/70">
                  <i className="fa-solid fa-users" aria-hidden="true" /> Happy Users
                </div>
              </div>
              <div>
                <div className="text-2xl font-extrabold">24/7</div>
                <div className="text-xs text-white/70">
                  <i className="fa-solid fa-clock" aria-hidden="true" /> Dashboard Access
                </div>
              </div>
            </div>
          </div>

          {/* Mock dashboard preview */}
          <div className="relative hidden lg:block">
            <div className="rounded-3xl bg-white/95 p-5 shadow-2xl">
              <div className="flex items-center justify-between">
                <div className="text-sm font-extrabold text-slate-900">Your Dashboard</div>
                <Badge tone="green">Active</Badge>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-slate-50 p-3">
                  <div className="text-xs text-slate-500">Tools</div>
                  <div className="text-xl font-extrabold text-slate-900">8</div>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <div className="text-xs text-slate-500">Licenses</div>
                  <div className="text-xl font-extrabold text-slate-900">2</div>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <div className="text-xs text-slate-500">Orders</div>
                  <div className="text-xl font-extrabold text-slate-900">5</div>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2.5">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <i className="fa-solid fa-toolbox text-brand-600" aria-hidden="true" /> Firefox Automation
                    Manager
                  </div>
                  <span className="text-xs font-bold text-emerald-600">Downloaded</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2.5">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <i className="fa-solid fa-key text-violet-500" aria-hidden="true" /> License Key
                  </div>
                  <span className="font-mono text-xs text-slate-500">FAM-••••-••••-7Q2K</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2.5">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <i className="fa-solid fa-receipt text-amber-500" aria-hidden="true" /> Order #1024
                  </div>
                  <Badge tone="amber">Pending</Badge>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-5 -left-6 rounded-2xl bg-amber-400 px-4 py-3 text-sm font-extrabold text-slate-900 shadow-lg">
              <i className="fa-solid fa-circle-check mr-1" aria-hidden="true" />
              Payment verified
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">কেন Plickify Tools?</h2>
          <p className="mt-2 text-slate-500">সবচেয়ে সহজভাবে tool কিনুন আর ব্যবহার করুন।</p>
        </div>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="card p-6 transition hover:-translate-y-1">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-xl text-brand-600">
                <i className={f.icon} aria-hidden="true" />
              </div>
              <h3 className="mt-4 font-bold text-slate-900">{f.title}</h3>
              <p className="mt-1.5 text-sm text-slate-500">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured tools */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">Available Tools</h2>
              <p className="mt-2 text-slate-500">Dashboard-এ download-এর জন্য ready।</p>
            </div>
            <Link to="/tools" className="btn-secondary">
              View All
              <i className="fa-solid fa-arrow-right" aria-hidden="true" />
            </Link>
          </div>

          {products.length > 0 ? (
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((p) => (
                <Link key={p.id} to="/tools" className="card group p-6 transition hover:-translate-y-1">
                  {p.image_url && (
                    <Thumb src={p.image_url} alt={p.name} className="mb-4 aspect-[4/3] w-full rounded-xl" />
                  )}
                  <div className="flex items-start justify-between">
                    {!p.image_url && (
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-violet-600 text-xl text-white">
                        <i className="fa-solid fa-toolbox" aria-hidden="true" />
                      </div>
                    )}
                    {p.category && <span className="ml-auto"><Badge tone="brand">{p.category}</Badge></span>}
                  </div>
                  <h3 className="mt-4 font-bold text-slate-900 group-hover:text-brand-600">{p.name}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-500">{p.description}</p>
                  <div className="mt-4 flex items-center justify-between">
                    <div>
                      {p.original_price && (
                        <span className="mr-2 text-xs text-slate-400 line-through">{taka(p.original_price)}</span>
                      )}
                      <span className="text-lg font-extrabold text-slate-900">{taka(p.price)}</span>
                    </div>
                    <span className="btn-primary pointer-events-none text-xs">
                      <i className="fa-solid fa-cart-plus" aria-hidden="true" />
                      Buy Now
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {['Firefox Automation Manager', 'Browser Extension Pack', 'Automation Starter Kit'].map((name) => (
                <div key={name} className="card p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-violet-600 text-xl text-white">
                    <i className="fa-solid fa-toolbox" aria-hidden="true" />
                  </div>
                  <h3 className="mt-4 font-bold text-slate-900">{name}</h3>
                  <p className="mt-1 text-sm text-slate-500">Coming soon — check back shortly.</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <h2 className="text-center text-3xl font-extrabold tracking-tight text-slate-900">কিভাবে কাজ করে?</h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s) => (
            <div key={s.no} className="card p-6">
              <div className="flex items-center justify-between">
                <div className="text-3xl font-extrabold text-brand-100">{s.no}</div>
                <i className={`${s.icon} text-xl text-brand-400`} aria-hidden="true" />
              </div>
              <h3 className="mt-2 font-bold text-slate-900">{s.title}</h3>
              <p className="mt-1 text-sm text-slate-500">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-extrabold tracking-tight text-slate-900">সাধারণ কিছু প্রশ্ন</h2>
          <div className="mt-8 space-y-3">
            {FAQ.map((item) => (
              <details key={item.q} className="card group px-5 py-4">
                <summary className="cursor-pointer list-none font-semibold text-slate-900 marker:hidden">
                  <i
                    className="fa-solid fa-chevron-down mr-2 text-brand-600 transition group-open:rotate-180"
                    aria-hidden="true"
                  />
                  {item.q}
                </summary>
                <p className="mt-3 pl-6 text-sm leading-relaxed text-slate-600">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="rounded-3xl bg-gradient-to-r from-brand-700 to-violet-600 px-8 py-12 text-center text-white">
          <h2 className="text-3xl font-extrabold">আজই শুরু করুন!</h2>
          <p className="mx-auto mt-2 max-w-xl text-white/85">
            Login করুন, পছন্দের tool কিনুন আর আপনার dashboard থেকে download করে ব্যবহার শুরু করুন।
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link to="/tools" className="btn bg-white text-brand-700 hover:bg-slate-100">
              <i className="fa-solid fa-store" aria-hidden="true" />
              Browse Tools
            </Link>
            <Link to="/login" className="btn border border-white/40 hover:bg-white/10">
              <i className="fa-solid fa-right-to-bracket" aria-hidden="true" />
              Login
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
