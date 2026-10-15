import { Link } from 'react-router-dom'

const VALUES = [
  {
    icon: 'fa-solid fa-tag',
    title: 'One-Time Payment',
    text: 'No subscriptions, no renewals. Pay once with bKash or Nagad and own the tool forever.'
  },
  {
    icon: 'fa-solid fa-laptop',
    title: '2-Device License',
    text: 'Activate on up to 2 computers at a time. Free a seat from your dashboard anytime.'
  },
  {
    icon: 'fa-solid fa-rotate',
    title: 'Lifetime Updates',
    text: 'Every future version ships free to existing license holders — no upgrade fees.'
  },
  {
    icon: 'fa-solid fa-shield-halved',
    title: 'Protected Activation',
    text: 'Google login plus server-checked license keys keep your copy safe and yours alone.'
  }
]

const STEPS = [
  {
    no: '01',
    icon: 'fa-brands fa-google',
    title: 'Google দিয়ে Login',
    text: 'One click sign-in — no passwords to create or remember.'
  },
  {
    no: '02',
    icon: 'fa-solid fa-wallet',
    title: 'bKash / Nagad-এ Pay',
    text: 'Send the price to our number and submit your TrxID from the order page.'
  },
  {
    no: '03',
    icon: 'fa-solid fa-circle-check',
    title: 'Admin Approval',
    text: 'We verify the payment — your order unlocks and your license key appears.'
  },
  {
    no: '04',
    icon: 'fa-solid fa-download',
    title: 'Download & Activate',
    text: 'Grab the installer from your dashboard and activate it with your license key.'
  }
]

export function About(): JSX.Element {
  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-brand-700 via-brand-600 to-violet-600 text-white">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 sm:py-20">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold tracking-wide">
            <i className="fa-solid fa-circle-info" aria-hidden="true" />
            About Plickify Tools
          </span>
          <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            Premium Tools, একদম Fair Price-এ
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-white/85">
            Plickify Tools is the software store of <strong>Plickify Academy</strong> — built for
            Bangladeshi marketers, freelancers and growth hackers who want professional desktop tools
            without monthly subscriptions.
          </p>
        </div>
      </section>

      {/* Story */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">
              <i className="fa-solid fa-bolt mr-2 text-brand-600" aria-hidden="true" />
              আমাদের কথা
            </h2>
            <p className="mt-4 leading-relaxed text-slate-600">
              Plickify Academy-এর বহু শিক্ষার্থী জিজ্ঞেস করেছিলেন — &ldquo;ভাই, real-world tools গুলো
              কোথায় পাব?&rdquo; সেই প্রশ্নের উত্তরই Plickify Tools. আমরা marketing, lead-generation আর
              automation-এর জন্য যেসব premium desktop tool ব্যবহার করি, সেগুলো এখানে একদম সহজ প্রক্রিয়ায়
              কিনে নেওয়া যায়।
            </p>
            <p className="mt-3 leading-relaxed text-slate-600">
              Kono subscription nai, kono hidden fee nai. Google diye login, bKash/Nagad diye payment,
              admin approval — tarpor dashboard theke download kore chalai felun. Puro purchase journey
              5 minute-er beshi na.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/tools" className="btn-primary">
                <i className="fa-solid fa-store" aria-hidden="true" />
                Browse Tools
              </Link>
              <a
                href="https://plickify-academy-gamma.vercel.app"
                target="_blank"
                rel="noreferrer"
                className="btn-secondary"
              >
                <i className="fa-solid fa-graduation-cap" aria-hidden="true" />
                Visit Plickify Academy
              </a>
            </div>
          </div>

          <div className="card p-6">
            <h3 className="text-lg font-extrabold text-slate-900">
              <i className="fa-solid fa-chart-line mr-2 text-brand-600" aria-hidden="true" />
              Why Plickify Tools?
            </h3>
            <ul className="mt-4 space-y-3 text-sm text-slate-600">
              {VALUES.map((v) => (
                <li key={v.title} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                    <i className={v.icon} aria-hidden="true" />
                  </span>
                  <span>
                    <strong className="block font-bold text-slate-900">{v.title}</strong>
                    {v.text}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <h2 className="text-center text-3xl font-extrabold tracking-tight text-slate-900">
            কেনা যেভাবে — <span className="text-brand-600">৪ ধাপে</span>
          </h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s) => (
              <div key={s.no} className="card relative p-6">
                <span className="absolute right-5 top-4 text-4xl font-extrabold text-slate-100">
                  {s.no}
                </span>
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-violet-600 text-lg text-white">
                  <i className={s.icon} aria-hidden="true" />
                </span>
                <h3 className="mt-4 font-extrabold text-slate-900">{s.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="rounded-3xl bg-gradient-to-r from-brand-700 to-violet-600 px-8 py-12 text-center text-white">
          <h2 className="text-3xl font-extrabold">Ready to explore the tools?</h2>
          <p className="mx-auto mt-2 max-w-xl text-white/85">
            Store browse korun, pasand er tool select korun — order page-e TrxID submit korlei shuru.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link to="/tools" className="btn bg-white text-brand-700 hover:bg-slate-100">
              <i className="fa-solid fa-store" aria-hidden="true" />
              Browse Tools
            </Link>
            <Link to="/contact" className="btn border border-white/40 hover:bg-white/10">
              <i className="fa-solid fa-envelope" aria-hidden="true" />
              Contact Us
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
