// POST /api/coupon-validate   Authorization: Bearer <Firebase ID token>
// body: { code, productId }
// -> 200 { ok: true, code, price, discount, total }
// -> 4xx { code, error }
//
// Server-side coupon check: the discount is computed here from the product's
// real price, so the client never decides how much to pay.

import { adminAuth, adminDb } from './_lib/admin.js'
import { bearerToken, fail, guardMethod, json } from './_lib/http.js'
import { parseObject, validateCoupon } from './_lib/store.js'

export default async function handler(req: Parameters<typeof guardMethod>[0], res: Parameters<typeof guardMethod>[1]): Promise<void> {
  if (guardMethod(req, res, 'POST')) return

  const token = bearerToken(req)
  if (!token) {
    fail(res, 401, 'unauthorized', 'Sign in to use coupons.')
    return
  }
  const body = parseObject(req.body)
  const code = body && typeof body.code === 'string' ? body.code : ''
  const productId = body && typeof body.productId === 'string' ? body.productId.trim() : ''
  if (!body || !code || !productId) {
    fail(res, 400, 'invalid_request', 'Missing coupon code or product.')
    return
  }

  try {
    await adminAuth().verifyIdToken(token)
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

    const result = await validateCoupon(db, code, price)
    if (!result.ok) {
      fail(res, 400, 'invalid_coupon', result.error)
      return
    }
    json(res, { ok: true, code: result.code, price, discount: result.discount, total: result.total })
  } catch {
    if (!res.writableEnded) fail(res, 500, 'server_error', 'Coupon check failed — try again.')
  }
}
