/**
 * Store-side helpers shared by the coupon / order / redeem functions:
 * code normalization, validation and server-side random code generation.
 *
 * Server-only — these run inside api/ with the Admin SDK (which bypasses
 * Firestore rules). Never import this file from src/.
 */
import { randomInt } from 'node:crypto'
import type { Firestore } from 'firebase-admin/firestore'

/** User-fixable promo problem (mapped to HTTP 400 by the callers). */
export class StoreError extends Error {}

/** Fields shared by coupons and redeem codes. */
export interface CodeDoc {
  active: boolean
  /** ISO timestamp (end of expiry day, Asia/Dhaka) or null = never. */
  expires_at?: string | null
  /** 0 = unlimited uses. */
  max_uses: number
  used_count: number
}

export interface CouponDoc extends CodeDoc {
  code: string
  type: 'percent' | 'fixed'
  value: number
}

/** Uppercase, space-free — doc ids are the normalized code. */
export function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, '')
}

/** Parsed JSON body as an object, or null when malformed. */
export function parseObject(raw: unknown): Record<string, unknown> | null {
  let value = raw
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value) as unknown
    } catch {
      return null
    }
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>
  return null
}

/** Disabled / expired / out of uses? Returns a user-facing message or null. */
export function codeStateError(code: CodeDoc): string | null {
  if (!code.active) return 'This code is disabled.'
  if (code.expires_at && Date.parse(code.expires_at) < Date.now()) return 'This code has expired.'
  if (code.max_uses > 0 && code.used_count >= code.max_uses) return 'This code has been fully used.'
  return null
}

/** Discount in taka for a coupon against a price (never exceeds the price). */
export function discountFor(coupon: CouponDoc, price: number): number {
  const raw =
    coupon.type === 'percent'
      ? Math.round((price * Number(coupon.value)) / 100)
      : Math.round(Number(coupon.value))
  if (!Number.isFinite(raw) || raw <= 0) return 0
  return Math.min(raw, price)
}

export type CouponResult =
  | { ok: true; code: string; discount: number; total: number }
  | { ok: false; error: string }

/** Look up + validate a coupon for a given price (never throws). */
export async function validateCoupon(db: Firestore, rawCode: string, price: number): Promise<CouponResult> {
  const code = normalizeCode(rawCode)
  if (!code) return { ok: false, error: 'Enter a coupon code.' }
  const snap = await db.collection('coupons').doc(code).get()
  if (!snap.exists) return { ok: false, error: 'Coupon not found — check the spelling.' }
  const coupon = snap.data() as CouponDoc
  const problem = codeStateError(coupon)
  if (problem) return { ok: false, error: problem }
  const discount = discountFor(coupon, price)
  return { ok: true, code, discount, total: Math.max(0, price - discount) }
}

/** PFT-XXXX-XXXX-XXXX-XXXX — same alphabet as KEY_PATTERN (api/_lib/license.ts). */
export function randomLicenseKey(prefix = 'PFT'): string {
  return `${prefix}-${randomGroups(4)}`
}

/** XXXX-XXXX-XXXX gift-card style code. */
export function randomPromoCode(): string {
  return randomGroups(3)
}

function randomGroups(count: number): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const groups: string[] = []
  for (let g = 0; g < count; g++) {
    let group = ''
    for (let i = 0; i < 4; i++) group += alphabet[randomInt(alphabet.length)]
    groups.push(group)
  }
  return groups.join('-')
}
