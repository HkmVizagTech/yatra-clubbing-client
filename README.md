# Yatra Clubbing — Ramayana Circuit

A single-page event site for the **Ramayana Circuit Yatra** by **Hare Krishna Vaikuntham** (HKM & ISKCON Visakhapatnam) — a one-day yatra to **Rama Tirtham** and **Ramanarayanam**, with kirtan, pastimes, dance and a grand lunch feast.

Styled to match [bhajan.harekrishnavizag.org](https://bhajan.harekrishnavizag.org) (the Bhajan Clubbing site).

## Run

It's a single self-contained file. Just open `index.html` in a browser, or serve the folder:

```bash
npx serve .
```

## Features

- Premium light theme, Ramayana motifs & animations (falling petals, solar mandala, bow-and-arrow, Pushpaka Vimana, Jatayu birds, gopuram skyline, diyas).
- Two passes — General ₹799 (was ₹1000) and Student ₹299 (was ₹500).
- District-style booking modal: ticket steppers → live order summary → details → **mobile OTP** → confirmation pass.
- Distinct Student flow: on OTP verify, if the mobile matches a **Bhajan Clubbing** registration the earlier ID proof is accepted automatically; otherwise the student uploads a new ID.

## Payments, OTP & WhatsApp

The booking flow does: select tickets → details → **mobile OTP** → **pay with Razorpay** → confirmation → **WhatsApp message**. The secure parts run as Vercel serverless functions in [`/api`](./api) (see [api/README.md](./api/README.md)). Everything works in **demo mode** until you add keys.

To go live:

1. **Razorpay** — sign up, get `key_id` + `key_secret`. Put `key_id` in `index.html` (`RAZORPAY_KEY_ID`) and add `RAZORPAY_KEY_ID` + `RAZORPAY_KEY_SECRET` as Vercel env vars.
2. **Firebase Phone Auth (OTP)** — create a project, enable Phone sign-in, add your domain to Authorized domains, paste the web config into `FIREBASE_CONFIG` in `index.html`.
3. **WhatsApp (Flaxxa Wapi)** — add `FLAXXA_API_URL`, `FLAXXA_TOKEN` (+ `FLAXXA_INSTANCE`) env vars; adjust the payload in `api/whatsapp.js` to your account's API.
4. **Bhajan backend** — set `BHAJAN_API_URL` (+ `BHAJAN_API_KEY`) so student lookup and registration save hit your existing system.

All secrets live in **Vercel → Settings → Environment Variables**, never in the code.

## Notes

- Fonts (Bricolage Grotesque, Plus Jakarta Sans, Space Mono) are embedded in the file so it renders offline. For a slimmer deployed file you can switch to a Google Fonts `<link>` instead.

© Hare Krishna Vaikuntham Cultural Centre · HKM & ISKCON Visakhapatnam
