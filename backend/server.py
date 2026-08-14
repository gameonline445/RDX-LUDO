"""MY LUDO — FastAPI backend.

Full-stack 2-player online Ludo battle platform. All state persisted in MongoDB.
"""
from __future__ import annotations
import os
import io
import base64
import logging
import secrets
import string
import asyncio
from pathlib import Path
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any

import jwt
import qrcode
from bson import ObjectId
from fastapi import FastAPI, APIRouter, HTTPException, Depends, WebSocket, WebSocketDisconnect, status, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field

import ludo_engine as ludo

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
JWT_SECRET = os.environ.get("JWT_SECRET", "dev-secret")
JWT_ALG = os.environ.get("JWT_ALG", "HS256")
JWT_EXPIRE_HOURS = int(os.environ.get("JWT_EXPIRE_HOURS", "72"))

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="MY LUDO API")
api = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("myludo")


# ----------------------------- helpers -----------------------------

def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def gen_id(prefix: str = "") -> str:
    return prefix + secrets.token_hex(8)


def gen_code(length: int = 6) -> str:
    chars = string.ascii_uppercase + string.digits
    return "".join(secrets.choice(chars) for _ in range(length))


def make_jwt(payload: dict) -> str:
    p = dict(payload)
    p["exp"] = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRE_HOURS)
    return jwt.encode(p, JWT_SECRET, algorithm=JWT_ALG)


def decode_jwt(token: str) -> dict:
    return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])


def clean_doc(d: Optional[dict]) -> Optional[dict]:
    if d is None:
        return None
    d.pop("_id", None)
    return d


