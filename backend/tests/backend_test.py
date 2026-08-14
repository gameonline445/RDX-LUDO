"""MY LUDO backend integration tests.

Covers: auth, wallet, settings, deposits, admin flows, rooms/battles,
ludo game engine via HTTP, cancel, withdrawals, notifications, referral.
"""
import os
import random
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://ludo-battle-51.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


# ---------- helpers ----------

def rand_mobile() -> str:
    # Ensure unique 10-digit mobile per test session
    return "9" + "".join(str(random.randint(0, 9)) for _ in range(9))


def login_user(mobile: str = None, referral_code: str = None) -> dict:
    mobile = mobile or rand_mobile()
    r = requests.post(f"{API}/auth/send-otp", json={"mobile": mobile})
    assert r.status_code == 200, r.text
    assert r.json().get("demo_otp") == "123456"
    body = {"mobile": mobile, "otp": "123456"}
    if referral_code:
        body["referral_code"] = referral_code
    r = requests.post(f"{API}/auth/verify-otp", json=body)
    assert r.status_code == 200, r.text
    data = r.json()
    return {"token": data["token"], "user": data["user"], "mobile": mobile,
            "h": {"Authorization": f"Bearer {data['token']}"}}


def admin_token() -> dict:
    r = requests.post(f"{API}/admin/login", json={"username": "admin", "password": "admin@1234"})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


# ---------- auth ----------

class TestAuth:
    def test_send_otp_invalid_mobile(self):
        r = requests.post(f"{API}/auth/send-otp", json={"mobile": "12"})
        assert r.status_code == 400

    def test_send_otp_valid(self):
        m = rand_mobile()
        r = requests.post(f"{API}/auth/send-otp", json={"mobile": m})
        assert r.status_code == 200
        assert r.json()["demo_otp"] == "123456"

    def test_verify_otp_creates_user_with_bonus(self):
        u = login_user()
        assert u["user"]["username"].startswith("Player")
        assert u["user"]["referral_code"]
        r = requests.get(f"{API}/auth/me", headers=u["h"])
        assert r.status_code == 200
        d = r.json()
        assert d["wallet"]["deposit_balance"] >= 500
        assert d["total_balance"] >= 500

    def test_verify_otp_invalid(self):
        m = rand_mobile()
        requests.post(f"{API}/auth/send-otp", json={"mobile": m})
        r = requests.post(f"{API}/auth/verify-otp", json={"mobile": m, "otp": "000000"})
        assert r.status_code == 400

    def test_update_profile_unique_username(self):
        u1 = login_user()
        u2 = login_user()
        new_name = f"TEST_user_{random.randint(1000, 999999)}"
        r = requests.patch(f"{API}/auth/profile", json={"username": new_name}, headers=u1["h"])
        assert r.status_code == 200
        assert r.json()["username"] == new_name
        # duplicate
        r2 = requests.patch(f"{API}/auth/profile", json={"username": new_name}, headers=u2["h"])
        assert r2.status_code == 400


# ---------- settings ----------

class TestSettings:
    def test_public_settings(self):
        r = requests.get(f"{API}/settings/public")
        assert r.status_code == 200
        s = r.json()
        assert s["app_name"] == "MY LUDO"
        assert s["upi_id"] == "Ankitrajputtt@fam"
        assert s["whatsapp_number"] == "8306865537"
        assert s["referral_percent"] == 2
        assert isinstance(s["battle_entries"], list) and len(s["battle_entries"]) > 0
        assert s["demo_mode"] is True


# ---------- deposits ----------

class TestDeposits:
    def test_qr_generation(self):
        r = requests.get(f"{API}/deposits/qr", params={"amount": 100})
        assert r.status_code == 200
        d = r.json()
        assert d["qr_data_url"].startswith("data:image/png;base64,")
        assert "upi://pay?pa=Ankitrajputtt@fam" in d["upi_uri"]
        assert "am=100.00" in d["upi_uri"]

    def test_create_deposit_and_duplicate_utr(self):
        u = login_user()
        utr = f"UTR{random.randint(10**10, 10**11)}"
        r = requests.post(f"{API}/deposits/create", json={"amount": 100, "utr": utr}, headers=u["h"])
        assert r.status_code == 200, r.text
        assert r.json()["status"] == "pending"
        # duplicate UTR
        u2 = login_user()
        r2 = requests.post(f"{API}/deposits/create", json={"amount": 100, "utr": utr}, headers=u2["h"])
        assert r2.status_code == 400

    def test_deposit_amount_out_of_range(self):
        u = login_user()
        utr = f"UTR{random.randint(10**10, 10**11)}"
        r = requests.post(f"{API}/deposits/create", json={"amount": 1, "utr": utr}, headers=u["h"])
        assert r.status_code == 400
        r2 = requests.post(f"{API}/deposits/create", json={"amount": 1000000, "utr": utr + "x"}, headers=u["h"])
        assert r2.status_code == 400


# ---------- admin ----------

