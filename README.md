# RDX LUDO

Mobile-first 1v1 online Classic Ludo battle platform (React + FastAPI + MongoDB) with wallet, UPI QR deposit, admin verification, secure admin panel, referral system and real-time WebSocket game engine.

## Stack
- **Frontend**: React 19 + React Router 7 + Tailwind + shadcn/ui + Sonner
- **Backend**: FastAPI + Motor (MongoDB async) + JWT + WebSockets + qrcode
- **DB**: MongoDB

## Local Setup

### 1) Backend
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # then edit JWT_SECRET / MONGO_URL
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

### 2) Frontend
```bash
cd frontend
yarn install
cp .env.example .env   # set REACT_APP_BACKEND_URL
yarn start
```

App runs at `http://localhost:3000`.

## Default Credentials
- Admin — `admin` / `admin@1234` (seeded on first backend startup)
- Users — mobile+OTP (demo OTP `123456`, ₹500 signup bonus in demo mode)
- UPI ID — `Ankitrajputtt@fam` (editable in Admin → Settings)
- WhatsApp support — `8306865537`

## Features
- Public landing page, mobile+OTP auth, referral deep-links (`/refer/CODE`, `/public/refer/CODE`)
- Home, Battles list (open/running/completed), Create Room / Join Room, Room Lobby, Ludo game
- Wallet (deposit/winnings/bonus/locked buckets, immutable ledger)
- UPI QR Add Cash with UTR + screenshot; admin verify/reject
- Withdrawal via **UPI or Bank** (admin approve → mark_paid)
- Referral (2% configurable) + Referral Redeem to move bonus → winnings
- Support (WhatsApp CTA), History (tabs), Notifications, KYC
- Admin panel at `/admin`: dashboard, users, deposits, withdrawals, battles, KYC, settings

## Security
- Server-authoritative Ludo engine (dice + move validation)
- Immutable wallet ledger (every operation logs balance_before/after)
- Unique UTR check on deposits
- JWT auth, admin token separate from user token
- Demo mode ON by default; real-money mode is a configurable flag

## Legal
Play responsibly. 18+ only. Operators are responsible for jurisdiction/license compliance before enabling real-money mode.
