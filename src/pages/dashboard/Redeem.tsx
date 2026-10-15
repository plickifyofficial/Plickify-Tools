import { useState } from 'react'
import { Link } from 'react-router-dom'
import { copyText } from '../../lib/format'
import { PageTitle } from '../../components/ui'
import { useSession } from '../../hooks/useSession'

interface RedeemOk {
  license_key: string
  product_name: string
  product_id: string
}

export function Redeem(): JSX.Element {
  const { getIdToken } = useSession()
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<RedeemOk | null>(null)
  const [copied, setCopied] = useState(false)

  async function redeem(): Promise<void> {
    const value = code.trim()
    if (!value) {
      setError('Enter your redeem code.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const token = await getIdToken()
      if (!token) throw new Error('Session expired — logout and login again.')
      const res = await fetch('/api/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code: value })
      })
      const data = (await res.json()) as Partial<RedeemOk> & { error?: string }
      if (!res.ok || !data.license_key) throw new Error(data.error || 'Could not redeem the code.')
      setDone({
        license_key: data.license_key,
        product_name: data.product_name ?? 'Tool',
        product_id: data.product_id ?? ''
      })
      setCode('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not redeem the code.')
    }
    setBusy(false)
  }

  async function copyKey(key: string): Promise<void> {
    const ok = await copyText(key)
    setCopied(ok)
    window.setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div>
      <PageTitle title="Redeem a Code" subtitle="Gift/promo code ache? Paste kore free te tool unlock korun." />

      {done ? (
        <div className="card p-8 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-2xl text-emerald-600">
            <i className="fa-solid fa-circle-check" aria-hidden="true" />
          </span>
          <h2 className="mt-4 text-xl font-extrabold text-slate-900">{done.product_name} unlocked!</h2>
          <p className="mt-1 text-sm text-slate-500">License key copy kore rakhen — activation-e lagbe:</p>
          <div className="mx-auto mt-4 flex max-w-md items-center justify-between gap-3 rounded-xl bg-slate-900 px-4 py-3">
            <code className="truncate font-mono text-sm text-emerald-400">{done.license_key}</code>
            <button
              className="btn bg-white/10 px-3 py-1.5 text-xs text-white hover:bg-white/20"
              onClick={() => void copyKey(done.license_key)}
            >
              <i className={copied ? 'fa-solid fa-check' : 'fa-solid fa-copy'} aria-hidden="true" />
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link to="/dashboard/purchases" className="btn-primary">
              <i className="fa-solid fa-download" aria-hidden="true" />
              Download
            </Link>
            <Link to="/dashboard/license" className="btn-secondary">
              <i className="fa-solid fa-key" aria-hidden="true" />
              My License
            </Link>
            <button className="btn-secondary" onClick={() => setDone(null)}>
              <i className="fa-solid fa-ticket" aria-hidden="true" />
              Redeem another
            </button>
          </div>
        </div>
      ) : (
        <div className="card max-w-xl p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-violet-600 text-lg text-white">
              <i className="fa-solid fa-ticket" aria-hidden="true" />
            </span>
            <div>
              <h2 className="font-extrabold text-slate-900">Enter your code</h2>
              <p className="text-xs text-slate-500">Redeem code = free access — kono payment lagbe na.</p>
            </div>
          </div>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <input
              className="input font-mono uppercase"
              placeholder="e.g. GIFT-ABCD-2345"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void redeem()
              }}
            />
            <button className="btn-primary whitespace-nowrap" onClick={() => void redeem()} disabled={busy}>
              <i className={busy ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-gift'} aria-hidden="true" />
              {busy ? 'Checking…' : 'Redeem'}
            </button>
          </div>
          {error && (
            <div className="mt-3 rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-600" role="alert">
              <i className="fa-solid fa-triangle-exclamation mr-1.5" aria-hidden="true" />
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