async def get_current_user(cred: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> dict:
    if cred is None:
        raise HTTPException(401, "missing_token")
    try:
        payload = decode_jwt(cred.credentials)
    except Exception:
        raise HTTPException(401, "invalid_token")
    uid = payload.get("uid")
    if not uid:
        raise HTTPException(401, "invalid_token")
    user = await db.users.find_one({"id": uid})
    if not user:
        raise HTTPException(401, "user_not_found")
    if user.get("account_status") == "suspended":
        raise HTTPException(403, "account_suspended")
    return clean_doc(user)


async def get_admin(cred: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> dict:
    if cred is None:
        raise HTTPException(401, "missing_token")
    try:
        payload = decode_jwt(cred.credentials)
    except Exception:
        raise HTTPException(401, "invalid_token")
    if payload.get("role") != "admin":
        raise HTTPException(403, "not_admin")
    admin = await db.admin_users.find_one({"username": payload.get("username")})
    if not admin:
        raise HTTPException(401, "admin_not_found")
    return clean_doc(admin)


# ----------------------------- settings -----------------------------

DEFAULT_SETTINGS = {
    "app_name": "RDX LUDO",
    "logo_url": "",
    "support_number": "8306865537",
    "whatsapp_number": "8306865537",
    "upi_id": "Ankitrajputtt@fam",
    "payee_name": "RDX LUDO",
    "min_deposit": 10,
    "max_deposit": 100000,
    "min_withdraw": 100,
    "max_withdraw": 50000,
    "battle_entries": [10, 20, 50, 100, 200, 500, 1000],
    "platform_fee_percent": 5,  # 5% platform fee
    "referral_percent": 2,
    "turn_timer_seconds": 30,
    "room_expiry_minutes": 15,
    "maintenance_mode": False,
    "real_money_mode": False,
    "demo_mode": True,
}


async def get_settings() -> dict:
    s = await db.app_settings.find_one({"id": "global"})
    if not s:
        s = {"id": "global", **DEFAULT_SETTINGS, "created_at": now_iso()}
        await db.app_settings.insert_one(dict(s))
    return clean_doc(s)


# ----------------------------- wallet / ledger -----------------------------

async def ensure_wallet(user_id: str) -> dict:
    w = await db.wallets.find_one({"user_id": user_id})
    if not w:
        w = {
            "id": gen_id("w_"),
            "user_id": user_id,
            "deposit_balance": 0.0,
            "winnings_balance": 0.0,
            "bonus_balance": 0.0,
            "locked_balance": 0.0,
            "updated_at": now_iso(),
        }
        await db.wallets.insert_one(dict(w))
    return clean_doc(w)


async def wallet_ledger(user_id: str, ttype: str, amount: float,
                        bucket: str = "deposit_balance",
                        reference_id: Optional[str] = None,
                        note: str = "") -> dict:
    """Atomic-ish ledger entry. Uses find_one_modify style via read/update.

    Note: not truly atomic across balances; we serialize with a per-user lock in-memory
    for typical throughput this is acceptable in a demo/staging environment.
    """
    lock = _user_locks.setdefault(user_id, asyncio.Lock())
    async with lock:
        w = await ensure_wallet(user_id)
        before = w.get(bucket, 0.0)
        after = round(before + amount, 2)
        if after < -0.001:
            raise HTTPException(400, "insufficient_balance")
        upd = {bucket: after, "updated_at": now_iso()}
        await db.wallets.update_one({"user_id": user_id}, {"$set": upd})
        tx = {
            "id": gen_id("tx_"),
            "user_id": user_id,
            "type": ttype,
            "bucket": bucket,
            "amount": amount,
            "balance_before": before,
            "balance_after": after,
            "reference_id": reference_id,
            "note": note,
            "status": "completed",
            "created_at": now_iso(),
        }
        await db.wallet_transactions.insert_one(dict(tx))
        return clean_doc(tx)


_user_locks: Dict[str, asyncio.Lock] = {}


async def total_balance(user_id: str) -> float:
    w = await ensure_wallet(user_id)
    return round(w["deposit_balance"] + w["winnings_balance"] + w["bonus_balance"], 2)


# ----------------------------- notifications -----------------------------

async def notify(user_id: str, title: str, body: str, ntype: str = "info", ref_id: Optional[str] = None):
    doc = {
        "id": gen_id("n_"),
        "user_id": user_id,
        "title": title,
        "body": body,
        "type": ntype,
        "reference_id": ref_id,
        "read": False,
        "created_at": now_iso(),
    }
    await db.notifications.insert_one(dict(doc))


# ============================================================
# AUTH
# ============================================================

class SendOtpBody(BaseModel):
    mobile: str


class VerifyOtpBody(BaseModel):
    mobile: str
    otp: str
    referral_code: Optional[str] = None


@api.post("/auth/send-otp")
async def send_otp(body: SendOtpBody):
    mobile = body.mobile.strip()
    if not mobile.isdigit() or len(mobile) < 10:
        raise HTTPException(400, "invalid_mobile")
    otp = "123456"  # demo OTP; replace with SMS provider integration
    await db.otps.update_one(
        {"mobile": mobile},
        {"$set": {"mobile": mobile, "otp": otp, "created_at": now_iso()}},
        upsert=True,
    )
    return {"ok": True, "demo_otp": otp, "message": "Use OTP 123456 in demo mode."}


@api.post("/auth/verify-otp")
async def verify_otp(body: VerifyOtpBody):
    mobile = body.mobile.strip()
    row = await db.otps.find_one({"mobile": mobile})
    if not row or row.get("otp") != body.otp:
        raise HTTPException(400, "invalid_otp")

    user = await db.users.find_one({"mobile": mobile})
    if not user:
        username = "Player" + str(secrets.randbelow(9000) + 1000)
        user = {
            "id": gen_id("u_"),
            "mobile": mobile,
            "username": username,
            "profile_image": "",
            "referral_code": gen_code(8),
            "referred_by": None,
            "kyc_status": "not_started",
            "account_status": "active",
            "coin_won": 0,
            "games_played": 0,
            "referrals_count": 0,
            "created_at": now_iso(),
            "updated_at": now_iso(),
        }
        # apply referral if provided
        if body.referral_code:
            ref_user = await db.users.find_one({"referral_code": body.referral_code.strip().upper()})
            if ref_user:
                user["referred_by"] = ref_user["id"]
                await db.users.update_one({"id": ref_user["id"]}, {"$inc": {"referrals_count": 1}})
        await db.users.insert_one(dict(user))
        await ensure_wallet(user["id"])
        # demo mode signup bonus
        s = await get_settings()
        if s.get("demo_mode"):
            await wallet_ledger(user["id"], "signup_bonus", 500.0, bucket="deposit_balance",
                                note="Demo signup bonus")
            await notify(user["id"], "Welcome!", "₹500 demo bonus credited. Enjoy MY LUDO!", "info")

    token = make_jwt({"uid": user["id"], "mobile": mobile, "role": "user"})
    return {"token": token, "user": clean_doc(user)}


@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    w = await ensure_wallet(user["id"])
    return {"user": user, "wallet": w, "total_balance": await total_balance(user["id"])}


class UpdateProfileBody(BaseModel):
    username: Optional[str] = None
    profile_image: Optional[str] = None


@api.patch("/auth/profile")
async def update_profile(body: UpdateProfileBody, user: dict = Depends(get_current_user)):
    upd: Dict[str, Any] = {"updated_at": now_iso()}
    if body.username:
        # unique check
        existing = await db.users.find_one({"username": body.username, "id": {"$ne": user["id"]}})
        if existing:
            raise HTTPException(400, "username_taken")
        upd["username"] = body.username
    if body.profile_image is not None:
        upd["profile_image"] = body.profile_image
    await db.users.update_one({"id": user["id"]}, {"$set": upd})
    fresh = await db.users.find_one({"id": user["id"]})
    return clean_doc(fresh)


# ============================================================
# WALLET / DEPOSIT / WITHDRAW
# ============================================================

@api.get("/wallet")
async def wallet_info(user: dict = Depends(get_current_user)):
    w = await ensure_wallet(user["id"])
    return {"wallet": w, "total_balance": await total_balance(user["id"])}


@api.get("/wallet/transactions")
async def wallet_txs(user: dict = Depends(get_current_user), limit: int = 100):
    cursor = db.wallet_transactions.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).limit(limit)
    return await cursor.to_list(limit)


class DepositBody(BaseModel):
    amount: float
    utr: str
    screenshot_data_url: Optional[str] = None


@api.post("/deposits/create")
async def create_deposit(body: DepositBody, user: dict = Depends(get_current_user)):
    s = await get_settings()
    if body.amount < s["min_deposit"] or body.amount > s["max_deposit"]:
        raise HTTPException(400, "amount_out_of_range")
    utr = body.utr.strip()
    if not utr:
        raise HTTPException(400, "utr_required")
    existing = await db.deposits.find_one({"utr": utr})
    if existing:
        raise HTTPException(400, "duplicate_utr")
    doc = {
        "id": gen_id("dep_"),
        "user_id": user["id"],
        "username": user["username"],
        "amount": float(body.amount),
        "utr": utr,
        "screenshot": body.screenshot_data_url,
        "status": "pending",
        "created_at": now_iso(),
    }
    await db.deposits.insert_one(dict(doc))
    await notify(user["id"], "Deposit submitted", f"Your deposit of ₹{body.amount} is under review.", "deposit", doc["id"])
    return clean_doc(doc)


@api.get("/deposits/mine")
async def my_deposits(user: dict = Depends(get_current_user)):
    cur = db.deposits.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).limit(200)
    return await cur.to_list(200)


