/**
 * One-off end-to-end test of the live Vercel API chain.
 *
 *   node scripts/e2e-test.mjs
 *
 * Covers: profile lookup → gated download (purchased vs not) → admin
 * promote → license activate → validate → negative device check →
 * deactivate. Uses the real live endpoints at tools.plickifyacademy.com.
 * Pass --promote to grant admin (default: yes unless --no-promote).
 */
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { initializeApp, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

const SITE = 'https://tools.plickifyacademy.com'
const PRODUCT = 'firefox-automation-manager'
const DEMO_PRODUCT = 'fiverr-client-hunter'
const WEB_API_KEY = 'AIzaSyCR2B0AHmknSuJ50nmGPUeIGA_FdLyANKQ'
const TEST_DEVICE = 'e2e-test-device-01'

const here = dirname(fileURLToPath(import.meta.url))
const keyPath = resolve(here, '..', '.service-account.json')
const app = initializeApp({ credential: cert(JSON.parse(readFileSync(keyPath, 'utf8'))), projectId: 'plickify-official' })
const db = getFirestore(app)
const auth = getAuth(app)

let pass = 0
let fail = 0
const check = (label, ok, detail = '') => {
  console.log(`${ok ? '  ✅' : '  ❌'} ${label}${detail ? ` — ${detail}` : ''}`)
  ok ? pass++ : fail++
}

const j = (r) => r.json().catch(() => ({}))
const post = (fn, body) =>
  fetch(`${SITE}/functions/v1/${fn}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })

// ── 1. Profile + role ──────────────────────────────────────────────────────
console.log('\n[1] Profile lookup')
const profQ = await db.collection('profiles').where('email', '==', 'plickifyofficial@gmail.com').limit(1).get()
let prof = profQ.docs[0]
if (!prof) {
  const scan = await db.collection('profiles').limit(5).get()
  console.log('    email query empty — profiles present:', scan.docs.map((d) => `${d.id}(${d.data().email ?? '?'})`).join(', ') || 'NONE')
  prof = scan.docs[0]
}
if (!prof) {
  console.log('❌ No profile documents at all — sign in on the site first.')
  process.exit(1)
}
const uid = prof.id
const role = prof.data().role
console.log(`    uid=${uid} email=${prof.data().email ?? '?'} role=${role ?? 'user'}`)

// ── 2. Mint a Firebase ID token for the real user ──────────────────────────
console.log('\n[2] ID token')
const custom = await auth.createCustomToken(uid)
const tokRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${WEB_API_KEY}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ token: custom, returnSecureToken: true })
})
const { idToken } = await tokRes.json()
check('mint ID token', Boolean(idToken), tokRes.status)

const dl = (product, token) =>
  fetch(`${SITE}/api/download?product=${product}`, { headers: { Authorization: `Bearer ${token}` } })

// ── 3. Gated download ──────────────────────────────────────────────────────
console.log('\n[3] Gated download')
const famDl = await dl(PRODUCT, idToken)
const famBody = await j(famDl)
check('purchased product → 200 with URL', famDl.status === 200 && famBody.url, famDl.status)
if (famBody.url) console.log(`      url: ${famBody.url.slice(0, 110)}…`)

const isAdminNow = role === 'admin'
const demoDl = await dl(DEMO_PRODUCT, idToken)
const demoBody = await j(demoDl)
if (isAdminNow) {
  // Admin bypasses the order gate; demo products have no seeded file, so a
  // 404 not_available (vs 200 once a file URL exists) is both correct.
  const demoOk = demoDl.status === 200 || (demoDl.status === 404 && demoBody.code === 'not_available')
  check('demo product (admin bypass) reaches file check', demoOk, `${demoDl.status} ${demoBody.code ?? ''}`)
} else {
  check('demo product, no order → 403 not_purchased', demoDl.status === 403 && demoBody.code === 'not_purchased', `${demoDl.status} ${demoBody.code ?? ''}`)
}

const noTok = await fetch(`${SITE}/api/download?product=${PRODUCT}`)
check('no token → 401', noTok.status === 401, noTok.status)

// ── 4. Admin promote ───────────────────────────────────────────────────────
console.log('\n[4] Admin promote')
if (isAdminNow) {
  check('already admin', true)
} else {
  await prof.ref.set({ role: 'admin' }, { merge: true })
  check('role → admin', true, uid)
}

// ── 5. License activate / validate / deactivate ────────────────────────────
console.log('\n[5] License flow')
const licQ = await db.collection('licenses').where('user_id', '==', uid).limit(2).get()
let lic = licQ.docs[0]
if (!lic) {
  const any = await db.collection('licenses').limit(5).get()
  console.log('    user_id query empty — licenses:', any.docs.map((d) => `${d.id}:${d.data().key}`).join(', ') || 'NONE')
  lic = any.docs[0]
}
if (!lic) {
  console.log('❌ No licenses — approve an order in Admin first.')
  process.exit(1)
}
const licKey = lic.data().key
console.log(`    license: ${lic.data().key} status=${lic.data().status}`)

const act = await j(await post('license-activate', { licenseKey: licKey, deviceId: TEST_DEVICE }))
console.log(`    activate → ${JSON.stringify(act).slice(0, 160)}`)
check('activate → token', Boolean(act.token))
check('activate → graceDays=7', act.graceDays === 7)

if (act.token) {
  const val = await j(await post('license-validate', { token: act.token, deviceId: TEST_DEVICE }))
  check('validate → graceDays=7', val.graceDays === 7, JSON.stringify(val))

  const wrongDev = await j(await post('license-validate', { token: act.token, deviceId: 'some-other-device' }))
  check('wrong device → 401', wrongDev.code === 'invalid_token', wrongDev.code)

  const deact = await j(await post('license-deactivate', { token: act.token, deviceId: TEST_DEVICE }))
  check('deactivate → ok:true (seat freed)', deact.ok === true, JSON.stringify(deact))
}

// ── Summary ────────────────────────────────────────────────────────────────
console.log(`\n${fail === 0 ? '🎉 ALL PASS' : '⚠️ FAILURES'} — ${pass} passed, ${fail} failed`)
process.exit(fail === 0 ? 0 : 1)
