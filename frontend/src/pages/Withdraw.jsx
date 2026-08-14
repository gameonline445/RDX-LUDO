import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/layouts/AppLayout";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { Landmark, Smartphone, Info } from "lucide-react";

export default function Withdraw() {
  const { wallet, settings, refresh } = useAuth();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("upi"); // upi | bank
  // UPI
  const [upi, setUpi] = useState("");
  // Bank
  const [acc, setAcc] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [bank, setBank] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  const winnings = Number(wallet?.winnings_balance || 0);
  const noWinnings = winnings <= 0;

  const submit = async () => {
    const a = parseFloat(amount);
    if (!a || a <= 0) { toast.error("Amount enter karein"); return; }
    if (a < settings.min_withdraw) { toast.error(`Minimum ₹${settings.min_withdraw}`); return; }
    if (a > winnings) { toast.error(`Sirf ₹${winnings.toFixed(2)} winnings withdraw kar sakte hain`); return; }
    const body = { amount: a, method };
    if (method === "upi") {
      if (!upi.includes("@")) { toast.error("Valid UPI ID daaliye"); return; }
      body.upi_id = upi.trim();
      body.holder_name = name || undefined;
    } else {
      if (!acc || !ifsc || !name) { toast.error("Bank details poore bhariye"); return; }
      body.account_number = acc.trim();
      body.ifsc = ifsc.trim().toUpperCase();
      body.bank_name = bank.trim() || undefined;
      body.holder_name = name.trim();
    }
    setLoading(true);
    try {
      await api.post("/withdrawals/create", body);
      toast.success("Withdrawal request submitted");
      await refresh();
      nav("/wallet");
    } catch (e) { toast.error(e.message); } finally { setLoading(false); }
  };

  return (
    <AppLayout active="wallet">
      <h1 className="heading text-2xl font-extrabold text-slate-900">Withdraw</h1>

      <div className="card p-4 mt-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500">Available Winnings</div>
            <div className="heading text-2xl font-extrabold text-slate-900" data-testid="wd-available">₹{winnings.toFixed(2)}</div>
          </div>
          <div className="text-right text-[11px] text-slate-500">
            Min ₹{settings.min_withdraw}<br />Max ₹{settings.max_withdraw}
          </div>
        </div>
        {noWinnings && (
          <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2" data-testid="no-winnings-hint">
            <Info size={16} className="shrink-0 mt-0.5" />
            <div>
              <b>Sirf winnings withdraw ho sakti hain.</b> Deposit balance sirf battles ke liye hai. Battle jeetne pe prize aapki winnings me add hoga jise aap UPI ya bank me nikaal sakte hain. Referral bonus? Profile → Referral Redeem se winnings me le aayein.
            </div>
          </div>
        )}
      </div>

      {/* Method toggle */}
      <div className="grid grid-cols-2 gap-2 mt-4" data-testid="method-toggle">
        <button data-testid="method-upi" onClick={() => setMethod("upi")}
          className={`card p-3 flex items-center gap-2 border-2 ${method === "upi" ? "border-blue-600 bg-blue-50" : "border-slate-200"}`}>
          <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center"><Smartphone size={18} /></div>
          <div className="text-left">
            <div className="font-bold text-slate-900 text-sm">UPI</div>
            <div className="text-[10px] text-slate-500">PhonePe / GPay / Paytm</div>
          </div>
        </button>
        <button data-testid="method-bank" onClick={() => setMethod("bank")}
          className={`card p-3 flex items-center gap-2 border-2 ${method === "bank" ? "border-blue-600 bg-blue-50" : "border-slate-200"}`}>
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center"><Landmark size={18} /></div>
          <div className="text-left">
            <div className="font-bold text-slate-900 text-sm">Bank</div>
            <div className="text-[10px] text-slate-500">A/C + IFSC</div>
          </div>
        </button>
      </div>

      <div className="card p-4 mt-3 space-y-3">
        <input data-testid="wd-amount-input" placeholder="Amount (₹)" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
          className="w-full border border-slate-200 rounded-xl px-3 py-3 outline-none text-lg font-bold" />

        {method === "upi" ? (
          <>
            <input data-testid="wd-upi-input" placeholder="UPI ID (e.g. name@bank)" value={upi} onChange={(e) => setUpi(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-3 outline-none" />
            <input data-testid="wd-holder-name" placeholder="Account holder name (optional)" value={name} onChange={(e) => setName(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-3 outline-none" />
          </>
        ) : (
          <>
            <input data-testid="wd-account-name" placeholder="Account holder name (as per bank)" value={name} onChange={(e) => setName(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-3 outline-none" />
            <input data-testid="wd-account-number" placeholder="Account number" value={acc} onChange={(e) => setAcc(e.target.value.replace(/\D/g, ""))}
              className="w-full border border-slate-200 rounded-xl px-3 py-3 outline-none" />
            <input data-testid="wd-ifsc" placeholder="IFSC code (e.g. HDFC0001234)" value={ifsc} onChange={(e) => setIfsc(e.target.value.toUpperCase())}
              maxLength={11} className="w-full border border-slate-200 rounded-xl px-3 py-3 outline-none uppercase tracking-widest" />
            <input data-testid="wd-bank-name" placeholder="Bank name (optional)" value={bank} onChange={(e) => setBank(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-3 outline-none" />
          </>
        )}

        <button data-testid="submit-withdraw-btn" onClick={submit} disabled={loading || noWinnings} className="btn-primary w-full">
          {loading ? "Submitting…" : noWinnings ? "No winnings to withdraw" : "Submit Withdrawal"}
        </button>
        <div className="text-[11px] text-slate-500 text-center">Withdrawals ko admin review karta hai. Approve hone pe payment aapke {method === "upi" ? "UPI" : "Bank Account"} me bhej diya jayega.</div>
      </div>
    </AppLayout>
  );
}