@api.get("/deposits/qr")
async def deposit_qr(amount: Optional[float] = None):
    s = await get_settings()
    vpa = s["upi_id"]
    name = s.get("payee_name") or "MY LUDO"
    upi_uri = f"upi://pay?pa={vpa}&pn={name}&cu=INR"
    if amount:
        upi_uri += f"&am={amount:.2f}"
    img = qrcode.make(upi_uri)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    data_url = "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()
    return {"upi_uri": upi_uri, "upi_id": vpa, "payee_name": name, "qr_data_url": data_url}


class WithdrawBody(BaseModel):
    amount: float
    method: str = "upi"  # upi | bank
    upi_id: Optional[str] = None
    holder_name: Optional[str] = None
    account_number: Optional[str] = None
    ifsc: Optional[str] = None
    bank_name: Optional[str] = None


@api.post("/withdrawals/create")
async def create_withdraw(body: WithdrawBody, user: dict = Depends(get_current_user)):
    s = await get_settings()
    if body.amount < s["min_withdraw"] or body.amount > s["max_withdraw"]:
        raise HTTPException(400, "amount_out_of_range")
    w = await ensure_wallet(user["id"])
    if w["winnings_balance"] < body.amount:
        raise HTTPException(400, "insufficient_winnings")
    method = (body.method or "upi").lower()
    if method == "upi":
        if not body.upi_id or "@" not in body.upi_id:
            raise HTTPException(400, "invalid_upi_id")
        payout_target = body.upi_id.strip()
    elif method == "bank":
        if not (body.account_number and body.ifsc and body.holder_name):
            raise HTTPException(400, "bank_details_required")
        payout_target = f"{body.holder_name} · A/C {body.account_number} · IFSC {body.ifsc.upper()}"
    else:
        raise HTTPException(400, "invalid_method")
    # Lock winnings
    await wallet_ledger(user["id"], "withdraw_lock", -body.amount, bucket="winnings_balance",
                        note=f"Withdraw request via {method.upper()}")
    doc = {
        "id": gen_id("wd_"),
        "user_id": user["id"],
        "username": user["username"],
        "amount": float(body.amount),
        "method": method,
        "upi_id": body.upi_id,
        "holder_name": body.holder_name,
        "account_number": body.account_number,
        "ifsc": body.ifsc.upper() if body.ifsc else None,
        "bank_name": body.bank_name,
        "payout_target": payout_target,
        "status": "pending",
        "created_at": now_iso(),
    }
    await db.withdrawals.insert_one(dict(doc))
    await notify(user["id"], "Withdrawal submitted", f"₹{body.amount} withdrawal is being processed via {method.upper()}.", "withdrawal", doc["id"])
    return clean_doc(doc)


@api.get("/withdrawals/mine")
async def my_withdrawals(user: dict = Depends(get_current_user)):
    cur = db.withdrawals.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).limit(200)
    return await cur.to_list(200)


# ============================================================
# KYC
# ============================================================

class KycBody(BaseModel):
    full_name: str
    dob: str
    pan: str
    upi_id: Optional[str] = None


@api.post("/kyc/submit")
async def submit_kyc(body: KycBody, user: dict = Depends(get_current_user)):
    doc = {
        "id": gen_id("kyc_"),
        "user_id": user["id"],
        "full_name": body.full_name,
        "dob": body.dob,
        "pan": body.pan.upper().strip(),
        "upi_id": body.upi_id,
        "status": "pending",
        "created_at": now_iso(),
    }
    await db.kyc.update_one({"user_id": user["id"]}, {"$set": doc}, upsert=True)
    await db.users.update_one({"id": user["id"]}, {"$set": {"kyc_status": "pending"}})
    return {"ok": True}


@api.get("/kyc/mine")
async def get_kyc(user: dict = Depends(get_current_user)):
    row = await db.kyc.find_one({"user_id": user["id"]}, {"_id": 0})
    return row or {"status": user.get("kyc_status", "not_started")}


# ============================================================
# ROOMS / BATTLES
# ============================================================

class CreateRoomBody(BaseModel):
    entry_amount: float


