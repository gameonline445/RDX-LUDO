import React, { useEffect, useState } from "react";
import AppLayout from "@/layouts/AppLayout";
import { api } from "@/lib/api";

const tabs = ["all", "battles", "deposits", "withdrawals", "winnings", "referrals"];

export default function History() {
  const [tab, setTab] = useState("all");
  const [txs, setTxs] = useState([]);
  const [battles, setBattles] = useState([]);
  const [dep, setDep] = useState([]);
  const [wd, setWd] = useState([]);

  useEffect(() => {
    api.get("/wallet/transactions").then(r => setTxs(r.data));
    api.get("/battles/mine").then(r => setBattles(r.data));
    api.get("/deposits/mine").then(r => setDep(r.data));
    api.get("/withdrawals/mine").then(r => setWd(r.data));
  }, []);

  const filtered = (() => {
    if (tab === "all") return txs;
    if (tab === "battles") return battles.map(b => ({ id: b.id, type: `Battle ${b.room_code}`, amount: b.status === "completed" ? (b.winner_id ? b.prize_amount : -b.entry_amount) : -b.entry_amount, created_at: b.created_at, note: `Status: ${b.status}` }));
    if (tab === "deposits") return dep.map(d => ({ id: d.id, type: "Deposit", amount: d.amount, created_at: d.created_at, note: `Status: ${d.status}` }));
    if (tab === "withdrawals") return wd.map(d => ({ id: d.id, type: "Withdraw", amount: -d.amount, created_at: d.created_at, note: `Status: ${d.status}` }));
    if (tab === "winnings") return txs.filter(t => t.type === "battle_win");
    if (tab === "referrals") return txs.filter(t => t.type === "referral_reward");
    return [];
  })();

  return (
    <AppLayout>
      <h1 className="heading text-2xl font-extrabold text-slate-900">History</h1>
      <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
        {tabs.map(t => (
          <button key={t} data-testid={`history-tab-${t}`} onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-full border font-bold text-xs uppercase whitespace-nowrap ${tab === t ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-700 border-slate-200"}`}>{t}</button>
        ))}
      </div>
      <div className="space-y-2 mt-3">
        {filtered.length === 0 && <div className="card p-4 text-slate-500 text-sm text-center">No records.</div>}
        {filtered.map((t) => (
          <div key={t.id} className="card p-3 flex items-center justify-between">
            <div>
              <div className="font-semibold text-slate-800 text-sm">{t.type?.replaceAll?.("_"," ")}</div>
              <div className="text-[11px] text-slate-500">{t.note || ""} · {new Date(t.created_at).toLocaleString()}</div>
            </div>
            <div className={`font-extrabold ${(t.amount || 0) >= 0 ? "text-emerald-600" : "text-red-600"}`}>{(t.amount || 0) >= 0 ? "+" : ""}₹{Number(t.amount || 0).toFixed(2)}</div>
          </div>
        ))}
      </div>
    </AppLayout>
  );
}
