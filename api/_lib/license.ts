/**
 * Shared license-token helpers for the Vercel activation functions
 * (Node port of the old Supabase edge-function code).
 *
 * Token format: base64url(JSON payload) "." base64url(HMAC-SHA256 signature)
 * Payload: { lid: license id, did: device id, exp: unix seconds }
 *
 * Required secret (once):  Vercel env LICENSE_TOKEN_SECRET=<long random string>
 */
import { createHmac, timingSafeEqual } from 'node:crypto'

/** Offline grace the app gets when the server cannot be reached. */
export const GRACE_DAYS = 7
/** Token lifetime — the app revalidates daily, so 90 days gives ample margin. */
export const TOKEN_TTL_SECONDS = 90 * 24 * 60 * 60

/** PFT-XXXX-XXXX-XXXX (uppercase, Crockford-ish alphabet). */
export const KEY_PATTERN = /^PFT-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/
/** Machine-generated device identifier. */
export const DEVICE_PATTERN = /^[A-Za-z0-9_-]{8,128}$/

export interface TokenPayload {
  lid: string
  did: string
  exp: number
}

export type VerifyResult =
  | { ok: true; payload: TokenPayload }
  | { ok: false; status: number; code: string; error: string }

function hmacKey(): Buffer {
  const secret = process.env.LICENSE_TOKEN_SECRET
  if (!secret) throw new Error('LICENSE_TOKEN_SECRET not set')
  return Buffer.from(secret, 'utf8')
}

export function signToken(payload: TokenPayload): string {
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
  const sig = createHmac('sha256', hmacKey()).update(body).digest('base64url')
  return `${body}.${sig}`
}

export function verifyToken(token: string): VerifyResult {
  const parts = token.split('.')
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return { ok: false, status: 401, code: 'invalid_token', error: 'Malformed token.' }
  }
  let expected: Buffer
  try {
    expected = createHmac('sha256', hmacKey()).update(parts[0]).digest()
  } catch {
    return { ok: false, status: 500, code: 'server_misconfigured', error: 'Activation server is not configured.' }
  }
  let given: Buffer
  try {
    given = Buffer.from(parts[1], 'base64url')
  } catch {
    given = Buffer.alloc(0)
  }
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return { ok: false, status: 401, code: 'invalid_token', error: 'Token signature is invalid.' }
  }
  let payload: TokenPayload
  try {
    payload = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8')) as TokenPayload
    if (typeof payload.lid !== 'string' || typeof payload.did !== 'string' || typeof payload.exp !== 'number') {
      throw new Error('bad shape')
    }
  } catch {
    return { ok: false, status: 401, code: 'invalid_token', error: 'Token payload is invalid.' }
  }
  if (payload.exp * 1000 < Date.now()) {
    return {
      ok: false,
      status: 401,
      code: 'token_expired',
      error: 'Token expired — activate again with your license key.'
    }
  }
  return { ok: true, payload }
}

/** Deterministic device-doc id: license ids are alphanumeric, so no ambiguity. */
export function deviceIdFor(licenseId: string, deviceId: string): string {
  return `${licenseId}__${deviceId}`
}