async def _debit_entry(user_id: str, amount: float, ref: str, note: str) -> None:
    w = await ensure_wallet(user_id)
    if w["deposit_balance"] + w["winnings_balance"] + w["bonus_balance"] < amount:
        raise HTTPException(400, "insufficient_balance")
    # priority: deposit -> winnings -> bonus
    remaining = amount
    for bucket in ("deposit_balance", "winnings_balance", "bonus_balance"):
        if remaining <= 0:
            break
        bal = (await ensure_wallet(user_id))[bucket]
        take = min(bal, remaining)
        if take > 0:
            await wallet_ledger(user_id, "battle_entry_lock", -take, bucket=bucket,
                                reference_id=ref, note=note)
            remaining -= take
    # accumulate locked
    await db.wallets.update_one({"user_id": user_id}, {"$inc": {"locked_balance": amount}})


@api.post("/rooms/create")
async def create_room(body: CreateRoomBody, user: dict = Depends(get_current_user)):
    s = await get_settings()
    if body.entry_amount not in s["battle_entries"] and (body.entry_amount < s["min_deposit"]):
        # allow custom amounts too but must be positive
        if body.entry_amount <= 0:
            raise HTTPException(400, "invalid_amount")
    # check already active
    active = await db.battles.find_one({"players": user["id"], "status": {"$in": ["waiting", "matched", "live"]}})
    if active:
        raise HTTPException(400, "already_in_battle")

    fee_pct = s["platform_fee_percent"]
    prize = round(body.entry_amount * 2 * (1 - fee_pct / 100), 2)
    code = gen_code(6)
    battle = {
        "id": gen_id("b_"),
        "room_code": code,
        "creator_id": user["id"],
        "creator_username": user["username"],
        "players": [user["id"]],
        "player_details": [{"id": user["id"], "username": user["username"], "profile_image": user.get("profile_image", "")}],
        "entry_amount": float(body.entry_amount),
        "prize_amount": prize,
        "platform_fee": round(body.entry_amount * 2 * fee_pct / 100, 2),
        "status": "waiting",
        "winner_id": None,
        "created_at": now_iso(),
        "started_at": None,
        "completed_at": None,
    }
    await _debit_entry(user["id"], body.entry_amount, battle["id"], f"Battle {code} entry lock")
    await db.battles.insert_one(dict(battle))
    await notify(user["id"], "Room created", f"Room code {code}. Share with opponent!", "room", battle["id"])
    return clean_doc(battle)


class JoinRoomBody(BaseModel):
    room_code: str


@api.post("/rooms/join")
async def join_room(body: JoinRoomBody, user: dict = Depends(get_current_user)):
    code = body.room_code.strip().upper()
    battle = await db.battles.find_one({"room_code": code})
    if not battle:
        raise HTTPException(404, "invalid_room_code")
    if battle["status"] != "waiting":
        raise HTTPException(400, "room_not_open")
    if user["id"] in battle["players"]:
        raise HTTPException(400, "already_joined")
    if len(battle["players"]) >= 2:
        raise HTTPException(400, "room_full")

    active = await db.battles.find_one({"players": user["id"], "status": {"$in": ["waiting", "matched", "live"]}})
    if active:
        raise HTTPException(400, "already_in_battle")

    await _debit_entry(user["id"], battle["entry_amount"], battle["id"], f"Battle {code} entry lock")

    # Initialize game state
    players = battle["players"] + [user["id"]]
    game_state = ludo.new_game_state(players)

    upd = {
        "players": players,
        "player_details": battle["player_details"] + [{"id": user["id"], "username": user["username"], "profile_image": user.get("profile_image", "")}],
        "status": "matched",
        "game_state": game_state,
        "started_at": now_iso(),
    }
    await db.battles.update_one({"id": battle["id"]}, {"$set": upd})
    battle.update(upd)
    await notify(battle["creator_id"], "Opponent joined!", f"{user['username']} joined room {code}. Game starting.", "room", battle["id"])
    await notify(user["id"], "Room joined", f"You joined {battle['creator_username']}'s battle for ₹{battle['entry_amount']}.", "room", battle["id"])
    await _broadcast(battle["id"], {"type": "opponent_joined", "battle": clean_doc(dict(battle))})
    return clean_doc(battle)


@api.get("/rooms/{battle_id}")
async def get_room(battle_id: str, user: dict = Depends(get_current_user)):
    battle = await db.battles.find_one({"id": battle_id}, {"_id": 0})
    if not battle:
        raise HTTPException(404, "not_found")
    return battle


@api.get("/battles/list")
async def list_battles(status_filter: str = Query("open", alias="status"), user: dict = Depends(get_current_user)):
    if status_filter == "open":
        q = {"status": "waiting"}
    elif status_filter == "running":
        q = {"status": {"$in": ["matched", "live"]}}
    elif status_filter == "completed":
        q = {"status": "completed"}
    else:
        q = {}
    cur = db.battles.find(q, {"_id": 0, "game_state": 0}).sort("created_at", -1).limit(50)
    return await cur.to_list(50)


@api.get("/battles/mine")
async def my_battles(user: dict = Depends(get_current_user)):
    cur = db.battles.find({"players": user["id"]}, {"_id": 0, "game_state": 0}).sort("created_at", -1).limit(100)
    return await cur.to_list(100)


class CancelBody(BaseModel):
    battle_id: str


