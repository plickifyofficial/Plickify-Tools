import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

/**
 * Firebase web app configuration (Firebase console → Project settings →
 * General → Your apps).
 *
 * This config is PUBLIC by design — it ships in every browser bundle. All
 * security lives in the Firestore security rules (see firestore.rules), so
 * never put secrets here.
 */
const firebaseConfig = {
  apiKey: 'AIzaSyCR2B0AHmknSuJ50nmGPUeIGA_FdLyANKQ',
  authDomain: 'plickify-official.firebaseapp.com',
  projectId: 'plickify-official',
  storageBucket: 'plickify-official.firebasestorage.app',
  messagingSenderId: '945056096528',
  appId: '1:945056096528:web:5e6ba0b465c87776bec595'
}

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const googleProvider = new GoogleAuthProvider()
export const db = getFirestore(app)

/** True — the config above is baked in, so the backend is always "configured". */
export const backendConfigured = true
