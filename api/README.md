# Backend API (Vercel serverless functions)

These run automatically on Vercel — no separate server. Each file under `/api`
becomes an endpoint (e.g. `api/create-order.js` → `/api/create-order`). Secrets
are read from **Vercel → Settings → Environment Variables** and never appear in
the page or the repo.

## Endpoints

| Route | Purpose |
|---|---|
| `POST /api/create-order` | Create a Razorpay order (amount in ₹). |
| `POST /api/verify-payment` | Verify the Razorpay payment signature. |
| `POST /api/whatsapp` | Send the booking confirmation via Flaxxa Wapi. |
| `POST /api/student-lookup` | Check if a mobile is an existing Bhajan Clubbing student. |
| `POST /api/register` | Save a confirmed booking (forwards to the Bhajan backend). |

## Environment variables to set in Vercel

| Name | Used by | Notes |
|---|---|---|
| `RAZORPAY_KEY_ID` | create-order | Public key id (`rzp_live_…`). Also put this in `index.html` → `RAZORPAY_KEY_ID`. |
| `RAZORPAY_KEY_SECRET` | create-order, verify-payment | **Secret** — server only. |
| `FLAXXA_API_URL` | whatsapp | Exact send-message endpoint from your Flaxxa Wapi dashboard. |
| `FLAXXA_TOKEN` | whatsapp | Flaxxa Wapi API token. |
| `FLAXXA_INSTANCE` | whatsapp | Instance / sender id, if your plan uses one. |
| `BHAJAN_API_URL` | student-lookup, register | Base URL of your existing Bhajan backend. |
| `BHAJAN_API_KEY` | student-lookup, register | Optional bearer token for that backend. |

After adding/changing env vars, redeploy (Vercel does this automatically on the
next push, or use "Redeploy" in the dashboard).

## Note on Flaxxa Wapi

`api/whatsapp.js` uses a common payload shape (`to`, `type`, `message`, optional
`instance_id`). Flaxxa's exact field names depend on your account/plan — open
your Flaxxa Wapi dashboard's API reference and tweak the `payload` and
`FLAXXA_API_URL` to match (text message vs approved template, number format, etc.).

## Frontend toggles (in `index.html`)

- `FIREBASE_CONFIG` — paste your Firebase web config to enable real OTP.
- `RAZORPAY_KEY_ID` — set the public key to enable live payments (else demo mode).