@api.post("/rooms/cancel")
async def cancel_room(body: CancelBody, user: dict = Depends(get_current_user)):
    battle = await db.battles.find_one({"id": body.battle_id})
    if not battle:
        raise HTTPException(404, "not_found")
    if battle["creator_id"] != user["id"]:
        raise HTTPException(403, "not_creator")
    if battle["status"] != "waiting":
        raise HTTPException(400, "cannot_cancel")
    # refund each player
    for pid in battle["players"]:
        await wallet_ledger(pid, "battle_refund", battle["entry_amount"], bucket="deposit_balance",
                            reference_id=battle["id"], note=f"Cancelled battle {battle['room_code']}")
        await db.wallets.update_one({"user_id": pid}, {"$inc": {"locked_balance": -battle["entry_amount"]}})
    await db.battles.update_one({"id": battle["id"]}, {"$set": {"status": "cancelled", "completed_at": now_iso()}})
    return {"ok": True}


# ============================================================
# LUDO GAME — via HTTP + WebSocket
# ============================================================

# In-memory websocket subscribers per battle
_ws_rooms: Dict[str, List[WebSocket]] = {}


async def _broadcast(battle_id: str, msg: dict):
    conns = _ws_rooms.get(battle_id, [])
    dead = []
    for ws in conns:
        try:
            await ws.send_json(msg)
        except Exception:
            dead.append(ws)
    for ws in dead:
        try:
            conns.remove(ws)
        except ValueError:
            pass


@app.websocket("/api/ws/battle/{battle_id}")
async def ws_battle(ws: WebSocket, battle_id: str, token: str = Query(...)):
    try:
        payload = decode_jwt(token)
        uid = payload.get("uid")
    except Exception:
        await ws.close(code=4401)
        return
    battle = await db.battles.find_one({"id": battle_id})
    if not battle or uid not in battle["players"]:
        await ws.close(code=4403)
        return
    await ws.accept()
    _ws_rooms.setdefault(battle_id, []).append(ws)
    # send initial state
    await ws.send_json({"type": "state", "battle": clean_doc(dict(battle))})
    try:
        while True:
            _ = await ws.receive_text()  # heartbeat
    except WebSocketDisconnect:
        pass
    finally:
        try:
            _ws_rooms[battle_id].remove(ws)
        except (ValueError, KeyError):
            pass


class DiceRollBody(BaseModel):
    battle_id: str


@api.post("/game/roll")
async def roll_dice(body: DiceRollBody, user: dict = Depends(get_current_user)):
    battle = await db.battles.find_one({"id": body.battle_id})
    if not battle:
        raise HTTPException(404, "not_found")
    if user["id"] not in battle["players"]:
        raise HTTPException(403, "not_in_battle")
    if battle["status"] not in ("matched", "live"):
        raise HTTPException(400, "battle_not_active")
    state = battle["game_state"]
    p_idx = state["players"].index(user["id"])
    if state["turn"] != p_idx:
        raise HTTPException(400, "not_your_turn")
    if state["dice"] is not None:
        raise HTTPException(400, "dice_already_rolled")
    dice_val = ludo.roll_dice()
    new_state = ludo.set_dice(state, p_idx, dice_val)
    upd = {"game_state": new_state, "status": "live"}
    await db.battles.update_one({"id": battle["id"]}, {"$set": upd})
    battle.update(upd)
    await _broadcast(battle["id"], {"type": "dice_rolled", "dice": dice_val, "battle": clean_doc(dict(battle))})
    return {"dice": dice_val, "battle": clean_doc(dict(battle))}


class MoveBody(BaseModel):
    battle_id: str
    token_index: int
    dice: int


@api.post("/game/move")
async def move_token(body: MoveBody, user: dict = Depends(get_current_user)):
    battle = await db.battles.find_one({"id": body.battle_id})
    if not battle:
        raise HTTPException(404, "not_found")
    if user["id"] not in battle["players"]:
        raise HTTPException(403, "not_in_battle")
    if battle["status"] not in ("matched", "live"):
        raise HTTPException(400, "battle_not_active")
    state = battle["game_state"]
    p_idx = state["players"].index(user["id"])
    try:
        new_state = ludo.apply_move(state, p_idx, body.token_index, body.dice)
    except ValueError as e:
        raise HTTPException(400, str(e))

    upd: Dict[str, Any] = {"game_state": new_state, "status": "live"}
    if new_state["winner"] is not None:
        winner_id = new_state["players"][new_state["winner"]]
        upd["winner_id"] = winner_id
        upd["status"] = "completed"
        upd["completed_at"] = now_iso()
    await db.battles.update_one({"id": battle["id"]}, {"$set": upd})
    battle.update(upd)

    if new_state["winner"] is not None:
        await _settle_battle(battle)

    await _broadcast(battle["id"], {"type": "state", "battle": clean_doc(dict(battle))})
    return {"battle": clean_doc(dict(battle))}


class LeaveBody(BaseModel):
    battle_id: str


