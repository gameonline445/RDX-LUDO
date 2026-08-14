import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AppLayout from "@/layouts/AppLayout";
import { api } from "@/lib/api";
import { Copy, Share2, X } from "lucide-react";
import { toast } from "sonner";

export default function RoomLobby() {
  const { battleId } = useParams();
  const [battle, setBattle] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const nav = useNavigate();

  const load = async () => {
    try {
      const { data } = await api.get(`/rooms/${battleId}`);
      setBattle(data);
      if (data.status === "matched" || data.status === "live") {
        setCountdown((c) => (c === null ? 3 : c));
      } else if (data.status === "completed") {
        nav(`/game/${battleId}`);
      }
    } catch (e) { toast.error(e.message); }
  };

  useEffect(() => { load(); const t = setInterval(load, 2500); return () => clearInterval(t); }, [battleId]);
  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) { nav(`/game/${battleId}`); return; }
    const t = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const cancel = async () => {
    try {
      await api.post("/rooms/cancel", { battle_id: battleId });
      toast.success("Room cancelled and refunded");
      nav("/battles");
    } catch (e) { toast.error(e.message); }
  };

  if (!battle) return <AppLayout><div className="p-4 text-slate-500">Loading…</div></AppLayout>;
  const p1 = battle.player_details?.[0];
  const p2 = battle.player_details?.[1];

  return (
    <AppLayout>
      <h1 className="heading text-2xl font-extrabold text-slate-900">Ludo Classic</h1>
      <div className="text-slate-500 text-sm mt-1">Room Code</div>
      <div className="flex items-center gap-2 mt-1">
        <div data-testid="room-code" className="heading text-3xl font-extrabold text-blue-700 tracking-widest">{battle.room_code}</div>
        <button data-testid="copy-code-btn"
          onClick={() => { navigator.clipboard?.writeText(battle.room_code); toast.success("Code copied"); }}
          className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center"><Copy size={16} /></button>
        <button data-testid="share-code-btn"
          onClick={async () => {
            try { await navigator.share?.({ title: "MY LUDO Battle", text: `Join my Ludo battle. Room code: ${battle.room_code}` }); }
            catch {}
          }}
          className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center"><Share2 size={16} /></button>
      </div>

      <div className="card p-4 mt-5">
        <div className="flex items-center justify-between">
          <div className="flex flex-col items-center gap-2 w-1/3">
            <div className="w-16 h-16 rounded-full bg-blue-100 border-4 border-blue-500 flex items-center justify-center text-blue-700 font-extrabold">{p1?.username?.[0] || "?"}</div>
            <div className="text-sm font-bold text-slate-900">{p1?.username}</div>
            <span className="pill pill-blue">READY</span>
          </div>
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-blue-600 text-white flex items-center justify-center font-extrabold shadow-lg">VS</div>
          </div>
          <div className="flex flex-col items-center gap-2 w-1/3">
            {p2 ? (
              <>
                <div className="w-16 h-16 rounded-full bg-emerald-100 border-4 border-emerald-500 flex items-center justify-center text-emerald-700 font-extrabold">{p2.username?.[0]}</div>
                <div className="text-sm font-bold text-slate-900">{p2.username}</div>
                <span className="pill pill-green">READY</span>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-slate-100 border-4 border-slate-300 flex items-center justify-center text-slate-400">?</div>
                <div className="text-sm text-slate-500">Waiting</div>
                <span className="pill pill-orange">PENDING</span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center justify-around mt-4 border-t border-slate-100 pt-4">
          <div className="text-center"><div className="text-[11px] text-slate-500 font-bold">ENTRY</div><div className="heading font-extrabold text-slate-900">₹{battle.entry_amount}</div></div>
          <div className="w-px h-8 bg-slate-200" />
          <div className="text-center"><div className="text-[11px] text-slate-500 font-bold">PRIZE</div><div className="heading font-extrabold text-blue-700">₹{battle.prize_amount}</div></div>
        </div>
      </div>

      {battle.status === "waiting" && (
        <>
          <div data-testid="waiting-status" className="mt-4 text-center text-slate-500 font-semibold">Waiting for opponent…</div>
          <button data-testid="cancel-room-btn" onClick={cancel} className="w-full mt-4 py-3 rounded-xl border border-red-200 bg-red-50 text-red-700 font-bold flex items-center justify-center gap-2">
            <X size={18} /> Cancel & Refund
          </button>
        </>
      )}

      {(battle.status === "matched" || battle.status === "live") && countdown !== null && countdown > 0 && (
        <div className="mt-6 text-center">
          <div className="text-sm font-bold text-slate-500">STARTING GAME</div>
          <div data-testid="countdown" className="heading text-7xl font-extrabold text-blue-600 mt-2">{countdown}</div>
        </div>
      )}
    </AppLayout>
  );
}
