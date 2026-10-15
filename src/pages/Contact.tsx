import { useState } from 'react'

const SUPPORT_EMAIL = 'plickifyofficial+hello@gmail.com'
const PHONE_DISPLAY = '+880 1888 745262'
const PHONE_TEL = '+8801888745262'

const CHANNELS = [
  {
    icon: 'fa-solid fa-envelope',
    title: 'Email',
    value: SUPPORT_EMAIL,
    href: `mailto:${SUPPORT_EMAIL}`,
    note: 'Best for order, license and download issues.'
  },
  {
    icon: 'fa-solid fa-phone',
    title: 'Phone / WhatsApp',
    value: PHONE_DISPLAY,
    href: `tel:${PHONE_TEL}`,
    note: 'Urgent payment or activation help.'
  },
  {
    icon: 'fa-solid fa-location-dot',
    title: 'Office',
    value: 'Dhaka, Bangladesh',
    href: null,
    note: 'Remote-first team — online support nationwide.'
  }
]

export function Contact(): JSX.Element {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')

  function onSend(e: React.FormEvent): void {
    e.preventDefault()
    const subject = encodeURIComponent(`Plickify Tools — ${name || 'Website inquiry'}`)
    const body = encodeURIComponent(`${message}\n\n— ${name}\n${email}`)
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`
  }

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-brand-700 via-brand-600 to-violet-600 text-white">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 sm:py-20">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold tracking-wide">
            <i className="fa-solid fa-headset" aria-hidden="true" />
            Support &amp; Contact
          </span>
          <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            যেকোনো সাহায্য লাগলে <span className="text-white">বলুন</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-white/85">
            Payment, license, download — jekono somossa message korun. Normally working hours-e
            1 ghontar moddhe reply kori.
          </p>
        </div>
      </section>

      {/* Channels */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid gap-5 md:grid-cols-3">
          {CHANNELS.map((c) => {
            const inner = (
              <>
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-violet-600 text-lg text-white">
                  <i className={c.icon} aria-hidden="true" />
                </span>
                <h3 className="mt-4 font-extrabold text-slate-900">{c.title}</h3>
                <p className="mt-1 break-all text-sm font-semibold text-brand-600">{c.value}</p>
                <p className="mt-1.5 text-xs text-slate-500">{c.note}</p>
              </>
            )
            return c.href ? (
              <a key={c.title} href={c.href} className="card block p-6 transition hover:-translate-y-0.5 hover:shadow-lg">
                {inner}
              </a>
            ) : (
              <div key={c.title} className="card p-6">
                {inner}
              </div>
            )
          })}
        </div>

        <div className="mt-10 grid gap-10 lg:grid-cols-2">
          {/* Form */}
          <form className="card p-6 sm:p-8" onSubmit={onSend}>
            <h2 className="text-xl font-extrabold text-slate-900">
              <i className="fa-solid fa-paper-plane mr-2 text-brand-600" aria-hidden="true" />
              Send a message
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Submit korle apnar email client open hobe — ready message-ta pathai din.
            </p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="contact-name">
                  Name
                </label>
                <input
                  id="contact-name"
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  required
                />
              </div>
              <div>
                <label className="label" htmlFor="contact-email">
                  Email
                </label>
                <input
                  id="contact-email"
                  type="email"
                  className="input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="label" htmlFor="contact-message">
                Message
              </label>
              <textarea
                id="contact-message"
                className="input min-h-[130px]"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Order ID, TrxID or license key dhele likhun — help taratari hobe."
                required
              />
            </div>
            <button type="submit" className="btn-primary mt-5 w-full sm:w-auto">
              <i className="fa-solid fa-envelope" aria-hidden="true" />
              Open in Email
            </button>
          </form>

          {/* Support info */}
          <div className="space-y-5">
            <div className="card p-6">
              <h3 className="font-extrabold text-slate-900">
                <i className="fa-solid fa-clock mr-2 text-brand-600" aria-hidden="true" />
                Support Hours
              </h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                <li className="flex justify-between border-b border-slate-100 pb-2">
                  <span>Saturday – Thursday</span>
                  <span className="font-semibold text-slate-900">10:00 AM – 8:00 PM</span>
                </li>
                <li className="flex justify-between">
                  <span>Friday</span>
                  <span className="font-semibold text-slate-900">3:00 PM – 8:00 PM</span>
                </li>
              </ul>
            </div>

            <div className="card p-6">
              <h3 className="font-extrabold text-slate-900">
                <i className="fa-solid fa-circle-question mr-2 text-brand-600" aria-hidden="true" />
                Quick help
              </h3>
              <ul className="mt-3 space-y-2.5 text-sm text-slate-600">
                <li className="flex items-start gap-2.5">
                  <i className="fa-solid fa-check mt-0.5 text-green-600" aria-hidden="true" />
                  Payment approved? Download instantly from <strong>Dashboard → My Tools</strong>.
                </li>
                <li className="flex items-start gap-2.5">
                  <i className="fa-solid fa-check mt-0.5 text-green-600" aria-hidden="true" />
                  License key <strong>Dashboard → My License</strong> page-e thake.
                </li>
                <li className="flex items-start gap-2.5">
                  <i className="fa-solid fa-check mt-0.5 text-green-600" aria-hidden="true" />
                  Message-e <strong>Order ID / TrxID / license key</strong> dile resolve fast hoy.
                </li>
              </ul>
            </div>

            <div className="rounded-2xl bg-gradient-to-r from-brand-700 to-violet-600 p-6 text-white">
              <div className="flex items-center gap-3">
                <img src="/logo.png" alt="" className="h-11 w-11 rounded-xl object-cover ring-2 ring-white/40" />
                <div>
                  <div className="font-extrabold">Plickify Tools</div>
                  <div className="text-sm text-white/80">by Plickify Academy</div>
                </div>
              </div>
              <p className="mt-3 text-sm text-white/85">
                Ki nite chan na janena? Message korun — apnar kaje right tool select kore debo.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