@api.post("/game/leave")
async def leave_game(body: LeaveBody, user: dict = Depends(get_current_user)):
    battle = await db.battles.find_one({"id": body.battle_id})
    if not battle:
        raise HTTPException(404, "not_found")
    if user["id"] not in battle["players"]:
        raise HTTPException(403, "not_in_battle")
    if battle["status"] not in ("matched", "live"):
        return {"ok": True}
    # Opponent wins
    opp_id = next(p for p in battle["players"] if p != user["id"])
    state = battle["game_state"]
    state["winner"] = state["players"].index(opp_id)
    upd = {"game_state": state, "status": "completed", "winner_id": opp_id, "completed_at": now_iso()}
    await db.battles.update_one({"id": battle["id"]}, {"$set": upd})
    battle.update(upd)
    await _settle_battle(battle)
    await _broadcast(battle["id"], {"type": "state", "battle": clean_doc(dict(battle))})
    return {"ok": True}


async def _settle_battle(battle: dict):
    """Credit winner, decrement locked_balance, referral commission."""
    winner_id = battle["winner_id"]
    entry = battle["entry_amount"]
    prize = battle["prize_amount"]
    # decrement locked for both
    for pid in battle["players"]:
        await db.wallets.update_one({"user_id": pid}, {"$inc": {"locked_balance": -entry}})
    # credit winner
    await wallet_ledger(winner_id, "battle_win", prize, bucket="winnings_balance",
                        reference_id=battle["id"], note=f"Won battle {battle['room_code']}")
    await db.users.update_one({"id": winner_id}, {"$inc": {"games_played": 1, "coin_won": int(prize)}})
    loser_id = next(p for p in battle["players"] if p != winner_id)
    await db.users.update_one({"id": loser_id}, {"$inc": {"games_played": 1}})

    # referral commission for both players' referrers
    s = await get_settings()
    ref_pct = float(s.get("referral_percent", 2))
    for pid in battle["players"]:
        u = await db.users.find_one({"id": pid})
        if u and u.get("referred_by"):
            commission = round(entry * ref_pct / 100, 2)
            if commission > 0:
                await wallet_ledger(u["referred_by"], "referral_reward", commission, bucket="bonus_balance",
                                    reference_id=battle["id"], note=f"Referral commission from {u['username']}")
                await notify(u["referred_by"], "Referral reward", f"You earned ₹{commission} from {u['username']}", "referral", battle["id"])

    winner = await db.users.find_one({"id": winner_id})
    await notify(winner_id, "You won!", f"₹{prize} credited to winnings.", "win", battle["id"])
    await notify(loser_id, "Better luck next time", f"Battle {battle['room_code']} completed.", "loss", battle["id"])


# ============================================================
# NOTIFICATIONS / SUPPORT / REFERRAL
# ============================================================

@api.get("/notifications")
async def get_notifications(user: dict = Depends(get_current_user)):
    cur = db.notifications.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).limit(100)
    return await cur.to_list(100)


@api.post("/notifications/read-all")
async def mark_read(user: dict = Depends(get_current_user)):
    await db.notifications.update_many({"user_id": user["id"], "read": False}, {"$set": {"read": True}})
    return {"ok": True}


@api.get("/referral")
async def referral_info(user: dict = Depends(get_current_user)):
    s = await get_settings()
    total_refs = await db.users.count_documents({"referred_by": user["id"]})
    ref_agg = await db.wallet_transactions.aggregate([
        {"$match": {"user_id": user["id"], "type": "referral_reward"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}},
    ]).to_list(1)
    total = ref_agg[0]["total"] if ref_agg else 0.0
    # referrer info
    applied_code = None
    if user.get("referred_by"):
        ref = await db.users.find_one({"id": user["referred_by"]})
        if ref:
            applied_code = ref.get("referral_code")
    w = await ensure_wallet(user["id"])
    return {
        "code": user["referral_code"],
        "percent": s["referral_percent"],
        "total_referrals": total_refs,
        "total_earnings": round(total, 2),
        "applied_code": applied_code,
        "bonus_balance": w.get("bonus_balance", 0),
    }


@api.post("/referral/redeem")
async def referral_redeem(user: dict = Depends(get_current_user)):
    w = await ensure_wallet(user["id"])
    amount = round(w.get("bonus_balance", 0), 2)
    if amount <= 0:
        raise HTTPException(400, "no_referral_earnings")
    await wallet_ledger(user["id"], "referral_redeem_debit", -amount, bucket="bonus_balance",
                        note="Redeemed to winnings")
    await wallet_ledger(user["id"], "referral_redeem_credit", amount, bucket="winnings_balance",
                        note="Referral earnings redeemed")
    await notify(user["id"], "Referral redeemed", f"₹{amount} moved to winnings. You can withdraw now.", "referral")
    return {"ok": True, "amount": amount}


class SupportTicketBody(BaseModel):
    subject: str
    message: str


@api.post("/support/ticket")
async def create_ticket(body: SupportTicketBody, user: dict = Depends(get_current_user)):
    doc = {
        "id": gen_id("t_"),
        "user_id": user["id"],
        "username": user["username"],
        "subject": body.subject,
        "status": "open",
        "messages": [{"from": "user", "text": body.message, "at": now_iso()}],
        "created_at": now_iso(),
    }
    await db.support_tickets.insert_one(dict(doc))
    return clean_doc(doc)


@api.get("/support/mine")
async def my_tickets(user: dict = Depends(get_current_user)):
    cur = db.support_tickets.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).limit(100)
    return await cur.to_list(100)


# ============================================================
# SETTINGS (public read)
# ============================================================

