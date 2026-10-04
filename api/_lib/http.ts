/**
 * Minimal request/response types + JSON/CORS helpers shared by the Vercel
 * serverless functions in api/. Dependency-free so the functions bundle small.
 *
 * Response shapes match the old Supabase edge functions exactly, so the
 * desktop app's activation client keeps working unchanged:
 *   200 {token,label,graceDays} / {graceDays} / {ok:true}   on success
 *   4xx {code, error}                                       on failure
 */

export interface ApiReq {
  method?: string
  /** Parsed by Vercel when Content-Type is application/json. */
  body?: unknown
  query?: Record<string, string | string[] | undefined>
  headers: Record<string, string | string[] | undefined>
}

export interface ApiRes {
  status(code: number): ApiRes
  json(body: unknown): unknown
  setHeader(name: string, value: string): unknown
  /** True once a response has been sent (avoids double replies). */
  readonly writableEnded: boolean
}

export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
}

/** Apply CORS headers to every response. */
export function withCors(res: ApiRes): ApiRes {
  for (const [name, value] of Object.entries(corsHeaders)) res.setHeader(name, value)
  return res
}

export function json(res: ApiRes, body: unknown, status = 200): void {
  withCors(res).status(status).json(body)
}

export function fail(res: ApiRes, status: number, code: string, error: string): void {
  json(res, { code, error }, status)
}

/**
 * Handle OPTIONS preflight / reject wrong methods.
 * Returns true when the request is fully handled and the caller should return.
 */
export function guardMethod(req: ApiReq, res: ApiRes, method: 'POST' | 'GET'): boolean {
  withCors(res)
  if (req.method === 'OPTIONS') {
    res.status(204).json({})
    return true
  }
  if (req.method !== method) {
    fail(res, 405, 'method_not_allowed', `Use ${method}.`)
    return true
  }
  return false
}

/**
 * Shape + format checks shared by the functions (same rules as before):
 * every requested field must be a non-empty trimmed string of ≤ 200 chars.
 * Accepts an already-parsed object (Vercel parses JSON bodies) or a raw
 * JSON string.
 */
export function parseBody(raw: unknown, fields: string[]): Record<string, string> | null {
  let obj: Record<string, unknown>
  if (typeof raw === 'string') {
    try {
      obj = JSON.parse(raw) as Record<string, unknown>
    } catch {
      return null
    }
  } else if (raw && typeof raw === 'object') {
    obj = raw as Record<string, unknown>
  } else {
    return null
  }
  const out: Record<string, string> = {}
  for (const field of fields) {
    const value = obj[field]
    if (typeof value !== 'string' || !value.trim() || value.length > 200) return null
    out[field] = value.trim()
  }
  return out
}

/** First query param as a trimmed string, or null. */
export function queryString(req: ApiReq, name: string): string | null {
  const raw = req.query?.[name]
  const value = Array.isArray(raw) ? raw[0] : raw
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

/** Bearer token from the Authorization header (Firebase ID token). */
export function bearerToken(req: ApiReq): string | null {
  const raw = req.headers.authorization
  const value = Array.isArray(raw) ? raw[0] : raw
  if (typeof value !== 'string') return null
  const match = /^Bearer\s+(.+)$/i.exec(value.trim())
  return match ? match[1].trim() : null
}
