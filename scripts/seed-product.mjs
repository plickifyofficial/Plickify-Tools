#!/usr/bin/env node
/**
 * Seed / update a product in Firestore using the Admin SDK (bypasses security
 * rules — keep the service-account file private).
 *
 * Usage:
 *   node scripts/seed-product.mjs                     # upsert PRODUCT below
 *   node scripts/seed-product.mjs --url https://...   # also set download URL
 *   node scripts/seed-product.mjs --price 799         # override price
 *   node scripts/seed-product.mjs --key ../other.json # other service account
 *   node scripts/seed-product.mjs --dry-run           # print, don't write
 *
 * Safe to re-run: the product doc is upserted by its id below; existing
 * download_count / created_at are preserved.
 *
 * Credentials: `--key <file>`, else `FIREBASE_SERVICE_ACCOUNT_KEY` (path or
 * raw JSON), else `.service-account.json` in this folder, else ADC.
 */
import { existsSync, readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { initializeApp, applicationDefault, cert } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

// ─── Product content (edit freely, then re-run) ─────────────────────────────
const PRODUCT = {
  id: 'firefox-automation-manager', // Firestore doc id (keep stable)
  name: 'Firefox Automation Manager',
  slug: 'firefox-automation-manager',
  category: 'Automation',
  price: 999,
  original_price: 1499, // null = no strikethrough price
  version: '1.0.0',
  description:
    'Manage hundreds of Firefox profiles from one dashboard — each profile opens its own window with 3 tabs, ' +
    'controlled with Start / Stop / Pause / Resume and live logs. Default neon tabs and link presets included. ' +
    'One-time purchase, license activation for up to 2 devices, lifetime updates.',
  is_active: true
}

// ─── CLI ────────────────────────────────────────────────────────────────────
function arg(name) {
  const i = process.argv.indexOf(`--${name}`)
  return i > -1 ? process.argv[i + 1] : undefined
}
const dryRun = process.argv.includes('--dry-run')
const fileUrl = arg('url') ?? ''
const price = arg('price') ? Number(arg('price')) : undefined
if (price !== undefined && !Number.isFinite(price)) {
  console.error('--price must be a number')
  process.exit(1)
}

// ─── Credentials ────────────────────────────────────────────────────────────
const here = dirname(fileURLToPath(import.meta.url))
const keyPath = arg('key') ?? resolve(here, '..', '.service-account.json')
const inlineKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY

let credentials
if (inlineKey && inlineKey.trim().startsWith('{')) {
  credentials = cert(JSON.parse(inlineKey))
} else if (existsSync(inlineKey ?? '')) {
  credentials = cert(JSON.parse(readFileSync(inlineKey, 'utf8')))
} else if (existsSync(keyPath)) {
  credentials = cert(JSON.parse(readFileSync(keyPath, 'utf8')))
} else {
  console.error(
    `No service-account credentials found.\n` +
      `  Looked for: --key <file>, FIREBASE_SERVICE_ACCOUNT_KEY, ${keyPath}\n` +
      `  Download it: Firebase console → Project settings → Service accounts`
  )
  process.exit(1)
}

const app = initializeApp({ credential: credentials, projectId: 'plickify-official' })
const db = getFirestore(app)

const { id: docId, ...product } = { ...PRODUCT } // doc id ≠ stored field
if (price !== undefined) product.price = price

if (dryRun) {
  console.log(`[dry-run] would upsert products/${docId}:\n`, product)
  if (fileUrl) console.log('[dry-run] would set download url:', fileUrl)
  process.exit(0)
}

try {
  const ref = db.collection('products').doc(docId)
  const snap = await ref.get()
  if (snap.exists) {
    const { download_count: downloadCount, created_at: createdAt, ...updates } = product
    // Drop a legacy `id` field if a previous run stored one.
    await ref.update({ ...updates, id: FieldValue.delete() })
    console.log(`updated products/${docId} (kept download_count=${downloadCount ?? 0})`)
  } else {
    await ref.set({
      ...product,
      download_count: 0,
      created_at: new Date().toISOString()
    })
    console.log(`created products/${docId}`)
  }

  if (fileUrl) {
    if (!fileUrl.startsWith('https://')) throw new Error('--url must start with https://')
    await db.collection('product_files').doc(docId).set({
      url: fileUrl,
      updated_at: new Date().toISOString()
    })
    console.log(`set product_files/${docId} -> ${fileUrl}`)
  }

  const finalSnap = await ref.get()
  console.log('product doc:', JSON.stringify(finalSnap.data(), null, 2))
} catch (err) {
  const code = err?.code
  if (code === 5 || String(err?.message ?? '').includes('NOT_FOUND')) {
    console.error(
      'Firestore database does not exist yet.\n' +
        '  Firebase console → Firestore Database → Create database (production mode).'
    )
  } else if (code === 16 || code === 7 || String(err?.message ?? '').includes('UNAUTHENTICATED')) {
    console.error('Credentials rejected — re-download the service-account key JSON.\n  ' + err.message)
  } else {
    console.error('Seed failed:', err)
  }
  process.exit(1)
} finally {
  await app.delete()
}
