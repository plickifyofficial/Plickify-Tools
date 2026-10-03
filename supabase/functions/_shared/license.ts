// Shared helpers for the license edge functions (HMAC tokens + Supabase admin client).
//
// Token format: base64url(JSON payload) "." base64url(HMAC-SHA256 signature)
// Payload: { lid: license id, did: device id, exp: unix seconds }
//
// Required secret (once):  supabase secrets set LICENSE_TOKEN_SECRET=<long random string>

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'

/** Offline grace the app gets when the server cannot be reached. */
export const GRACE_DAYS = 7
/** Token lifetime — the app revalidates daily, so 90 days gives ample margin. */
export const TOKEN_TTL_SECONDS = 90 * 24 * 60 * 60

export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

export interface TokenPayload {
  lid: string
  did: string
  exp: number
}

export type VerifyResult =
  | { ok: true; payload: TokenPayload }
  | { ok: false; status: number; code: string; error: string }

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  })
}

export function fail(status: number, code: string, error: string): Response {
  return json({ code, error }, status)
}

/** Service-role client (bypasses RLS) — only ever used inside these functions. */
export function adminClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !serviceKey) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set')
  return createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
}

function b64urlEncode(bytes: Uint8Array): string {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function b64urlDecode(text: string): Uint8Array {
  const padded = text.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (text.length % 4)) % 4)
  const bin = atob(padded)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

async function hmacKey(): Promise<CryptoKey> {
  const secret = Deno.env.get('LICENSE_TOKEN_SECRET')
  if (!secret) throw new Error('LICENSE_TOKEN_SECRET not set')
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  )
}

export async function signToken(payload: TokenPayload): Promise<string> {
  const body = b64urlEncode(new TextEncoder().encode(JSON.stringify(payload)))
  const key = await hmacKey()
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body))
  return `${body}.${b64urlEncode(new Uint8Array(sig))}`
}

export async function verifyToken(token: string): Promise<VerifyResult> {
  const parts = token.split('.')
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return { ok: false, status: 401, code: 'invalid_token', error: 'Malformed token.' }
  }
  let key: CryptoKey
  try {
    key = await hmacKey()
  } catch {
    return { ok: false, status: 500, code: 'server_misconfigured', error: 'Activation server is not configured.' }
  }
  let valid: boolean
  try {
    valid = await crypto.subtle.verify('HMAC', key, b64urlDecode(parts[1]), new TextEncoder().encode(parts[0]))
  } catch {
    valid = false
  }
  if (!valid) {
    return { ok: false, status: 401, code: 'invalid_token', error: 'Token signature is invalid.' }
  }
  let payload: TokenPayload
  try {
    payload = JSON.parse(new TextDecoder().decode(b64urlDecode(parts[0]))) as TokenPayload
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

/** Shape + format checks shared by the functions. */
export function parseBody(
  text: string,
  fields: string[]
): Record<string, string> | null {
  try {
    const raw = JSON.parse(text) as Record<string, unknown>
    const out: Record<string, string> = {}
    for (const field of fields) {
      const value = raw[field]
      if (typeof value !== 'string' || !value.trim() || value.length > 200) return null
      out[field] = value.trim()
    }
    return out
  } catch {
    return null
  }
}
