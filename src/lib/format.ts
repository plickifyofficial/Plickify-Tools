/** Bangladeshi Taka formatting used across the site. */
export function taka(amount: number): string {
  return `৳${amount.toLocaleString('en-US')}`
}

export function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function maskKey(key: string): string {
  if (key.length <= 10) return key
  return `${key.slice(0, 8)}-${'•'.repeat(8)}-${key.slice(-4)}`
}

/** Copy helper that works without a secure context fallback. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

/** Random license-style key: FAMX-XXXX-XXXX-XXXX. */
export function randomLicenseKey(prefix = 'FAM'): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = new Uint8Array(12)
  crypto.getRandomValues(bytes)
  const groups: string[] = []
  for (let g = 0; g < 3; g++) {
    let s = ''
    for (let i = 0; i < 4; i++) s += alphabet[bytes[g * 4 + i] % alphabet.length]
    groups.push(s)
  }
  return `${prefix}-${groups.join('-')}`
}
