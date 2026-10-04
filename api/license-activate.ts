// POST /functions/v1/license-activate   { licenseKey, deviceId }
// -> 200 { token, label, graceDays } | 4xx { error, code }
//
// Vercel rewrite maps the app's old Supabase-style URL onto this function, so
// the desktop app needs no changes.

import { adminDb } from './_lib/admin'
import { fail, guardMethod, json, parseBody, type ApiReq, type ApiRes } from './_lib/http'
import {
  deviceIdFor,
  DEVICE_PATTERN,
  GRACE_DAYS,
  KEY_PATTERN,
  signToken,
  TOKEN_TTL_SECONDS
} from './_lib/license'

export default async function handler(req: ApiReq, res: ApiRes): Promise<void> {
  if (guardMethod(req, res, 'POST')) return

  const body = parseBody(req.body, ['licenseKey', 'deviceId'])
  if (!body) {
    fail(res, 400, 'invalid_request', 'Missing licenseKey or deviceId.')
    return
  }

  const key = body.licenseKey.toUpperCase()
  const deviceId = body.deviceId
  if (!KEY_PATTERN.test(key)) {
    fail(res, 404, 'not_found', 'License key not found. Check the key or contact support.')
    return
  }
  if (!DEVICE_PATTERN.test(deviceId)) {
    fail(res, 400, 'invalid_request', 'Invalid device identifier.')
    return
  }

  try {
    const db = adminDb()

    const licSnap = await db.collection('licenses').where('key', '==', key).limit(1).get()
    const licDoc = licSnap.docs[0]
    const license = licDoc?.data()
    if (!licDoc || !license) {
      fail(res, 404, 'not_found', 'License key not found. Check the key or contact support.')
      return
    }
    if (license.status !== 'active') {
      fail(res, 403, 'revoked', 'This license has been revoked by the administrator.')
      return
    }
    if (license.expires_at && new Date(license.expires_at as string).getTime() < Date.now()) {
      fail(res, 403, 'expired', 'This license has expired. Contact support to renew.')
      return
    }

    const deviceRef = db.collection('license_devices').doc(deviceIdFor(licDoc.id, deviceId))
    const now = new Date().toISOString()
    const maxDevices = (license.max_devices as number | undefined) ?? 1

    // Transaction: refresh this device's seat, or register a new one — racing
    // activations of the same license stay consistent.
    try {
      await db.runTransaction(async (tx) => {
        const deviceSnap = await tx.get(deviceRef)
        const deviceData = deviceSnap.exists ? deviceSnap.data() : undefined
        if (deviceData) {
          if (deviceData.revoked) throw Object.assign(new Error('device_revoked'), { code: 'device_revoked' })
          tx.update(deviceRef, { last_seen_at: now })
          return
        }
        const activeSnap = await tx.get(
          db.collection('license_devices').where('license_id', '==', licDoc.id).where('revoked', '==', false)
        )
        if (activeSnap.size >= maxDevices) {
          throw Object.assign(new Error('device_limit'), { code: 'device_limit' })
        }
        tx.set(deviceRef, {
          license_id: licDoc.id,
          device_id: deviceId,
          user_id: (license.user_id as string | undefined) ?? '',
          first_seen_at: now,
          last_seen_at: now,
          revoked: false
        })
      })
    } catch (err) {
      const code = (err as { code?: string }).code
      if (code === 'device_revoked') {
        fail(res, 403, 'device_revoked', 'This device was revoked. Contact support if this is a mistake.')
        return
      }
      if (code === 'device_limit') {
        fail(
          res,
          403,
          'device_limit',
          `Device limit reached (${maxDevices}). Use Deactivate in the app's Settings on the old device first.`
        )
        return
      }
      throw err
    }

    const token = signToken({
      lid: licDoc.id,
      did: deviceId,
      exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS
    })
    json(res, { token, label: license.label, graceDays: GRACE_DAYS })
  } catch {
    fail(res, 500, 'server_error', 'Activation server error. Try again later.')
  }
}