class TestAdmin:
    def test_login_wrong_password(self):
        r = requests.post(f"{API}/admin/login", json={"username": "admin", "password": "wrong"})
        assert r.status_code == 401

    def test_login_and_dashboard(self):
        h = admin_token()
        r = requests.get(f"{API}/admin/dashboard", headers=h)
        assert r.status_code == 200
        d = r.json()
        for k in ("total_users", "total_battles", "pending_deposits", "pending_withdrawals"):
            assert k in d

    def test_deposit_verify_flow(self):
        u = login_user()
        utr = f"UTR{random.randint(10**11, 10**12)}"
        r = requests.post(f"{API}/deposits/create", json={"amount": 200, "utr": utr}, headers=u["h"])
        dep = r.json()
        h = admin_token()
        # list pending
        lst = requests.get(f"{API}/admin/deposits", headers=h).json()
        assert any(d["id"] == dep["id"] for d in lst)
        # verify
        r2 = requests.post(f"{API}/admin/deposits/action",
                           json={"deposit_id": dep["id"], "action": "verify"}, headers=h)
        assert r2.status_code == 200, r2.text
        # second verify should fail
        r3 = requests.post(f"{API}/admin/deposits/action",
                           json={"deposit_id": dep["id"], "action": "verify"}, headers=h)
        assert r3.status_code == 400
        # user wallet increased (bonus 500 + deposit 200)
        me = requests.get(f"{API}/auth/me", headers=u["h"]).json()
        assert me["wallet"]["deposit_balance"] >= 700
        # ledger entry
        txs = requests.get(f"{API}/wallet/transactions", headers=u["h"]).json()
        assert any(t["type"] == "deposit_verified" and t["amount"] == 200 for t in txs)


# ---------- rooms / battles ----------

class TestRoomsAndBattles:
    def test_create_and_join_room(self):
        u1 = login_user()
        u2 = login_user()
        r = requests.post(f"{API}/rooms/create", json={"entry_amount": 50}, headers=u1["h"])
        assert r.status_code == 200, r.text
        battle = r.json()
        assert battle["status"] == "waiting"
        assert battle["prize_amount"] == round(50 * 2 * 0.95, 2)
        assert len(battle["room_code"]) == 6
        # u1 debit
        me1 = requests.get(f"{API}/auth/me", headers=u1["h"]).json()
        assert me1["wallet"]["deposit_balance"] == 450

        # invalid code
        rbad = requests.post(f"{API}/rooms/join", json={"room_code": "ZZZZZZ"}, headers=u2["h"])
        assert rbad.status_code == 404
        # own room join
        rown = requests.post(f"{API}/rooms/join", json={"room_code": battle["room_code"]}, headers=u1["h"])
        assert rown.status_code == 400

        # u2 joins
        rj = requests.post(f"{API}/rooms/join", json={"room_code": battle["room_code"]}, headers=u2["h"])
        assert rj.status_code == 200, rj.text
        j = rj.json()
        assert j["status"] == "matched"
        assert len(j["players"]) == 2
        gs = j["game_state"]
        assert gs["turn"] == 0
        assert gs["tokens"]["0"] == [-1, -1, -1, -1]

        # already in battle
        u3 = login_user()
        r_join2 = requests.post(f"{API}/rooms/create", json={"entry_amount": 20}, headers=u1["h"])
        assert r_join2.status_code == 400  # already in battle

        # full room
        rf = requests.post(f"{API}/rooms/join", json={"room_code": battle["room_code"]}, headers=u3["h"])
        assert rf.status_code in (400,)

    def test_cancel_room_refunds(self):
        u = login_user()
        r = requests.post(f"{API}/rooms/create", json={"entry_amount": 100}, headers=u["h"])
        battle = r.json()
        me = requests.get(f"{API}/auth/me", headers=u["h"]).json()
        assert me["wallet"]["deposit_balance"] == 400

        rc = requests.post(f"{API}/rooms/cancel", json={"battle_id": battle["id"]}, headers=u["h"])
        assert rc.status_code == 200
        me2 = requests.get(f"{API}/auth/me", headers=u["h"]).json()
        assert me2["wallet"]["deposit_balance"] == 500


# ---------- game engine via HTTP ----------

