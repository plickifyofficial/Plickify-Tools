// POST /functions/v1/license-activate   { licenseKey, deviceId }
// -> 200 { token, label, graceDays } | 4xx { error, code }

import {
  adminClient,
  corsHeaders,
  fail,
  GRACE_DAYS,
  json,
  parseBody,
  signToken,
  TOKEN_TTL_SECONDS
} from '../_shared/license.ts'

const KEY_PATTERN = /^PFT-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/
const DEVICE_PATTERN = /^[A-Za-z0-9_-]{8,128}$/

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return fail(405, 'method_not_allowed', 'Use POST.')

  const body = parseBody(await req.text(), ['licenseKey', 'deviceId'])
  if (!body) return fail(400, 'invalid_request', 'Missing licenseKey or deviceId.')

  const key = body.licenseKey.toUpperCase()
  const deviceId = body.deviceId
  if (!KEY_PATTERN.test(key)) {
    return fail(400, 'not_found', 'License key not found. Check the key or contact support.')
  }
  if (!DEVICE_PATTERN.test(deviceId)) {
    return fail(400, 'invalid_request', 'Invalid device identifier.')
  }

  try {
    const db = adminClient()

    const { data: license, error: licenseError } = await db
      .from('licenses')
      .select('id, label, status, max_devices, expires_at')
      .eq('key', key)
      .maybeSingle()

    if (licenseError) return fail(500, 'server_error', 'Could not reach the license database.')
    if (!license) {
      return fail(404, 'not_found', 'License key not found. Check the key or contact support.')
    }
    if (license.status !== 'active') {
      return fail(403, 'revoked', 'This license has been revoked by the administrator.')
    }
    if (license.expires_at && new Date(license.expires_at).getTime() < Date.now()) {
      return fail(403, 'expired', 'This license has expired. Contact support to renew.')
    }

    const { data: device, error: deviceError } = await db
      .from('license_devices')
      .select('id, revoked')
      .eq('license_id', license.id)
      .eq('device_id', deviceId)
      .maybeSingle()

    if (deviceError) return fail(500, 'server_error', 'Could not check registered devices.')

    if (device?.revoked) {
      return fail(403, 'device_revoked', 'This device was revoked. Contact support if this is a mistake.')
    }

    if (!device) {
      const { count, error: countError } = await db
        .from('license_devices')
        .select('id', { count: 'exact', head: true })
        .eq('license_id', license.id)
        .eq('revoked', false)
      if (countError) return fail(500, 'server_error', 'Could not count registered devices.')
      if ((count ?? 0) >= license.max_devices) {
        return fail(
          403,
          'device_limit',
          `Device limit reached (${license.max_devices}). Use Deactivate in the app's Settings on the old device first.`
        )
      }
      const { error: insertError } = await db.from('license_devices').insert({
        license_id: license.id,
        device_id: deviceId
      })
      // 23505 = race with a concurrent activation of the same device; re-read is fine.
      if (insertError && insertError.code !== '23505') {
        return fail(500, 'server_error', 'Could not register this device.')
      }
    } else {
      await db
        .from('license_devices')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('id', device.id)
    }

    const token = await signToken({
      lid: license.id,
      did: deviceId,
      exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS
    })

    return json({ token, label: license.label, graceDays: GRACE_DAYS })
  } catch {
    return fail(500, 'server_error', 'Activation server error. Try again later.')
  }
})
