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

## To take it live (TODO)

These are marked `TODO(backend)` in `index.html`:

1. **Firebase Phone Auth (OTP):** create a Firebase project, enable Phone sign-in, add your domain to Authorized domains, and paste your web config into `FIREBASE_CONFIG` in the script. Until then it runs in demo mode (any 6-digit code).
2. **`checkBhajanStudent(phone)`:** point it at the Bhajan custom API (`/students?mobile=…`) to look up existing student proofs.
3. **Registration submit:** POST the booking `data` (and uploaded ID, if any) to the same backend the Bhajan site uses.

## Notes

- Fonts (Bricolage Grotesque, Plus Jakarta Sans, Space Mono) are embedded in the file so it renders offline. For a slimmer deployed file you can switch to a Google Fonts `<link>` instead.

© Hare Krishna Vaikuntham Cultural Centre · HKM & ISKCON Visakhapatnam
