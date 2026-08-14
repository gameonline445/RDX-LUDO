import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import AppLayout from "@/layouts/AppLayout";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Coins } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function CreateRoom() {
  const [params] = useSearchParams();
  const [amount, setAmount] = useState(params.get("amount") || "50");
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();
  const { settings, totalBalance, refresh } = useAuth();

  const create = async () => {
    const a = parseFloat(amount);
    if (!a || a <= 0) { toast.error("Invalid amount"); return; }
    if (a > totalBalance) { toast.error("Insufficient balance. Please add cash."); return; }
    setLoading(true);
    try {
      const { data } = await api.post("/rooms/create", { entry_amount: a });
      await refresh();
      toast.success(`Room ${data.room_code} created!`);
      nav(`/lobby/${data.id}`);
    } catch (e) { toast.error(e.message); } finally { setLoading(false); }
  };

  return (
    <AppLayout active="home">
      <h1 className="heading text-2xl font-extrabold text-slate-900">Create Room</h1>
      <p className="text-slate-500 text-sm mt-1">Pick entry, we'll generate a room code.</p>

      <div className="card p-4 mt-4">
        <label className="text-xs font-bold tracking-wider text-slate-500">ENTRY AMOUNT</label>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-slate-500 font-bold text-lg">₹</span>
          <input data-testid="create-amount-input" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
            className="flex-1 border border-slate-200 rounded-xl px-3 py-3 text-lg font-bold outline-none" />
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          {(settings.battle_entries || [10, 20, 50, 100, 200, 500, 1000]).map((v) => (
            <button key={v} data-testid={`quick-amount-${v}`} onClick={() => setAmount(String(v))}
              className={`px-3 py-1.5 rounded-full border text-sm font-bold ${String(amount) === String(v) ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-700 border-slate-200"}`}>₹{v}</button>
          ))}
        </div>
      </div>

      <div className="card p-4 mt-4 flex items-center gap-3">
        <div className="icon-tile bg-emerald-500"><Coins size={20} /></div>
        <div className="flex-1">
          <div className="text-xs text-slate-500">Available Balance</div>
          <div className="font-bold text-slate-900">₹{Number(totalBalance).toFixed(2)}</div>
        </div>
      </div>

      <button data-testid="confirm-create-btn" onClick={create} disabled={loading} className="btn-primary w-full mt-6">
        {loading ? "Creating…" : `Lock ₹${amount || 0} & Create Room`}
      </button>
    </AppLayout>
  );
}
