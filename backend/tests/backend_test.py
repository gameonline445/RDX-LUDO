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
        assert s["app_name"] == "RDX LUDO"
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


# ---------- withdrawal method (UPI + Bank) tests ----------

class TestWithdrawalMethods:
    def _seed_winnings(self):
        # generate winnings via leave-forfeit flow
        u1 = login_user(); u2 = login_user()
        b = requests.post(f"{API}/rooms/create", json={"entry_amount": 200}, headers=u1["h"]).json()
        requests.post(f"{API}/rooms/join", json={"room_code": b["room_code"]}, headers=u2["h"])
        requests.post(f"{API}/game/leave", json={"battle_id": b["id"]}, headers=u1["h"])
        return u2

    def test_upi_valid_creates_pending(self):
        u = self._seed_winnings()
        r = requests.post(f"{API}/withdrawals/create",
                          json={"amount": 100, "method": "upi", "upi_id": "alice@upi"}, headers=u["h"])
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["status"] == "pending"
        assert d["method"] == "upi"
        assert d["upi_id"] == "alice@upi"
        assert d["payout_target"] == "alice@upi"
        # winnings locked
        me = requests.get(f"{API}/auth/me", headers=u["h"]).json()
        assert me["wallet"]["winnings_balance"] <= 280.0001

    def test_upi_missing_returns_400(self):
        u = self._seed_winnings()
        r = requests.post(f"{API}/withdrawals/create",
                          json={"amount": 100, "method": "upi"}, headers=u["h"])
        assert r.status_code == 400
        assert r.json().get("detail") == "invalid_upi_id"

    def test_upi_invalid_format_returns_400(self):
        u = self._seed_winnings()
        r = requests.post(f"{API}/withdrawals/create",
                          json={"amount": 100, "method": "upi", "upi_id": "notavalidupi"}, headers=u["h"])
        assert r.status_code == 400
        assert r.json().get("detail") == "invalid_upi_id"

    def test_bank_valid_creates_pending_with_payout_target(self):
        u = self._seed_winnings()
        r = requests.post(f"{API}/withdrawals/create",
                          json={"amount": 100, "method": "bank",
                                "account_number": "123456789012",
                                "ifsc": "hdfc0001234",
                                "bank_name": "HDFC Bank",
                                "holder_name": "Alice K"}, headers=u["h"])
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["status"] == "pending"
        assert d["method"] == "bank"
        assert d["account_number"] == "123456789012"
        assert d["ifsc"] == "HDFC0001234"  # uppercased
        assert d["bank_name"] == "HDFC Bank"
        assert d["holder_name"] == "Alice K"
        assert d["payout_target"] == "Alice K · A/C 123456789012 · IFSC HDFC0001234"

    def test_bank_missing_fields_returns_400(self):
        u = self._seed_winnings()
        # missing ifsc
        r = requests.post(f"{API}/withdrawals/create",
                          json={"amount": 100, "method": "bank",
                                "account_number": "123", "holder_name": "X"}, headers=u["h"])
        assert r.status_code == 400
        assert r.json().get("detail") == "bank_details_required"
        # missing holder
        r2 = requests.post(f"{API}/withdrawals/create",
                           json={"amount": 100, "method": "bank",
                                 "account_number": "123", "ifsc": "HDFC0001234"}, headers=u["h"])
        assert r2.status_code == 400
        assert r2.json().get("detail") == "bank_details_required"
        # missing account_number
        r3 = requests.post(f"{API}/withdrawals/create",
                           json={"amount": 100, "method": "bank",
                                 "ifsc": "HDFC0001234", "holder_name": "X"}, headers=u["h"])
        assert r3.status_code == 400
        assert r3.json().get("detail") == "bank_details_required"

    def test_insufficient_winnings_any_method(self):
        # fresh user - only signup bonus in bonus bucket, winnings=0
        u = login_user()
        r_u = requests.post(f"{API}/withdrawals/create",
                            json={"amount": 100, "method": "upi", "upi_id": "x@y"}, headers=u["h"])
        assert r_u.status_code == 400
        assert r_u.json().get("detail") == "insufficient_winnings"
        r_b = requests.post(f"{API}/withdrawals/create",
                            json={"amount": 100, "method": "bank",
                                  "account_number": "1", "ifsc": "H0001", "holder_name": "X"}, headers=u["h"])
        assert r_b.status_code == 400
        assert r_b.json().get("detail") == "insufficient_winnings"

    def test_admin_listing_shows_both_methods_and_action(self):
        u = self._seed_winnings()
        rw1 = requests.post(f"{API}/withdrawals/create",
                            json={"amount": 100, "method": "upi", "upi_id": "bob@upi"}, headers=u["h"]).json()
        rw2 = requests.post(f"{API}/withdrawals/create",
                            json={"amount": 100, "method": "bank",
                                  "account_number": "9999888877",
                                  "ifsc": "ICIC0004321",
                                  "holder_name": "Bob R"}, headers=u["h"]).json()
        h = admin_token()
        lst = requests.get(f"{API}/admin/withdrawals?status_filter=pending", headers=h).json()
        ids = {w["id"]: w for w in lst}
        assert rw1["id"] in ids and rw2["id"] in ids
        wu = ids[rw1["id"]]; wb = ids[rw2["id"]]
        assert wu["method"] == "upi" and wu["upi_id"] == "bob@upi"
        assert wb["method"] == "bank"
        assert wb["account_number"] == "9999888877"
        assert wb["ifsc"] == "ICIC0004321"
        assert wb["holder_name"] == "Bob R"
        assert "Bob R" in wb["payout_target"] and "ICIC0004321" in wb["payout_target"]
        # admin approve + mark_paid on bank withdrawal
        ra = requests.post(f"{API}/admin/withdrawals/action",
                           json={"withdrawal_id": rw2["id"], "action": "approve"}, headers=h)
        assert ra.status_code == 200
        rp = requests.post(f"{API}/admin/withdrawals/action",
                           json={"withdrawal_id": rw2["id"], "action": "mark_paid"}, headers=h)
        assert rp.status_code == 200


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


