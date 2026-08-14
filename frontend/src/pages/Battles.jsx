import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AppLayout from "@/layouts/AppLayout";
import { api } from "@/lib/api";
import { Swords, Flame, Trophy, Plus, KeyRound } from "lucide-react";
import { toast } from "sonner";

const Row = ({ b, onPlay, ctaLabel = "Play" }) => (
  <div className="card p-3 space-y-3" data-testid={`battle-row-${b.id}`}>
    <div className="flex items-center justify-between">
      <span className={`pill ${b.status === "waiting" ? "pill-blue" : b.status === "completed" ? "pill-purple" : "pill-green"} flex items-center gap-1`}>
        <Swords size={12} /> {b.status.toUpperCase()}
      </span>
      <div className="text-xs text-slate-500">
        FROM <b className="text-slate-800">{b.creator_username}</b>
      </div>
    </div>
    <div className="flex items-center justify-between bg-slate-50 rounded-xl p-3">
      <div>
        <div className="text-[11px] font-bold text-slate-500">ENTRY</div>
        <div className="heading text-lg font-extrabold text-slate-900">₹{b.entry_amount}</div>
      </div>
      <div className="w-px h-8 bg-slate-200" />
      <div className="text-right">
        <div className="text-[11px] font-bold text-slate-500">PRIZE</div>
        <div className="heading text-lg font-extrabold text-blue-700">₹{b.prize_amount}</div>
      </div>
    </div>
    {onPlay && (
      <div className="flex justify-end">
        <button data-testid={`play-${b.id}`} onClick={() => onPlay(b)} className="btn-primary px-6">{ctaLabel}</button>
      </div>
    )}
    {b.player_details && b.player_details.length === 2 && (
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-blue-100 border-2 border-blue-500" />
          <span className="text-sm font-semibold">{b.player_details[0].username}</span>
        </div>
        <span className="w-8 h-8 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">VS</span>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{b.player_details[1].username}</span>
          <div className="w-8 h-8 rounded-full bg-emerald-100 border-2 border-emerald-500" />
        </div>
      </div>
    )}
  </div>
);

export default function Battles() {
  const [open, setOpen] = useState([]);
  const [running, setRunning] = useState([]);
  const [amount, setAmount] = useState("");
  const nav = useNavigate();

  const load = async () => {
    try {
      const [o, r] = await Promise.all([
        api.get("/battles/list", { params: { status: "open" } }),
        api.get("/battles/list", { params: { status: "running" } }),
      ]);
      setOpen(o.data); setRunning(r.data);
    } catch (e) { toast.error(e.message); }
  };
  useEffect(() => { load(); const t = setInterval(load, 6000); return () => clearInterval(t); }, []);

  const setEntry = () => {
    const a = parseInt(amount);
    if (!a || a <= 0) { toast.error("Enter valid amount"); return; }
    nav(`/create-room?amount=${a}`);
  };

  const joinBattle = async (b) => {
    try {
      const { data } = await api.post("/rooms/join", { room_code: b.room_code });
      nav(`/lobby/${data.id}`);
    } catch (e) { toast.error(e.message); }
  };

  const openMine = (b) => nav(`/lobby/${b.id}`);

  return (
    <AppLayout active="home">
      <div className="card p-3 flex items-center gap-2 border-blue-200" data-testid="amount-card">
        <input
          data-testid="entry-amount-input"
          value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
          placeholder="Enter Amount"
          className="flex-1 px-3 py-3 outline-none bg-slate-50 rounded-xl"
        />
        <button data-testid="set-amount-btn" onClick={setEntry} className="btn-primary px-5">SET</button>
      </div>

      <div className="flex gap-2 mt-4">
        <Link to="/create-room" data-testid="quick-create" className="flex-1 card p-3 flex items-center gap-2 hover:-translate-y-0.5 transition-transform">
          <div className="icon-tile bg-blue-600"><Plus size={20} /></div>
          <div>
            <div className="font-bold text-slate-900 text-sm">Create Room</div>
            <div className="text-[11px] text-slate-500">Pick entry & share code</div>
          </div>
        </Link>
        <Link to="/join-room" data-testid="quick-join" className="flex-1 card p-3 flex items-center gap-2 hover:-translate-y-0.5 transition-transform">
          <div className="icon-tile bg-emerald-500"><KeyRound size={20} /></div>
          <div>
            <div className="font-bold text-slate-900 text-sm">Join Room</div>
            <div className="text-[11px] text-slate-500">Enter code from friend</div>
          </div>
        </Link>
      </div>

      <div className="flex items-center gap-2 mt-6">
        <Swords size={18} className="text-blue-600" />
        <h2 className="heading text-lg font-extrabold text-slate-900">Open Battles</h2>
      </div>
      <div className="space-y-3 mt-3">
        {open.length === 0 && <div className="card p-4 text-sm text-slate-500 text-center">No open battles yet. Create one!</div>}
        {open.map((b) => <Row key={b.id} b={b} onPlay={joinBattle} />)}
      </div>

      <div className="flex items-center gap-2 mt-6">
        <Flame size={18} className="text-orange-500" />
        <h2 className="heading text-lg font-extrabold text-slate-900">Running Battles</h2>
      </div>
      <div className="space-y-3 mt-3">
        {running.length === 0 && <div className="card p-4 text-sm text-slate-500 text-center">Nothing running right now.</div>}
        {running.map((b) => <Row key={b.id} b={b} onPlay={openMine} ctaLabel="View" />)}
      </div>

      <div className="flex items-center gap-2 mt-6">
        <Trophy size={18} className="text-purple-500" />
        <h2 className="heading text-lg font-extrabold text-slate-900">Completed</h2>
      </div>
    </AppLayout>
  );
}
