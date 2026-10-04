#!/usr/bin/env node
/**
 * Seed / update a product in Firestore using the Admin SDK (bypasses security
 * rules — keep the service-account file private).
 *
 * Usage:
 *   node scripts/seed-product.mjs                     # upsert the main product below
 *   node scripts/seed-product.mjs --demo              # upsert the DEMO_PRODUCTS list
 *   node scripts/seed-product.mjs --url https://...   # also set download URL (main product)
 *   node scripts/seed-product.mjs --price 799         # override price (main product)
 *   node scripts/seed-product.mjs --set bkash_number=01700000000 \
 *        --set nagad_number=01800000000               # site_settings (repeatable)
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
  image_url: '/previews/firefox-automation-manager.svg',
  is_active: true
}

// ─── Demo tools (store filler — edit/remove freely in Admin → Products) ─────
// created_at is staggered (1 h apart, ending before FAM's) so the store keeps
// this exact order: Firefox Automation Manager → Fiverr → … → WhatsKodo.
const DEMO_BASE = Date.parse('2026-10-03T12:00:00.000Z')
const demo = (
  file,
  name,
  category,
  price,
  original_price,
  version,
  description,
  i
) => ({
  id: file,
  name,
  slug: file,
  category,
  price,
  original_price,
  version,
  description,
  image_url: `/previews/${file}.svg`,
  is_active: true,
  created_at: new Date(DEMO_BASE - i * 3_600_000).toISOString()
})

const DEMO_PRODUCTS = [
  demo('fiverr-client-hunter', 'Fiverr Client Hunter Pro', 'Lead Hunter', 1600, 3000, '3.0',
    'Find fresh Fiverr buyer leads by keyword, category and budget — contact-ready export.', 0),
  demo('instagram-lead-hunter', 'Instagram Lead Hunter Pro', 'Lead Hunter', 1500, 2200, '2.6',
    'Discover targeted Instagram profiles, bio emails and engagement data for outreach.', 1),
  demo('map-lead-hunter', 'Map Lead Hunter Pro', 'Lead Hunter', 1400, 2100, '2.4',
    'Extract Google Maps business leads — name, phone, email, website — by niche and area.', 2),
  demo('yt-lead-hunter', 'YT Lead Hunter Pro', 'Lead Hunter', 1900, 3100, '2.9',
    'Collect YouTube channel and creator contact data by keyword, niche and subscriber range.', 3),
  demo('upwork-client-hunter', 'Upwork Client Hunter Pro', 'Lead Hunter', 1400, 1500, '2.0',
    'Pull fresh Upwork job posts and client details filtered by skill and budget.', 4),
  demo('facebook-lead-hunter', 'Facebook Lead Hunter Pro', 'Lead Hunter', 1500, 3300, '2.7',
    'Discover Facebook page and group leads by keyword, location and category.', 5),
  demo('directory-lead-hunter', 'Directory Lead Hunter Pro', 'Lead Hunter', 1100, 2900, '2.2',
    'Harvest business listings from online directories with phone, email and website.', 6),
  demo('website-email-extractor', 'Website Email Extractor Pro', 'Extractor', 2000, 3400, '3.1',
    'Scan any website or URL list and extract valid email addresses, ready to export.', 7),
  demo('whatskodo', 'WhatsKodo Pro Toolkit', 'WhatsApp', 1250, 1600, '1.8',
    'WhatsApp marketing toolkit — number validation, campaign tools and contact manager.', 8)
]

// ─── CLI ────────────────────────────────────────────────────────────────────
function arg(name) {
  const i = process.argv.indexOf(`--${name}`)
  return i > -1 ? process.argv[i + 1] : undefined
}
const dryRun = process.argv.includes('--dry-run')
const demoMode = process.argv.includes('--demo')
const fileUrl = arg('url') ?? ''
const price = arg('price') ? Number(arg('price')) : undefined
if (price !== undefined && !Number.isFinite(price)) {
  console.error('--price must be a number')
  process.exit(1)
}

// --set key=value (repeatable) → site_settings/{key} = { key, value }
function allArgs(name) {
  const out = []
  for (let i = 0; i < process.argv.length - 1; i++) {
    if (process.argv[i] === `--${name}`) out.push(process.argv[i + 1])
  }
  return out
}
const settings = allArgs('set').map((pair) => {
  const i = pair.indexOf('=')
  if (i < 1) {
    console.error(`--set expects key=value, got "${pair}"`)
    process.exit(1)
  }
  return { key: pair.slice(0, i), value: pair.slice(i + 1) }
})

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
  if (demoMode) {
    for (const p of DEMO_PRODUCTS) console.log(`[dry-run] would upsert products/${p.id} — ${p.name} (৳${p.price})`)
  } else {
    console.log(`[dry-run] would upsert products/${docId}:\n`, product)
    if (fileUrl) console.log('[dry-run] would set download url:', fileUrl)
  }
  for (const s of settings) console.log(`[dry-run] would set site_settings/${s.key} = ${s.value}`)
  process.exit(0)
}

/** Insert-or-update one product doc. download_count is always preserved;
 *  created_at only changes when the data provides one (demo ordering). */
async function upsertProduct(raw) {
  const { id, ...data } = raw
  const ref = db.collection('products').doc(id)
  const snap = await ref.get()
  if (snap.exists) {
    const { download_count: downloadCount, ...updates } = data
    // Drop a legacy `id` field if a previous run stored one.
    await ref.update({ ...updates, id: FieldValue.delete() })
    console.log(`updated products/${id} (kept download_count=${downloadCount ?? 0})`)
  } else {
    await ref.set({ ...data, download_count: 0, created_at: data.created_at ?? new Date().toISOString() })
    console.log(`created products/${id}`)
  }
  return ref
}

try {
  if (demoMode) {
    for (const p of DEMO_PRODUCTS) await upsertProduct(p)
  } else {
    const ref = await upsertProduct({ id: docId, ...product })

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
  }

  for (const s of settings) {
    await db.collection('site_settings').doc(s.key).set({ key: s.key, value: s.value })
    console.log(`set site_settings/${s.key} = ${s.value}`)
  }
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
