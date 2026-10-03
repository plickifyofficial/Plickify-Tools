// POST /functions/v1/license-deactivate   { token, deviceId }
// -> 200 { ok: true } | 4xx { error, code }
//
// Frees this device's seat so the license can be activated on another PC.

import {
  adminClient,
  corsHeaders,
  fail,
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
  if (!verified.ok) {
    // Without a valid signature we cannot know the license id, so there is
    // nothing safe to delete — the user must activate again (or ask an admin).
    return fail(verified.status, verified.code, verified.error)
  }

  const { lid, did } = verified.payload
  if (did !== body.deviceId) {
    return fail(401, 'invalid_token', 'Token does not belong to this device.')
  }

  try {
    const db = adminClient()
    await db.from('license_devices').delete().eq('license_id', lid).eq('device_id', did)
    return json({ ok: true })
  } catch {
    return fail(500, 'server_error', 'Deactivation server error. Try again later.')
  }
})
