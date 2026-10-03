# Plickify Tools — Website + Activation Backend

Light, indigo-themed store (plickifyacademy-style): **Google login → buy via
bKash/Nagad (TrxID) → admin approves → download from dashboard + license key →
paste key into the desktop app**.

Stack: **Vite + React + TS + Tailwind** (this folder) · **Supabase** (database,
auth, storage, edge functions) · **Vercel** (hosting).

```
site/
├── src/                      # React app (public store + dashboard + admin)
├── supabase/
│   ├── migrations/0001_init.sql      # ← run this in Supabase SQL Editor
│   └── functions/                    # license-activate / validate / deactivate
├── vercel.json               # SPA rewrite
└── .env.example              # copy to .env for local dev
```

---

## 1. Supabase setup

1. Create a project at <https://supabase.com> (choose a region near Bangladesh,
   e.g. Singapore `ap-southeast-1`).
2. **SQL Editor → New query → paste all of
   `supabase/migrations/0001_init.sql` → Run.**
   This creates: `profiles`, `products`, `orders`, `licenses`,
   `license_devices`, `site_settings`, all RLS policies, the profile-creation
   trigger, the private `tool-files` storage bucket + policies.
3. **Make yourself admin** (SQL Editor, replace the email — you must sign in on
   the site once first so your profile row exists):

   ```sql
   update public.profiles set role = 'admin' where email = 'you@gmail.com';
   ```

### Google login

1. Supabase → **Authentication → Providers → Google → enable**.
2. Google Cloud Console → <https://console.cloud.google.com/apis/credentials>
   → create an **OAuth 2.0 Client ID (Web application)**:
   - Authorized redirect URI:
     `https://<PROJECT-REF>.supabase.co/auth/v1/callback`
3. Paste client ID + secret into Supabase, then
   **Authentication → URL Configuration**: add your site URL
   (`http://localhost:5173` while developing, your Vercel domain after deploy)
   to *Redirect URLs*.

Only Google is enabled (by design).

### Secrets + edge functions (app activation)

The desktop app talks to three edge functions. They use the built-in
`SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` plus one secret you set:

```powershell
# from the site/ folder (Supabase CLI: npm i -g supabase, then supabase login)
supabase secrets set LICENSE_TOKEN_SECRET=<long-random-string>
# generate one, e.g.: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

supabase functions deploy license-activate
supabase functions deploy license-validate
supabase functions deploy license-deactivate
```

> The app authenticates with the **anon key**, which is a valid JWT, so the
> default `--verify-jwt` setting works as-is.

| Function | App call | Success | Failures (HTTP 4xx + `code`) |
|---|---|---|---|
| `license-activate` | paste key in the app | `{token, label, graceDays}` | `not_found`, `revoked`, `expired`, `device_limit`, `device_revoked` |
| `license-validate` | every 24h while running | `{graceDays}` | `invalid_token`, `token_expired`, `revoked`, `device_revoked` |
| `license-deactivate` | Settings → Deactivate | `{ok:true}` | `invalid_token` |

Token = HMAC-SHA256 signed (license id + device id + 90-day expiry). Admin
**Revoke** takes effect at the next validate (≤24 h), or immediately if the
user presses *Check Now*. Offline grace is **7 days** (`GRACE_DAYS`).

## 2. Local development

```powershell
Copy-Item site\.env.example site\.env   # fill in Supabase URL + anon key
cd site
npm install
npm run dev                              # http://localhost:5173
```

`.env`:

```
VITE_SUPABASE_URL=https://<PROJECT-REF>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>       # Project Settings → API
```

## 3. Deploy to Vercel

1. Push this repo to **GitHub**.
2. Vercel → **Add New Project** → import the repo →
   - **Framework Preset:** Vite
   - **Root Directory:** `site`          ← important
   - **Build Command:** `npm run build`  (default)
   - **Output Directory:** `dist`        (default)
3. Env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
4. Deploy. `vercel.json` already contains the SPA rewrite, so
   `/dashboard/*` deep links work.
5. Back in Supabase → Authentication → URL Configuration → add the Vercel URL
   to *Redirect URLs*.

## 4. Wire the desktop app to this backend

In the **project root** (not `site/`), create `.env` (see `.env.example`):

```
ACTIVATION_API_URL=https://<PROJECT-REF>.supabase.co
ACTIVATION_ANON_KEY=<anon key>
ACTIVATION_ENABLED=1
```

then rebuild (`npm run build`, or `npm run bundle` for the installer). Users
paste the key from **dashboard → My License** into the app's activation screen.

- `ACTIVATION_DISABLED=1` — skip the gate entirely (tests only).
- `ACTIVATION_FORCE=1` — preview the activation screen in dev builds.
- Unconfigured **dev** builds bypass the gate; unconfigured **packaged** builds
  are blocked (so a shipped installer can never run unprotected).

## 5. Day-to-day admin

Everything is driven from **`/admin`** (role `admin`):

- **Orders** → verify TrxID → *Approve* (unlocks download) / *Reject*.
- **Products** → create/edit, upload the file buyers download
  (stored in the private `tool-files` bucket), hide/show, delete.
- **Licenses** → issue keys (email + tool + device count), revoke/restore,
  revoke individual devices.
- **Users** → change roles (`user`/`staff`/`admin`).
- **Settings** → bKash/Nagad numbers, payment note, support contact, banner.

Payment flow: buyer pays *Send Money* → submits TrxID on the Buy modal → you
approve → their dashboard shows **Download** + license key.
