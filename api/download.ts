// GET /api/download?product=<productId>   Authorization: Bearer <Firebase ID token>
// -> 200 { url, name }   |  4xx { error, code }
//
// Gate: the caller's Firebase ID token must verify AND they must have an
// approved order for the product (admins can always download). The file URL
// lives in product_files/{id} (admin-only rules), so buyers never see it in
// the Firestore data they can read. GitHub release assets are resolved to a
// short-lived signed URL when GITHUB_TOKEN is set (private repos).

import { adminAuth, adminDb } from './_lib/admin'
import { bearerToken, fail, guardMethod, json, queryString, type ApiReq, type ApiRes } from './_lib/http'
import { FieldValue } from 'firebase-admin/firestore'

interface GitHubRelease {
  assets?: Array<{ id: number; name: string }>
}

/** Resolve a GitHub release asset URL to a temporary signed URL. */
async function resolveGitHubUrl(url: string): Promise<string | null> {
  const match = /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/releases\/download\/([^/]+)\/(.+)$/.exec(url)
  if (!match) return null
  const token = process.env.GITHUB_TOKEN
  if (!token) return null
  const [, owner, repo, tag, assetName] = match
  const apiHeaders = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'plickify-tools-download'
  }

  const releaseRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/releases/tags/${encodeURIComponent(tag)}`,
    { headers: apiHeaders }
  )
  if (!releaseRes.ok) return null
  const release = (await releaseRes.json()) as GitHubRelease
  const asset = release.assets?.find((a) => a.name === decodeURIComponent(assetName))
  if (!asset) return null

  // Follows GitHub's redirect to a short-lived signed URL; we keep only the
  // final URL and cancel the body (the file itself streams to the browser).
  const assetRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases/assets/${asset.id}`, {
    headers: { ...apiHeaders, Accept: 'application/octet-stream' },
    redirect: 'follow'
  })
  void assetRes.body?.cancel()
  return assetRes.ok && assetRes.url ? assetRes.url : null
}

export default async function handler(req: ApiReq, res: ApiRes): Promise<void> {
  if (guardMethod(req, res, 'GET')) return

  const productId = queryString(req, 'product')
  if (!productId) {
    fail(res, 400, 'invalid_request', 'Missing product id.')
    return
  }

  const token = bearerToken(req)
  if (!token) {
    fail(res, 401, 'unauthorized', 'Sign in to download.')
    return
  }

  try {
    const db = adminDb()
    const decoded = await adminAuth().verifyIdToken(token)
    const uid = decoded.uid

    const productSnap = await db.collection('products').doc(productId).get()
    if (!productSnap.exists) {
      fail(res, 404, 'not_found', 'This tool no longer exists.')
      return
    }

    const profileSnap = await db.collection('profiles').doc(uid).get()
    const profileData = profileSnap.exists ? profileSnap.data() : undefined
    const isAdmin = profileData?.role === 'admin'
    if (!isAdmin) {
      const orderSnap = await db
        .collection('orders')
        .where('user_id', '==', uid)
        .where('product_id', '==', productId)
        .where('status', '==', 'approved')
        .limit(1)
        .get()
      if (orderSnap.empty) {
        fail(res, 403, 'not_purchased', 'Buy this tool first — the download unlocks after payment approval.')
        return
      }
    }

    const fileSnap = await db.collection('product_files').doc(productId).get()
    const fileData = fileSnap.exists ? fileSnap.data() : undefined
    const url = fileData?.url as string | undefined
    if (!url) {
      fail(res, 404, 'not_available', 'Download not available yet — contact support.')
      return
    }

    // Best-effort download counter.
    void productSnap.ref
      .update({ download_count: FieldValue.increment(1) })
      .catch(() => undefined)

    const finalUrl = (await resolveGitHubUrl(url)) ?? url
    const productData = productSnap.data()
    json(res, { url: finalUrl, name: (productData?.name as string | undefined) ?? 'download' })
  } catch {
    if (!res.writableEnded) fail(res, 500, 'server_error', 'Download server error. Try again later.')
  }
}
