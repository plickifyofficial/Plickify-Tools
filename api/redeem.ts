// POST /api/redeem   Authorization: Bearer <Firebase ID token>
// body: { code }
// -> 200 { ok: true, license_key, product_name, product_id, order_id }
// -> 4xx { code, error }
//
// Redeem code → free license, no payment anywhere:
//   • validates the code (active / expiry / remaining uses)
//   • issues an active license (max 2 devices, same shape as admin-issued)
//   • creates an already-approved ৳0 order so My Tools / download unlock
//   • bumps used_count atomically (one transaction, no double redemption)

import { FieldValue } from 'firebase-admin/firestore'
import { adminAuth, adminDb } from './_lib/admin.js'
import { bearerToken, fail, guardMethod, json } from './_lib/http.js'
import {
  StoreError,
  codeStateError,
  normalizeCode,
  parseObject,
  randomLicenseKey,
  type CodeDoc
} from './_lib/store.js'

export default async function handler(
  req: Parameters<typeof guardMethod>[0],
  res: Parameters<typeof guardMethod>[1]
): Promise<void> {
  if (guardMethod(req, res, 'POST')) return

  const token = bearerToken(req)
  if (!token) {
    fail(res, 401, 'unauthorized', 'Sign in to redeem a code.')
    return
  }
  const body = parseObject(req.body)
  const rawCode = body && typeof body.code === 'string' ? body.code : ''
  const code = normalizeCode(rawCode)
  if (!code) {
    fail(res, 400, 'invalid_request', 'Enter a redeem code.')
    return
  }

  try {
    const decoded = await adminAuth().verifyIdToken(token)
    const uid = decoded.uid
    const db = adminDb()
    const codeRef = db.collection('redeem_codes').doc(code)

    const codeSnap = await codeRef.get()
    if (!codeSnap.exists) {
      fail(res, 404, 'not_found', 'Redeem code not found — check the spelling.')
      return
    }
    const rc = codeSnap.data() as CodeDoc
    const problem = codeStateError(rc)
    if (problem) {
      fail(res, 400, 'invalid_code', problem)
      return
    }

    const productId = typeof rc.product_id === 'string' ? (rc.product_id as string) : ''
    if (!productId) {
      fail(res, 400, 'invalid_code', 'This code is not linked to a tool — contact support.')
      return
    }

    const productSnap = await db.collection('products').doc(productId).get()
    if (!productSnap.exists) {
      fail(res, 404, 'not_found', 'The tool behind this code no longer exists.')
      return
    }
    const product = productSnap.data()
    if (!product || product.is_active !== true) {
      fail(res, 400, 'inactive', 'This tool is not available right now.')
      return
    }
    const product_name = typeof product.name === 'string' && product.name ? product.name : productId

    // One active license per user per tool — no double redemptions.
    const existing = await db
      .collection('licenses')
      .where('user_id', '==', uid)
      .where('product_id', '==', productId)
      .where('status', '==', 'active')
      .limit(1)
      .get()
    if (!existing.empty) {
      fail(res, 400, 'already_redeemed', 'You already have this tool — check My License / My Tools.')
      return
    }

    // Unique key (clash chance ≈ 0; loop kept identical to the admin UI).
    let key = randomLicenseKey()
    for (let attempt = 0; attempt < 5; attempt++) {
      const clash = await db.collection('licenses').where('key', '==', key).limit(1).get()
      if (clash.empty) break
      key = randomLicenseKey()
    }

    const created = await db.runTransaction(async (txn) => {
      const snap = await txn.get(codeRef)
      if (!snap.exists) throw new StoreError('Redeem code not found — check the spelling.')
      const problem = codeStateError(snap.data() as CodeDoc)
      if (problem) throw new StoreError(problem)

      const now = new Date().toISOString()
      const licenseRef = db.collection('licenses').doc()
      txn.set(licenseRef, {
        user_id: uid,
        product_id: productId,
        label: product_name,
        key,
        status: 'active',
        max_devices: 2,
        expires_at: null,
        created_at: now
      })
      const orderRef = db.collection('orders').doc()
      txn.set(orderRef, {
        user_id: uid,
        product_id: productId,
        product_name,
        amount: 0,
        method: 'free',
        trx_id: '',
        status: 'approved',
        redeem_code: code,
        created_at: now
      })
      txn.update(codeRef, { used_count: FieldValue.increment(1) })
      return { licenseId: licenseRef.id, orderId: orderRef.id }
    })

    json(res, {
      ok: true,
      license_key: key,
      product_name,
      product_id: productId,
      order_id: created.orderId
    })
  } catch (err) {
    if (!res.writableEnded) {
      if (err instanceof StoreError) fail(res, 400, 'invalid_code', err.message)
      else fail(res, 500, 'server_error', 'Redeem failed — try again.')
    }
  }
}