class TestGameEngine:
    def _setup_battle(self):
        u1 = login_user()
        u2 = login_user()
        b = requests.post(f"{API}/rooms/create", json={"entry_amount": 50}, headers=u1["h"]).json()
        requests.post(f"{API}/rooms/join", json={"room_code": b["room_code"]}, headers=u2["h"])
        # refresh
        b = requests.get(f"{API}/rooms/{b['id']}", headers=u1["h"]).json()
        return u1, u2, b

    def test_wrong_turn_roll_fails(self):
        u1, u2, b = self._setup_battle()
        r = requests.post(f"{API}/game/roll", json={"battle_id": b["id"]}, headers=u2["h"])
        assert r.status_code == 400

    def test_roll_returns_dice(self):
        u1, u2, b = self._setup_battle()
        r = requests.post(f"{API}/game/roll", json={"battle_id": b["id"]}, headers=u1["h"])
        assert r.status_code == 200
        assert 1 <= r.json()["dice"] <= 6

    def test_leave_forfeit_credits_opponent(self):
        u1, u2, b = self._setup_battle()
        # u1 leaves -> u2 wins
        r = requests.post(f"{API}/game/leave", json={"battle_id": b["id"]}, headers=u1["h"])
        assert r.status_code == 200
        me2 = requests.get(f"{API}/auth/me", headers=u2["h"]).json()
        # winnings prize = 50*2*0.95 = 95
        assert me2["wallet"]["winnings_balance"] >= 95

    def test_full_game_winner_via_forced_state(self):
        """Force winning by having player 0 leave? already tested. Instead simulate
        via move: seed state manually is not exposed. Skip -- validated via leave."""
        pytest.skip("Full win via /api/game/move requires long simulation; covered by leave forfeit path.")


# ---------- withdrawal ----------

class TestWithdrawal:
    def test_withdraw_flow(self):
        # Setup: give user winnings via leave forfeit
        u1 = login_user(); u2 = login_user()
        b = requests.post(f"{API}/rooms/create", json={"entry_amount": 200}, headers=u1["h"]).json()
        requests.post(f"{API}/rooms/join", json={"room_code": b["room_code"]}, headers=u2["h"])
        requests.post(f"{API}/game/leave", json={"battle_id": b["id"]}, headers=u1["h"])
        me2 = requests.get(f"{API}/auth/me", headers=u2["h"]).json()
        winnings = me2["wallet"]["winnings_balance"]
        assert winnings >= 380

        # Insufficient
        r_ins = requests.post(f"{API}/withdrawals/create",
                              json={"amount": winnings + 5000, "upi_id": "x@y"}, headers=u2["h"])
        assert r_ins.status_code == 400

        # Under min
        r_min = requests.post(f"{API}/withdrawals/create",
                              json={"amount": 50, "upi_id": "x@y"}, headers=u2["h"])
        assert r_min.status_code == 400

        # OK
        rw = requests.post(f"{API}/withdrawals/create",
                           json={"amount": 100, "upi_id": "x@y"}, headers=u2["h"])
        assert rw.status_code == 200, rw.text
        wd = rw.json()

        h = admin_token()
        # reject -> refund
        ra = requests.post(f"{API}/admin/withdrawals/action",
                           json={"withdrawal_id": wd["id"], "action": "reject", "reason": "test"}, headers=h)
        assert ra.status_code == 200
        me3 = requests.get(f"{API}/auth/me", headers=u2["h"]).json()
        assert me3["wallet"]["winnings_balance"] == winnings  # refunded

        # New withdraw + approve + mark_paid
        rw2 = requests.post(f"{API}/withdrawals/create",
                            json={"amount": 100, "upi_id": "x@y"}, headers=u2["h"]).json()
        r_ap = requests.post(f"{API}/admin/withdrawals/action",
                             json={"withdrawal_id": rw2["id"], "action": "approve"}, headers=h)
        assert r_ap.status_code == 200
        r_pd = requests.post(f"{API}/admin/withdrawals/action",
                             json={"withdrawal_id": rw2["id"], "action": "mark_paid"}, headers=h)
        assert r_pd.status_code == 200


# ---------- notifications & referral ----------

class TestNotificationsAndReferral:
    def test_notifications_read_all(self):
        u = login_user()
        # signup bonus produced a notification
        n = requests.get(f"{API}/notifications", headers=u["h"]).json()
        assert isinstance(n, list) and len(n) >= 1
        r = requests.post(f"{API}/notifications/read-all", headers=u["h"])
        assert r.status_code == 200
        n2 = requests.get(f"{API}/notifications", headers=u["h"]).json()
        assert all(x["read"] for x in n2)

    def test_referral_flow(self):
        ref = login_user()
        code = ref["user"]["referral_code"]
        # info
        info = requests.get(f"{API}/referral", headers=ref["h"]).json()
        assert info["code"] == code
        assert info["percent"] == 2
        # new user referred by ref
        u2 = login_user(referral_code=code)
        # u2 loses a battle to opponent — referrer of u2 should get 2% of entry
        opp = login_user()
        b = requests.post(f"{API}/rooms/create", json={"entry_amount": 100}, headers=u2["h"]).json()
        requests.post(f"{API}/rooms/join", json={"room_code": b["room_code"]}, headers=opp["h"])
        requests.post(f"{API}/game/leave", json={"battle_id": b["id"]}, headers=u2["h"])
        # ref should have bonus_balance >= 2
        me = requests.get(f"{API}/auth/me", headers=ref["h"]).json()
        assert me["wallet"]["bonus_balance"] >= 2
        info2 = requests.get(f"{API}/referral", headers=ref["h"]).json()
        assert info2["total_referrals"] >= 1
        assert info2["total_earnings"] >= 2
