# MY LUDO — Product Requirements Doc

## Original problem statement
Build a complete production-ready mobile-first online Ludo Battle web application.
Two users from anywhere in India can join the same Ludo room (created by Player 1 with an entry amount + deposit, room-code shared with Player 2). Real-time Classic Ludo battle, wallet settlement, UPI deposit + admin verification, secure admin panel. UPI ID: `Ankitrajputtt@fam`. WhatsApp: `8306865537`. Demo mode ON by default.

## User choices (Feb 2026)
- Full flow with functional Ludo engine + rooms + wallet + admin
- Mobile + OTP auth, demo OTP `123456`
- Demo Mode ON, Real Money OFF
- Admin: `admin` / `admin@1234`
- Real-time via FastAPI WebSockets

## User personas
- Casual mobile player who wants a fast 1v1 Ludo cash battle
- Admin operator who verifies deposits/withdrawals/KYC and manages settings

## Architecture
- Backend: FastAPI + Motor (MongoDB async), JWT auth, WebSocket `/api/ws/battle/{id}` for real-time game
- Frontend: React 19 + React Router 7 + Tailwind + shadcn UI; mobile-first `max-w-md` shell
- Server-authoritative Ludo engine (`ludo_engine.py`): 2 players × 4 tokens, main track 52 + home column 6, safe cells 0/8/13/21/26/34/39/47, capture, extra turn on 6/capture/home
- Wallet with immutable ledger buckets: `deposit_balance`, `winnings_balance`, `bonus_balance`, `locked_balance`
- UPI QR generated server-side (`qrcode`) from configurable UPI ID

## What's been implemented (2026-02-14)
- Auth: mobile+OTP (demo OTP 123456), JWT, ₹500 signup bonus in demo mode
- Home, Bottom nav (Home/Wallet/Support/Profile), Hamburger drawer
- Battles list (open/running), Create Room, Join Room, Room Lobby with 3-2-1 countdown
- Ludo game screen (server-authoritative dice + move + capture + winner + leave/forfeit + settlement)
- Wallet (total + deposit + winnings), Add Cash with UPI QR + UTR submission, Withdraw form
- Admin panel: dashboard counts, users (suspend/activate), deposits verify/reject, withdrawals approve/mark_paid/reject, battles list, KYC approve/reject, settings edit
- Referral system: unique code, 2% configurable commission credited to bonus_balance
- Notifications, History (tabs), KYC form, Support (WhatsApp CTA to 8306865537)
- Testing: 20/20 backend pytest, all frontend flows pass

## Backlog (P1/P2)
- P1: Turn timer enforcement server-side (setting exists but not enforced)
- P1: Restrict `/api/rooms/create` to configured `battle_entries` list if strict
- P2: Split `server.py` into modules; MongoDB transactions for wallet ledger
- P2: PWA manifest + service worker + install prompt
- P2: Support ticket admin reply UI
- P2: Two-worker safe locking (Redis or Mongo transactions)
- P2: Real SMS OTP (Twilio), real payment gateway abstraction
