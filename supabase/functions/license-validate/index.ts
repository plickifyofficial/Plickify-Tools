// POST /functions/v1/license-validate   { token, deviceId }
// -> 200 { graceDays } | 4xx { error, code }
//
// Called by the app at least once per 24h while it runs. Network failures on
// the app side are NOT rejections — the offline grace window covers them.

import {
  adminClient,
  corsHeaders,
  fail,
  GRACE_DAYS,
  json,
  parseBody,
  verifyToken
} from '../_shared/license.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return fail(405, 'method_not_allowed', 'Use POST.')

  const body = parseBody(await req.text(), ['token', 'deviceId'])
  if (!body) return fail(400, 'invalid_request', 'Missing token or deviceId.')

  const verified = await verifyToken(body.token)
  if (!verified.ok) return fail(verified.status, verified.code, verified.error)

  const { lid, did } = verified.payload
  if (did !== body.deviceId) {
    return fail(401, 'invalid_token', 'Token does not belong to this device.')
  }

  try {
    const db = adminClient()

    const { data: license, error: licenseError } = await db
      .from('licenses')
      .select('id, label, status, expires_at')
      .eq('id', lid)
      .maybeSingle()

    if (licenseError) return fail(500, 'server_error', 'Could not reach the license database.')
    if (!license) return fail(404, 'not_found', 'License no longer exists.')
    if (license.status !== 'active') {
      return fail(403, 'revoked', 'This license has been revoked by the administrator.')
    }
    if (license.expires_at && new Date(license.expires_at).getTime() < Date.now()) {
      return fail(403, 'expired', 'This license has expired. Contact support to renew.')
    }

    const { data: device, error: deviceError } = await db
      .from('license_devices')
      .select('id, revoked')
      .eq('license_id', lid)
      .eq('device_id', did)
      .maybeSingle()

    if (deviceError) return fail(500, 'server_error', 'Could not check this device.')
    if (!device || device.revoked) {
      return fail(403, 'device_revoked', 'This device is no longer authorized. Activate again.')
    }

    await db
      .from('license_devices')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('id', device.id)

    return json({ graceDays: GRACE_DAYS })
  } catch {
    return fail(500, 'server_error', 'Validation server error. Try again later.')
  }
})