@api.get("/settings/public")
async def public_settings():
    s = await get_settings()
    # expose safe subset
    return {
        "app_name": s["app_name"],
        "logo_url": s.get("logo_url", ""),
        "support_number": s["support_number"],
        "whatsapp_number": s["whatsapp_number"],
        "upi_id": s["upi_id"],
        "min_deposit": s["min_deposit"],
        "max_deposit": s["max_deposit"],
        "min_withdraw": s["min_withdraw"],
        "max_withdraw": s["max_withdraw"],
        "battle_entries": s["battle_entries"],
        "platform_fee_percent": s["platform_fee_percent"],
        "referral_percent": s["referral_percent"],
        "demo_mode": s["demo_mode"],
        "real_money_mode": s["real_money_mode"],
        "maintenance_mode": s["maintenance_mode"],
    }


# ============================================================
# ADMIN
# ============================================================

class AdminLoginBody(BaseModel):
    username: str
    password: str


@api.post("/admin/login")
async def admin_login(body: AdminLoginBody):
    admin = await db.admin_users.find_one({"username": body.username})
    if not admin or admin.get("password") != body.password:
        raise HTTPException(401, "invalid_credentials")
    token = make_jwt({"role": "admin", "username": body.username})
    return {"token": token, "admin": {"username": body.username}}


@api.get("/admin/dashboard")
async def admin_dashboard(_: dict = Depends(get_admin)):
    total_users = await db.users.count_documents({})
    active_users = await db.users.count_documents({"account_status": "active"})
    total_battles = await db.battles.count_documents({})
    live_battles = await db.battles.count_documents({"status": {"$in": ["matched", "live"]}})
    completed_battles = await db.battles.count_documents({"status": "completed"})
    pending_deposits = await db.deposits.count_documents({"status": "pending"})
    pending_withdrawals = await db.withdrawals.count_documents({"status": "pending"})
    pending_kyc = await db.users.count_documents({"kyc_status": "pending"})
    tickets = await db.support_tickets.count_documents({"status": "open"})
    # sums via aggregation
    dep_agg = await db.deposits.aggregate([
        {"$match": {"status": "verified"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}},
    ]).to_list(1)
    dep_sum = dep_agg[0]["total"] if dep_agg else 0.0
    wd_agg = await db.withdrawals.aggregate([
        {"$match": {"status": "paid"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}},
    ]).to_list(1)
    wd_sum = wd_agg[0]["total"] if wd_agg else 0.0
    return {
        "total_users": total_users,
        "active_users": active_users,
        "total_battles": total_battles,
        "live_battles": live_battles,
        "completed_battles": completed_battles,
        "pending_deposits": pending_deposits,
        "pending_withdrawals": pending_withdrawals,
        "pending_kyc": pending_kyc,
        "open_tickets": tickets,
        "total_deposits": round(dep_sum, 2),
        "total_withdrawals": round(wd_sum, 2),
    }


@api.get("/admin/users")
async def admin_users(_: dict = Depends(get_admin), q: str = ""):
    query: Dict[str, Any] = {}
    if q:
        query = {"$or": [{"mobile": {"$regex": q}}, {"username": {"$regex": q, "$options": "i"}}]}
    cur = db.users.find(query, {"_id": 0}).sort("created_at", -1).limit(200)
    users = await cur.to_list(200)
    # attach wallet total
    for u in users:
        w = await db.wallets.find_one({"user_id": u["id"]}, {"_id": 0})
        u["wallet"] = w or {}
    return users


class UserStatusBody(BaseModel):
    user_id: str
    status: str  # active | suspended


@api.post("/admin/users/status")
async def admin_user_status(body: UserStatusBody, _: dict = Depends(get_admin)):
    if body.status not in ("active", "suspended"):
        raise HTTPException(400, "bad_status")
    await db.users.update_one({"id": body.user_id}, {"$set": {"account_status": body.status}})
    return {"ok": True}


@api.get("/admin/deposits")
async def admin_deposits(_: dict = Depends(get_admin), status_filter: str = "pending"):
    q = {} if status_filter == "all" else {"status": status_filter}
    cur = db.deposits.find(q, {"_id": 0}).sort("created_at", -1).limit(200)
    return await cur.to_list(200)


class DepositActionBody(BaseModel):
    deposit_id: str
    action: str  # verify | reject
    reason: Optional[str] = None


@api.post("/admin/deposits/action")
async def admin_deposit_action(body: DepositActionBody, admin: dict = Depends(get_admin)):
    dep = await db.deposits.find_one({"id": body.deposit_id})
    if not dep:
        raise HTTPException(404, "not_found")
    if dep["status"] != "pending":
        raise HTTPException(400, "already_processed")
    if body.action == "verify":
        await wallet_ledger(dep["user_id"], "deposit_verified", dep["amount"], bucket="deposit_balance",
                            reference_id=dep["id"], note=f"UTR {dep['utr']}")
        await db.deposits.update_one({"id": dep["id"]}, {"$set": {"status": "verified", "verified_at": now_iso()}})
        await notify(dep["user_id"], "Deposit approved", f"₹{dep['amount']} credited to your wallet.", "deposit", dep["id"])
    elif body.action == "reject":
        await db.deposits.update_one({"id": dep["id"]}, {"$set": {"status": "rejected", "reason": body.reason, "verified_at": now_iso()}})
        await notify(dep["user_id"], "Deposit rejected", body.reason or "Please contact support.", "deposit", dep["id"])
    else:
        raise HTTPException(400, "bad_action")
    return {"ok": True}


