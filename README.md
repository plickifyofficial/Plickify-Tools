# Plickify Tools — Website + Activation Backend

Light, indigo-themed store (plickifyacademy-style): **Google login → buy via
bKash/Nagad (TrxID) → admin approves → download from dashboard + license key →
paste key into the desktop app**.

Stack: **Vite + React + TS + Tailwind** (this repo) · **Firebase** (Google auth +
Firestore) · **Vercel** (hosting + serverless license/download API) ·
**GitHub Releases** (tool files).

```
Plickify-Tools/
├── src/                      # React app (public store + dashboard + admin)
│   └── lib/firebase.ts       # ← Firebase web config (public, baked in)
├── firestore.rules           # ← paste into Firebase console (security rules)
├── api/                      # Vercel serverless functions
│   ├── license-activate.ts   #   desktop-app activation
│   ├── license-validate.ts   #   24h revalidation (7-day offline grace)
│   ├── license-deactivate.ts #   free a device seat
│   └── download.ts           #   gated file download (checks approved order)
├── vercel.json               # SPA rewrite + /functions/v1/:fn → /api/:fn
└── .env.example              # server-side env vars (set in Vercel dashboard)
```

> Why this shape? Firebase **Storage and Cloud Functions need the paid Blaze
> plan** — this design runs 100% on the free tier: Firebase Auth + Firestore
> Spark plan, Vercel serverless functions, files on GitHub Releases.

---

## 1. Firebase setup (one time)

Project: **`plickify-official`** (web config already baked into
`src/lib/firebase.ts` — that config is public by design).

1. **Enable Google login:** Firebase console → *Authentication → Get started →
   Sign-in method → Google → Enable → Save.*
2. **Create the database:** *Firestore Database → Create database →*
   start in **production mode** → pick a region near Bangladesh
   (e.g. `asia-south1` or `asia-southeast1`).
3. **Paste the security rules:** *Firestore → Rules* → replace everything with
   the contents of **`firestore.rules`** → *Publish*.
   (Or CLI: `firebase login && firebase deploy --rules firestore.rules`.)
4. **Make yourself admin** (do this AFTER you sign in on the site once, so
   your profile exists): Firestore → *Data* → open `profiles/<your-uid>` →
   edit field `role` → set it to `admin` → *Update*.
5. **Service account key** (for the Vercel API): *Project settings → Service
   accounts → Generate new private key* → save the JSON file.
6. **Authorized domains:** *Authentication → Settings → Authorized domains* →
   add your Vercel domain (e.g. `plickify-tools.vercel.app`) and
   `localhost` (already there) → Save. **Google login 401s without this.**

Collections used (created automatically on first write):
`profiles`, `products`, `orders`, `licenses`, `license_devices`,
`product_files`, `site_settings`.

## 2. Local development

```powershell
npm install
npm run dev          # http://localhost:5173  (no .env needed)
```

`npm run dev` shows the store; **Google login only works** once step 1.6
(`localhost` authorized domain) is done. The `api/` functions are Vercel-only —
use `vercel dev` if you need them locally.

## 3. Deploy to Vercel + connect Firebase

1. Push this repo to GitHub → <https://github.com/plickifyofficial/Plickify-Tools>.
2. Vercel → **Add New Project** → import the repo →
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build` (default) · **Output:** `dist` (default)
3. **Environment variables** (Settings → Environment Variables) — all three:

   | Name | Value |
   |---|---|
   | `FIREBASE_SERVICE_ACCOUNT_KEY` | *paste the whole service-account JSON file content* |
   | `LICENSE_TOKEN_SECRET` | long random string, e.g. `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
   | `GITHUB_TOKEN` | *(optional)* `repo`-scoped PAT — only needed for **private** release assets |

4. **Deploy.** `vercel.json` rewrites keep two contract surfaces alive:
   - `/dashboard/*` SPA deep links → `index.html`
   - `/functions/v1/<fn>` → `/api/<fn>` → the old Supabase-style URLs the
     desktop app already calls (app needs **no code change**).
5. Back in Firebase → *Authentication → Authorized domains* → add the Vercel
   domain (step 1.6).

### Tool files on GitHub Releases

Uploads now live on **GitHub Releases** (free, unlimited bandwidth) instead of
Supabase Storage:

```powershell
# one-time: a (private or public) repo to hold the files
gh repo create Plickify-Files --private

# per release (gh CLI is already authenticated):
gh release create v1.0.0 "C:\path\to\Firefox Automation Manager-Setup-1.0.0.exe" `
  --repo plickifyofficial/Plickify-Files --title "FAM 1.0.0"
```

Copy the asset URL
(`https://github.com/plickifyofficial/Plickify-Files/releases/download/v1.0.0/...`)
→ **Admin → Products → Edit → Download URL**. With a *private* repo, set
`GITHUB_TOKEN` in Vercel so the API can mint short-lived signed URLs; public
repo assets work without it. The URL is stored in the admin-only
`product_files` collection — buyers never see it, only `/api/download`
serves it after checking their order.

## 4. Wire the desktop app to this backend

In the **desktop app repo** (separate from this website), `.env`:

```
ACTIVATION_API_URL=https://<your-vercel-domain>
ACTIVATION_ANON_KEY=AIzaSyCR2B0AHmknSuJ50nmGPUeIGA_FdLyANKQ
```

`ACTIVATION_ANON_KEY` just needs to be **non-empty** (use the public Firebase
web API key above); the functions ignore it. Rebuild
(`npm run build`, or `npm run dist` for the installer). Users paste the key
from **dashboard → My License** into the app's activation screen.

- `ACTIVATION_DISABLED=1` — skip the gate entirely (tests only).
- `ACTIVATION_FORCE=1` — preview the activation screen in dev builds.
- Unconfigured **dev** builds bypass the gate; unconfigured **packaged** builds
  are blocked (so a shipped installer can never run unprotected).

| App call (unchanged URL shape) | Success | Failures (HTTP 4xx + `code`) |
|---|---|---|
| `POST …/functions/v1/license-activate` | `{token, label, graceDays}` | `not_found`, `revoked`, `expired`, `device_limit`, `device_revoked` |
| `POST …/functions/v1/license-validate` | `{graceDays}` | `invalid_token`, `token_expired`, `revoked`, `device_revoked` |
| `POST …/functions/v1/license-deactivate` | `{ok:true}` | `invalid_token` |

Token = HMAC-SHA256 signed (license id + device id + 90-day expiry). Admin
**Revoke** takes effect at the next validate (≤24 h), or immediately if the
user presses *Check Now*. Offline grace is **7 days** (`GRACE_DAYS`).

## 5. Day-to-day admin

Everything is driven from **`/admin`** (role `admin`):

- **Orders** → verify TrxID → *Approve* (unlocks download) / *Reject*.
- **Products** → create/edit, paste the GitHub Release **Download URL**,
  hide/show, delete.
- **Licenses** → issue keys (email + tool + device count), revoke/restore,
  revoke individual devices, delete.
- **Users** → change roles (`user`/`staff`/`admin`).
- **Settings** → bKash/Nagad numbers, payment note, support contact, banner.

Payment flow: buyer pays *Send Money* → submits TrxID on the Buy modal → you
approve → their dashboard shows **Download** + license key.

## Notes

- Firestore queries here use **only equality filters** — no composite indexes
  to create; sorting happens client-side (data sets are small).
- The Firestore web API key in `src/lib/firebase.ts` is **not a secret** —
  security comes from `firestore.rules`, never from hiding the config.
