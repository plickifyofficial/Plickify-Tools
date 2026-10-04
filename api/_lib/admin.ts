/**
 * firebase-admin bootstrap for the Vercel serverless functions.
 *
 * Uses the service-account JSON stored in the FIREBASE_SERVICE_ACCOUNT env
 * var (Vercel dashboard → Settings → Environment Variables). The Admin SDK
 * bypasses security rules — only ever used inside api/, never in the browser.
 */
import { cert, getApps, initializeApp, type App } from 'firebase-admin/app'
import { getAuth, type Auth } from 'firebase-admin/auth'
import { getFirestore, type Firestore } from 'firebase-admin/firestore'

let app: App | null = null

function ensureApp(): App {
  if (app) return app
  if (getApps().length > 0) {
    app = getApps()[0]
    return app
  }
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT not set')
  app = initializeApp({ credential: cert(JSON.parse(raw)) })
  return app
}

export function adminDb(): Firestore {
  return getFirestore(ensureApp())
}

export function adminAuth(): Auth {
  return getAuth(ensureApp())
}
