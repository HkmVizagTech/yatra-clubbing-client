# Supabase setup — Yatra Clubbing

This stores every confirmed booking in a Supabase Postgres table and keeps student
ID images in a private storage bucket. The public site never touches the database
directly — only the Vercel serverless functions do, using the secret service key.

## 1. Create the project
1. Go to https://supabase.com → **New project** (free tier is fine).
2. Pick a name (e.g. `yatra-clubbing`) and a strong database password.
3. Region: **South Asia (Mumbai)** for best speed in India.

## 2. Create the table + storage bucket
1. In the project: **SQL Editor → New query**.
2. Paste the contents of [`supabase-setup.sql`](./supabase-setup.sql) and click **Run**.
   This creates the `registrations` table and the private `student-ids` bucket.

## 3. Grab your keys
**Project Settings → API**:
- **Project URL** → `SUPABASE_URL`
- **`service_role` secret** (under "Project API keys", click reveal) → `SUPABASE_SERVICE_KEY`
  - ⚠️ This is a *secret*. It only ever lives in Vercel env vars / serverless code. Never put it in `index.html`.

## 4. Set Vercel environment variables
In Vercel → your project → **Settings → Environment Variables**, add (Production + Preview):

| Name | Value |
|------|-------|
| `SUPABASE_URL` | your Project URL |
| `SUPABASE_SERVICE_KEY` | the `service_role` secret |
| `ADMIN_TOKEN` | a strong password you choose — this is the admin-panel login |

(Existing payment/WhatsApp vars stay as they are: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, etc.)

Then **redeploy** (Vercel → Deployments → ⋯ → Redeploy) so the functions pick up the vars.

## 5. Use it
- **Public site** — bookings now save automatically on payment success.
- **Admin panel** — visit `https://<your-site>/admin.html`, enter the `ADMIN_TOKEN` password.
  - See all bookings, totals collected, search, view student ID images, export CSV.

## How it fits together
- `api/register.js` → inserts the booking row + uploads the student ID to the bucket.
- `api/registrations.js` → admin-only read endpoint (checks `ADMIN_TOKEN`), returns rows
  with 1-hour signed URLs for the ID images.
- `admin.html` → the dashboard UI (password-protected, `noindex`).

## Notes
- Until the env vars are set, `register.js` runs in **demo mode** (logs to console, booking
  still completes) — so nothing breaks before Supabase is wired.
- Student ID images are in a **private** bucket; they're only viewable through the
  short-lived signed links the admin endpoint generates. Not publicly guessable.
