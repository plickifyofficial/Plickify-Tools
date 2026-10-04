// POST /functions/v1/license-deactivate   { token, deviceId }
// -> 200 { ok: true } | 4xx { error, code }
//
// Frees this device's seat so the license can be activated on another PC.

import { adminDb } from './_lib/admin'
import { fail, guardMethod, json, parseBody, type ApiReq, type ApiRes } from './_lib/http'
import { deviceIdFor, verifyToken } from './_lib/license'

export default async function handler(req: ApiReq, res: ApiRes): Promise<void> {
  if (guardMethod(req, res, 'POST')) return

  const body = parseBody(req.body, ['token', 'deviceId'])
  if (!body) {
    fail(res, 400, 'invalid_request', 'Missing token or deviceId.')
    return
  }

  const verified = await verifyToken(body.token)
  if (!verified.ok) {
    // Without a valid signature we cannot know the license id, so there is
    // nothing safe to delete — the user must activate again (or ask an admin).
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
    await db.collection('license_devices').doc(deviceIdFor(lid, did)).delete()
    json(res, { ok: true })
  } catch {
    if (!res.writableEnded) fail(res, 500, 'server_error', 'Deactivation server error. Try again later.')
  }
}
