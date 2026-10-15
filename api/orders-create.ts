// POST /api/orders-create   Authorization: Bearer <Firebase ID token>
// body: { productId, method?: 'bkash'|'nagad', trxId?: string, couponCode?: string }
// -> 200 { ok: true, orderId, status, amount, discount, total }
// -> 4xx { code, error }
//
// The price is ALWAYS recomputed server-side (listed price minus a validated
// coupon). When the total reaches 0 — free product or 100% coupon — the order
// is created already-approved with method 'free': no payment, no TrxID, and
// the download gate (/api/download) unlocks immediately.

import { FieldValue } from 'firebase-admin/firestore'
import { adminAuth, adminDb } from './_lib/admin.js'
import { bearerToken, fail, guardMethod, json } from './_lib/http.js'
import { StoreError, codeStateError, parseObject, validateCoupon, type CouponDoc } from './_lib/store.js'

export default async function handler(
  req: Parameters<typeof guardMethod>[0],
  res: Parameters<typeof guardMethod>[1]
): Promise<void> {
  if (guardMethod(req, res, 'POST')) return

  const token = bearerToken(req)
  if (!token) {
    fail(res, 401, 'unauthorized', 'Sign in to place an order.')
    return
  }
  const body = parseObject(req.body)
  const productId = body && typeof body.productId === 'string' ? body.productId.trim() : ''
  if (!body || !productId) {
    fail(res, 400, 'invalid_request', 'Missing product id.')
    return
  }
  const method = typeof body.method === 'string' ? body.method : ''
  const trxId = typeof body.trxId === 'string' ? body.trxId.trim() : ''
  const couponRaw = typeof body.couponCode === 'string' ? body.couponCode : ''

  try {
    const decoded = await adminAuth().verifyIdToken(token)
    const uid = decoded.uid
    const db = adminDb()

    const productSnap = await db.collection('products').doc(productId).get()
    if (!productSnap.exists) {
      fail(res, 404, 'not_found', 'This tool no longer exists.')
      return
    }
    const product = productSnap.data()
    if (!product || product.is_active !== true) {
      fail(res, 400, 'inactive', 'This tool is not on sale right now.')
      return
    }
    const price = Math.max(0, Number(product.price) || 0)
    const product_name = typeof product.name === 'string' && product.name ? product.name : productId

    // Discount — computed here, never trusted from the client.
    let couponCode = ''
    let discount = 0
    let total = price
    if (couponRaw) {
      const check = await validateCoupon(db, couponRaw, price)
      if (!check.ok) {
        fail(res, 400, 'invalid_coupon', check.error)
        return
      }
      couponCode = check.code
      discount = check.discount
      total = check.total
    }

    const isFree = total <= 0
    if (!isFree) {
      if (method !== 'bkash' && method !== 'nagad') {
        fail(res, 400, 'invalid_method', 'Choose bKash or Nagad.')
        return
      }
      if (!/^[A-Za-z0-9-]{6,64}$/.test(trxId)) {
        fail(res, 400, 'invalid_trx', 'TrxID should be 6–64 letters/digits/dashes only (e.g. 9F7A2K1XYZ).')
        return
      }
    }

    const order: Record<string, unknown> = {
      user_id: uid,
      product_id: productId,
      product_name,
      amount: isFree ? 0 : total,
      method: isFree ? 'free' : method,
      trx_id: isFree ? '' : trxId,
      status: isFree ? 'approved' : 'pending',
      created_at: new Date().toISOString()
    }
    if (couponCode) {
      order.coupon_code = couponCode
      order.original_price = price
      order.discount = discount
    }

    let orderId = ''
    if (couponCode) {
      // Atomic: re-check the remaining uses and count this one with the write.
      const couponRef = db.collection('coupons').doc(couponCode)
      await db.runTransaction(async (txn) => {
        const snap = await txn.get(couponRef)
        if (!snap.exists) throw new StoreError('Coupon not found — check the spelling.')
        const problem = codeStateError(snap.data() as CouponDoc)
        if (problem) throw new StoreError(problem)
        const orderRef = db.collection('orders').doc()
        txn.set(orderRef, order)
        txn.update(couponRef, { used_count: FieldValue.increment(1) })
        orderId = orderRef.id
      })
    } else {
      orderId = (await db.collection('orders').add(order)).id
    }

    json(res, { ok: true, orderId, status: order.status, amount: order.amount, discount, total })
  } catch (err) {
    if (!res.writableEnded) {
      if (err instanceof StoreError) fail(res, 400, 'invalid_coupon', err.message)
      else fail(res, 500, 'server_error', 'Could not create the order — try again.')
    }
  }
}
