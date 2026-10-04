// POST /functions/v1/license-validate   { token, deviceId }
// -> 200 { graceDays } | 4xx { error, code }
//
// Called by the app at least once per 24h while it runs. Network failures on
// the app side are NOT rejections — the offline grace window covers them.

import { adminDb } from './_lib/admin'
import { fail, guardMethod, json, parseBody, type ApiReq, type ApiRes } from './_lib/http'
import { deviceIdFor, GRACE_DAYS, verifyToken } from './_lib/license'

export default async function handler(req: ApiReq, res: ApiRes): Promise<void> {
  if (guardMethod(req, res, 'POST')) return

  const body = parseBody(req.body, ['token', 'deviceId'])
  if (!body) {
    fail(res, 400, 'invalid_request', 'Missing token or deviceId.')
    return
  }

  const verified = await verifyToken(body.token)
  if (!verified.ok) {
    fail(res, verified.status, verified.code, verified.error)
    return
  }

  const { lid, did } = verified.payload
  if (did !== body.deviceId) {
    fail(res, 401, 'invalid_token', 'Token does not belong to this device.')
    return
  }

  try {
    const db = adminDb()

    const licDoc = await db.collection('licenses').doc(lid).get()
    if (!licDoc.exists) {
      fail(res, 404, 'not_found', 'License no longer exists.')
      return
    }
    const license = licDoc.data()
    if (!license) {
      fail(res, 404, 'not_found', 'License no longer exists.')
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

    const deviceRef = db.collection('license_devices').doc(deviceIdFor(lid, did))
    const deviceSnap = await deviceRef.get()
    const device = deviceSnap.exists ? deviceSnap.data() : null
    if (!device || device.revoked) {
      fail(res, 403, 'device_revoked', 'This device is no longer authorized. Activate again.')
      return
    }

    await deviceRef.update({ last_seen_at: new Date().toISOString() })

    json(res, { graceDays: GRACE_DAYS })
  } catch {
    if (!res.writableEnded) fail(res, 500, 'server_error', 'Validation server error. Try again later.')
  }
}