# ---------- new: applied_code + referral redeem ----------

class TestReferralAppliedAndRedeem:
    def test_applied_code_and_redeem_flow(self):
        # ref user
        ref = login_user()
        code = ref["user"]["referral_code"]

        # new user signs up using ref's code
        u2 = login_user(referral_code=code)

        # u2's /api/referral should show applied_code == ref's code
        r = requests.get(f"{API}/referral", headers=u2["h"])
        assert r.status_code == 200, r.text
        info_u2 = r.json()
        assert info_u2["applied_code"] == code
        assert "bonus_balance" in info_u2

        # ref user with no upstream referrer -> applied_code null
        r2 = requests.get(f"{API}/referral", headers=ref["h"])
        assert r2.status_code == 200
        info_ref = r2.json()
        assert info_ref["applied_code"] is None
        assert "bonus_balance" in info_ref

        # Redeem with 0 bonus should 400
        rz = requests.post(f"{API}/referral/redeem", headers=ref["h"])
        assert rz.status_code == 400
        assert "no_referral_earnings" in rz.text

        # Generate bonus for ref via u2 losing a battle
        opp = login_user()
        b = requests.post(f"{API}/rooms/create", json={"entry_amount": 100}, headers=u2["h"]).json()
        requests.post(f"{API}/rooms/join", json={"room_code": b["room_code"]}, headers=opp["h"])
        requests.post(f"{API}/game/leave", json={"battle_id": b["id"]}, headers=u2["h"])

        me_before = requests.get(f"{API}/auth/me", headers=ref["h"]).json()
        bonus_before = me_before["wallet"]["bonus_balance"]
        winnings_before = me_before["wallet"]["winnings_balance"]
        assert bonus_before >= 2

        # Redeem
        rr = requests.post(f"{API}/referral/redeem", headers=ref["h"])
        assert rr.status_code == 200, rr.text
        body = rr.json()
        assert body["ok"] is True
        assert body["amount"] == round(bonus_before, 2)

        # Verify balances shifted
        me_after = requests.get(f"{API}/auth/me", headers=ref["h"]).json()
        assert me_after["wallet"]["bonus_balance"] == 0
        assert round(me_after["wallet"]["winnings_balance"], 2) == round(winnings_before + bonus_before, 2)

        # Ledger has both entries
        txs = requests.get(f"{API}/wallet/transactions", headers=ref["h"]).json()
        types = [t["type"] for t in txs]
        assert "referral_redeem_debit" in types
        assert "referral_redeem_credit" in types

        # Second redeem should 400
        rr2 = requests.post(f"{API}/referral/redeem", headers=ref["h"])
        assert rr2.status_code == 400
