import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { backendConfigured } from '../lib/firebase'
import { list, newest, where } from '../lib/db'
import { taka } from '../lib/format'
import type { PaymentMethod, Product } from '../lib/types'
import { Badge, Modal, PageTitle, Spinner, Thumb } from '../components/ui'
import { useSession } from '../hooks/useSession'

interface CouponOk {
  code: string
  discount: number
  total: number
}

export function Tools(): JSX.Element {
  const { session } = useSession()
  const navigate = useNavigate()
  const [products, setProducts] = useState<Product[]>([])
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [buying, setBuying] = useState<Product | null>(null)

  const load = useCallback(async () => {
    if (!backendConfigured) {
      setLoading(false)
      return
    }
    try {
      const [productRows, settingRows] = await Promise.all([
        list<Product>('products', where('is_active', '==', true)),
        list<{ key: string; value: string }>('site_settings')
      ])
      setProducts(newest(productRows))
      const map: Record<string, string> = {}
      for (const row of settingRows) map[row.key] = row.value
      setSettings(map)
    } catch (err) {
      console.error('store load failed', err)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <PageTitle title="Premium Tools" subtitle="Buy once — download from your dashboard forever." />

      {loading ? (
        <Spinner label="Loading tools…" />
      ) : products.length === 0 ? (
        <div className="card p-10 text-center text-slate-500">
          <i className="fa-solid fa-box-open mb-3 text-4xl text-slate-300" aria-hidden="true" />
          <p>
            {backendConfigured
              ? 'No tools published yet — new releases will appear here.'
              : 'Backend not configured yet (see site/.env.example).'}
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <div key={p.id} className="card flex flex-col p-6">
              {p.image_url && (
                <Thumb src={p.image_url} alt={p.name} className="mb-4 aspect-[4/3] w-full rounded-xl" />
              )}
              <div className="flex items-start justify-between">
                {!p.image_url && (
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-violet-600 text-xl text-white">
                    <i className="fa-solid fa-toolbox" aria-hidden="true" />
                  </div>
                )}
                <div className="ml-auto flex gap-2">
                  {p.category && <Badge tone="brand">{p.category}</Badge>}
                  {p.version && <Badge>v{p.version}</Badge>}
                </div>
              </div>
              <h3 className="mt-4 font-bold text-slate-900">{p.name}</h3>
              <p className="mt-1 line-clamp-3 flex-1 text-sm text-slate-500">{p.description}</p>
              <div className="mt-4 flex items-center justify-between">
                <div>
                  {p.original_price && (
                    <span className="mr-2 text-xs text-slate-400 line-through">{taka(p.original_price)}</span>
                  )}
                  {p.price > 0 ? (
                    <span className="text-xl font-extrabold text-slate-900">{taka(p.price)}</span>
                  ) : (
                    <span className="text-xl font-extrabold text-emerald-600">Free</span>
                  )}
                </div>
                <button
                  className="btn-primary"
                  onClick={() => {
                    if (!session) {
                      navigate('/login')
                      return
                    }
                    setBuying(p)
                  }}
                >
                  <i className={p.price > 0 ? 'fa-solid fa-cart-plus' : 'fa-solid fa-gift'} aria-hidden="true" />
                  {p.price > 0 ? 'Buy Now' : 'Get Free'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <BuyModal
        product={buying}
        settings={settings}
        onClose={() => setBuying(null)}
        onOrdered={() => {
          setBuying(null)
          navigate('/dashboard/orders')
        }}
      />
    </div>
  )
}

function BuyModal({
  product,
  settings,
  onClose,
  onOrdered
}: {
  product: Product | null
  settings: Record<string, string>
  onClose: () => void
  onOrdered: () => void
}): JSX.Element | null {
  const { session, getIdToken } = useSession()
  const [method, setMethod] = useState<PaymentMethod>('bkash')
  const [trxId, setTrxId] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [couponInput, setCouponInput] = useState('')
  const [coupon, setCoupon] = useState<CouponOk | null>(null)
  const [couponBusy, setCouponBusy] = useState(false)
  const [couponError, setCouponError] = useState<string | null>(null)

  const productId = product?.id ?? null
  useEffect(() => {
    // Fresh state every time a different product's modal opens.
    setTrxId('')
    setError(null)
    setCoupon(null)
    setCouponInput('')
    setCouponError(null)
  }, [productId])

  if (!product) return null

  const number = method === 'bkash' ? settings['bkash_number'] : settings['nagad_number']
  const total = coupon ? coupon.total : Math.max(0, product.price)
  const isFree = total <= 0

  async function applyCoupon(): Promise<void> {
    if (!session || !product) return
    const value = couponInput.trim()
    if (!value) {
      setCouponError('Enter a coupon code.')
      return
    }
    setCouponBusy(true)
    setCouponError(null)
    try {
      const token = await getIdToken()
      if (!token) throw new Error('Session expired — logout and login again.')
      const res = await fetch('/api/coupon-validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code: value, productId: product.id })
      })
      const data = (await res.json()) as Partial<CouponOk> & { ok?: boolean; error?: string }
      if (!res.ok || !data.ok) throw new Error(data.error || 'Invalid coupon.')
      setCoupon({ code: data.code as string, discount: data.discount as number, total: data.total as number })
      setCouponError(null)
    } catch (err) {
      setCoupon(null)
      setCouponError(err instanceof Error ? err.message : 'Could not check the coupon.')
    }
    setCouponBusy(false)
  }

  function removeCoupon(): void {
    setCoupon(null)
    setCouponInput('')
    setCouponError(null)
  }

  async function submit(): Promise<void> {
    if (!session || !product) return
    if (!isFree) {
      if (trxId.trim().length < 6) {
        setError('Enter the TrxID from your payment confirmation SMS.')
        return
      }
      if (!/^[A-Za-z0-9-]{6,64}$/.test(trxId.trim())) {
        setError('TrxID should be 6–64 letters/digits/dashes only (e.g. 9F7A2K1XYZ).')
        return
      }
    }
    setBusy(true)
    setError(null)
    try {
      const token = await getIdToken()
      if (!token) throw new Error('Session expired — logout and login again.')
      const res = await fetch('/api/orders-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          productId: product.id,
          ...(isFree ? {} : { method, trxId: trxId.trim() }),
          ...(coupon ? { couponCode: coupon.code } : {})
        })
      })
      const data = (await res.json()) as { ok?: boolean; error?: string }
      if (!res.ok || !data.ok) throw new Error(data.error || 'Could not submit the order.')
    } catch (err) {
      setBusy(false)
      setError(err instanceof Error ? err.message : 'Could not submit the order.')
      return
    }
    setBusy(false)
    setTrxId('')
    onOrdered()
  }

  return (
    <Modal open title={`Buy — ${product.name}`} onClose={onClose}>
      <div className="rounded-xl bg-slate-50 p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2 text-slate-500">
            <i className="fa-solid fa-tags text-brand-500" aria-hidden="true" />
            Price
          </span>
          <span>
            {coupon && (
              <span className="mr-2 text-sm text-slate-400 line-through">{taka(product.price)}</span>
            )}
            <span className={`text-lg font-extrabold ${isFree ? 'text-emerald-600' : 'text-slate-900'}`}>
              {isFree ? 'Free' : taka(total)}
            </span>
          </span>
        </div>
        {coupon && (
          <div className="mt-1 text-right text-xs font-semibold text-emerald-600">
            <i className="fa-solid fa-ticket mr-1" aria-hidden="true" />
            {coupon.code} — {taka(coupon.discount)} off
          </div>
        )}
      </div>

      {/* Coupon */}
      <div className="mt-4 rounded-xl border border-dashed border-brand-200 bg-brand-50/40 p-3">
        <span className="label">
          <i className="fa-solid fa-ticket mr-1" aria-hidden="true" />
          Have a coupon?
        </span>
        {coupon ? (
          <div className="flex items-center justify-between text-sm">
            <span className="font-bold text-emerald-600">
              <i className="fa-solid fa-circle-check mr-1.5" aria-hidden="true" />
              {coupon.code} applied
            </span>
            <button className="text-xs font-semibold text-slate-500 hover:text-red-600" onClick={removeCoupon}>
              Remove
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              className="input font-mono uppercase"
              placeholder="e.g. SAVE50"
              value={couponInput}
              onChange={(e) => setCouponInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void applyCoupon()
              }}
            />
            <button className="btn-secondary whitespace-nowrap" onClick={() => void applyCoupon()} disabled={couponBusy}>
              <i className={couponBusy ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-check'} aria-hidden="true" />
              {couponBusy ? 'Checking…' : 'Apply'}
            </button>
          </div>
        )}
        {couponError && (
          <p className="mt-2 text-xs text-red-600" role="alert">
            <i className="fa-solid fa-triangle-exclamation mr-1" aria-hidden="true" />
            {couponError}
          </p>
        )}
      </div>

      {isFree ? (
        // Free: no payment method, no TrxID — unlock instantly.
        <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          <div className="font-bold">
            <i className="fa-solid fa-gift mr-1.5" aria-hidden="true" />
            {coupon ? 'Coupon covers the full price — this order is FREE' : 'This tool is FREE'}
          </div>
          <p className="mt-1">
            Payment lagbe na — “Get Free” click korlei order approved hoye jabe, tarpor My Tools theke download
            kore nen.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-5">
            <span className="label">
              <i className="fa-solid fa-wallet mr-1" aria-hidden="true" />
              Pay with
            </span>
            <div className="grid grid-cols-2 gap-3">
              <button
                className={`rounded-xl border px-4 py-3 text-sm font-bold ${
                  method === 'bkash'
                    ? 'border-pink-500 bg-pink-50 text-pink-700'
                    : 'border-slate-200 text-slate-600'
                }`}
                onClick={() => setMethod('bkash')}
              >
                <i className="fa-solid fa-mobile-screen-button mr-1.5" aria-hidden="true" />
                bKash
              </button>
              <button
                className={`rounded-xl border px-4 py-3 text-sm font-bold ${
                  method === 'nagad'
                    ? 'border-orange-500 bg-orange-50 text-orange-700'
                    : 'border-slate-200 text-slate-600'
                }`}
                onClick={() => setMethod('nagad')}
              >
                <i className="fa-solid fa-mobile-screen-button mr-1.5" aria-hidden="true" />
                Nagad
              </button>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-dashed border-slate-300 p-4 text-sm">
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Send Money to</span>
              <span className="font-bold text-slate-900">{number || '— (number not configured)'}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Amount</span>
              <span className="font-bold text-slate-900">{taka(total)}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Reference</span>
              <span className="font-bold text-slate-900">Your email</span>
            </div>
            <p className="mt-2 text-xs text-slate-400">
              <i className="fa-solid fa-circle-info mr-1" aria-hidden="true" />
              Use “Send Money” (not Payment). Approval usually takes 5–30 minutes.
            </p>
          </div>

          <div className="mt-4">
            <label className="label" htmlFor="trx-id">
              <i className="fa-solid fa-receipt mr-1" aria-hidden="true" />
              TrxID
            </label>
            <input
              id="trx-id"
              className="input font-mono"
              placeholder="e.g. 9F7A2K1XYZ"
              value={trxId}
              onChange={(e) => setTrxId(e.target.value)}
            />
          </div>
        </>
      )}

      {error && (
        <div className="mt-3 rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-600" role="alert">
          <i className="fa-solid fa-triangle-exclamation mr-1.5" aria-hidden="true" />
          {error}
        </div>
      )}

      <div className="mt-5 flex justify-end gap-3">
        <button className="btn-secondary" onClick={onClose} disabled={busy}>
          Cancel
        </button>
        <button className="btn-primary" onClick={() => void submit()} disabled={busy}>
          <i
            className={
              busy
                ? 'fa-solid fa-spinner fa-spin'
                : isFree
                  ? 'fa-solid fa-gift'
                  : 'fa-solid fa-circle-check'
            }
            aria-hidden="true"
          />
          {busy ? (isFree ? 'Unlocking…' : 'Submitting…') : isFree ? 'Get Free' : 'I have paid — Submit'}
        </button>
      </div>
    </Modal>
  )
}
