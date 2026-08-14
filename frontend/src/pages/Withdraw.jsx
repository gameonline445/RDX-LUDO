import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/layouts/AppLayout";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

export default function Withdraw() {
  const { wallet, settings, refresh } = useAuth();
  const [amount, setAmount] = useState("");
  const [upi, setUpi] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  const submit = async () => {
    const a = parseFloat(amount);
    if (!a || a <= 0) { toast.error("Invalid amount"); return; }
    if (!upi.includes("@")) { toast.error("Enter valid UPI ID"); return; }
    setLoading(true);
    try {
      await api.post("/withdrawals/create", { amount: a, upi_id: upi, holder_name: name });
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
            <div className="heading text-xl font-extrabold text-slate-900" data-testid="wd-available">₹{Number(wallet?.winnings_balance || 0).toFixed(2)}</div>
          </div>
          <div className="text-right text-[11px] text-slate-500">
            Min ₹{settings.min_withdraw}<br />Max ₹{settings.max_withdraw}
          </div>
        </div>
      </div>

      <div className="card p-4 mt-3 space-y-3">
        <input data-testid="wd-amount-input" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
          className="w-full border border-slate-200 rounded-xl px-3 py-3 outline-none text-lg font-bold" />
        <input data-testid="wd-upi-input" placeholder="UPI ID (e.g. name@bank)" value={upi} onChange={(e) => setUpi(e.target.value)}
          className="w-full border border-slate-200 rounded-xl px-3 py-3 outline-none" />
        <input data-testid="wd-name-input" placeholder="Account holder name" value={name} onChange={(e) => setName(e.target.value)}
          className="w-full border border-slate-200 rounded-xl px-3 py-3 outline-none" />
        <button data-testid="submit-withdraw-btn" onClick={submit} disabled={loading} className="btn-primary w-full">
          {loading ? "Submitting…" : "Submit Withdrawal"}
        </button>
        <div className="text-[11px] text-slate-500 text-center">Withdrawals are reviewed by admin. Not instant.</div>
      </div>
    </AppLayout>
  );
}