@api.get("/admin/withdrawals")
async def admin_withdrawals(_: dict = Depends(get_admin), status_filter: str = "pending"):
    q = {} if status_filter == "all" else {"status": status_filter}
    cur = db.withdrawals.find(q, {"_id": 0}).sort("created_at", -1).limit(200)
    return await cur.to_list(200)


class WithdrawActionBody(BaseModel):
    withdrawal_id: str
    action: str  # approve | reject | mark_paid
    reason: Optional[str] = None


@api.post("/admin/withdrawals/action")
async def admin_withdraw_action(body: WithdrawActionBody, _: dict = Depends(get_admin)):
    wd = await db.withdrawals.find_one({"id": body.withdrawal_id})
    if not wd:
        raise HTTPException(404, "not_found")
    if body.action == "reject":
        if wd["status"] not in ("pending", "processing"):
            raise HTTPException(400, "cant_reject")
        # refund
        await wallet_ledger(wd["user_id"], "withdraw_refund", wd["amount"], bucket="winnings_balance",
                            reference_id=wd["id"], note="Withdrawal rejected")
        await db.withdrawals.update_one({"id": wd["id"]}, {"$set": {"status": "rejected", "reason": body.reason, "processed_at": now_iso()}})
        await notify(wd["user_id"], "Withdrawal rejected", body.reason or "Refunded to winnings.", "withdrawal", wd["id"])
    elif body.action == "approve":
        await db.withdrawals.update_one({"id": wd["id"]}, {"$set": {"status": "processing", "processed_at": now_iso()}})
    elif body.action == "mark_paid":
        await db.withdrawals.update_one({"id": wd["id"]}, {"$set": {"status": "paid", "paid_at": now_iso()}})
        await notify(wd["user_id"], "Withdrawal paid", f"₹{wd['amount']} sent to {wd['upi_id']}", "withdrawal", wd["id"])
    else:
        raise HTTPException(400, "bad_action")
    return {"ok": True}


@api.get("/admin/battles")
async def admin_battles(_: dict = Depends(get_admin), status_filter: str = "all"):
    q = {} if status_filter == "all" else {"status": status_filter}
    cur = db.battles.find(q, {"_id": 0, "game_state": 0}).sort("created_at", -1).limit(200)
    return await cur.to_list(200)


@api.get("/admin/kyc")
async def admin_kyc(_: dict = Depends(get_admin)):
    cur = db.kyc.find({"status": "pending"}, {"_id": 0}).sort("created_at", -1).limit(200)
    return await cur.to_list(200)


class KycActionBody(BaseModel):
    user_id: str
    action: str  # approve | reject


@api.post("/admin/kyc/action")
async def admin_kyc_action(body: KycActionBody, _: dict = Depends(get_admin)):
    if body.action == "approve":
        st = "verified"
    elif body.action == "reject":
        st = "rejected"
    else:
        raise HTTPException(400, "bad_action")
    await db.kyc.update_one({"user_id": body.user_id}, {"$set": {"status": st}})
    await db.users.update_one({"id": body.user_id}, {"$set": {"kyc_status": st}})
    await notify(body.user_id, "KYC " + st, f"Your KYC has been {st}.", "kyc")
    return {"ok": True}


@api.get("/admin/settings")
async def admin_get_settings(_: dict = Depends(get_admin)):
    return await get_settings()


@api.post("/admin/settings")
async def admin_update_settings(body: dict, _: dict = Depends(get_admin)):
    allowed = set(DEFAULT_SETTINGS.keys())
    upd = {k: v for k, v in body.items() if k in allowed}
    await db.app_settings.update_one({"id": "global"}, {"$set": upd}, upsert=True)
    return await get_settings()


# ============================================================
# STARTUP
# ============================================================

@app.on_event("startup")
async def startup():
    await get_settings()
    # migrate old brand name
    await db.app_settings.update_one(
        {"id": "global", "app_name": {"$in": ["MY LUDO", ""]}},
        {"$set": {"app_name": "RDX LUDO", "payee_name": "RDX LUDO"}},
    )
    # seed admin
    if not await db.admin_users.find_one({"username": "admin"}):
        await db.admin_users.insert_one({
            "id": gen_id("adm_"),
            "username": "admin",
            "password": "admin@1234",
            "created_at": now_iso(),
        })
        log.info("Seeded admin user: admin / admin@1234")
    # indexes
    await db.users.create_index("id", unique=True)
    await db.users.create_index("mobile", unique=True)
    await db.users.create_index("referral_code", unique=True)
    await db.wallets.create_index("user_id", unique=True)
    await db.battles.create_index("room_code")
    await db.battles.create_index("status")
    await db.deposits.create_index("utr", unique=True)


@app.on_event("shutdown")
async def shutdown():
    client.close()


@api.get("/")
async def root():
    return {"app": "MY LUDO", "ok": True, "time": now_iso()}


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)
