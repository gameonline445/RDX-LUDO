import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppLayout from "@/layouts/AppLayout";
import { Plus, ArrowDownToLine, Wallet as W, Trophy } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function Wallet() {
  const { wallet, totalBalance, refresh } = useAuth();
  const [txs, setTxs] = useState([]);
  useEffect(() => { refresh(); api.get("/wallet/transactions").then(r => setTxs(r.data)).catch(() => {}); }, []);

  return (
    <AppLayout active="wallet">
      <h1 className="heading text-2xl font-extrabold text-slate-900">My Wallet</h1>
      <div className="card p-5 mt-3 bg-gradient-to-br from-slate-900 to-slate-800 text-white border-0 shadow-xl">
        <div className="text-xs uppercase tracking-widest text-slate-300">Total Balance</div>
        <div className="heading text-4xl font-extrabold mt-1" data-testid="wallet-total">₹{Number(totalBalance).toFixed(2)}</div>
        <div className="flex gap-2 mt-4">
          <Link to="/wallet/add" data-testid="add-cash-btn" className="flex-1 bg-emerald-500 hover:bg-emerald-600 rounded-xl py-2.5 text-center font-bold flex items-center justify-center gap-1"><Plus size={18} /> Add Cash</Link>
          <Link to="/wallet/withdraw" data-testid="withdraw-btn" className="flex-1 bg-white/10 hover:bg-white/20 rounded-xl py-2.5 text-center font-bold flex items-center justify-center gap-1 border border-white/20"><ArrowDownToLine size={18} /> Withdraw</Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-4">
        <div className="card p-4">
          <div className="flex items-center gap-2"><div className="icon-tile bg-emerald-500 w-9 h-9"><W size={16} /></div><span className="text-xs font-bold text-slate-500">DEPOSIT</span></div>
          <div className="heading text-xl font-extrabold text-slate-900 mt-2" data-testid="deposit-balance">₹{Number(wallet?.deposit_balance || 0).toFixed(2)}</div>
          <div className="text-[11px] text-slate-500 mt-1">For battles only</div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2"><div className="icon-tile bg-blue-600 w-9 h-9"><Trophy size={16} /></div><span className="text-xs font-bold text-slate-500">WINNINGS</span></div>
          <div className="heading text-xl font-extrabold text-slate-900 mt-2" data-testid="winnings-balance">₹{Number(wallet?.winnings_balance || 0).toFixed(2)}</div>
          <div className="text-[11px] text-slate-500 mt-1">Can withdraw</div>
        </div>
      </div>

      <div className="mt-6 text-xs font-bold tracking-widest text-slate-500">TRANSACTION HISTORY</div>
      <div className="space-y-2 mt-2">
        {txs.length === 0 && <div className="card p-4 text-sm text-slate-500 text-center">No transactions yet.</div>}
        {txs.map(t => (
          <div key={t.id} className="card p-3 flex items-center justify-between" data-testid={`tx-${t.id}`}>
            <div>
              <div className="font-semibold text-slate-800 text-sm">{t.type.replaceAll("_"," ")}</div>
              <div className="text-[11px] text-slate-500">{t.note || t.bucket} · {new Date(t.created_at).toLocaleString()}</div>
            </div>
            <div className={`font-extrabold ${t.amount >= 0 ? "text-emerald-600" : "text-red-600"}`}>{t.amount >= 0 ? "+" : ""}₹{Number(t.amount).toFixed(2)}</div>
          </div>
        ))}
      </div>
    </AppLayout>
  );
}
