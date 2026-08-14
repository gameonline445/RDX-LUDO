import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/layouts/AppLayout";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";

export default function JoinRoom() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  const join = async () => {
    if (code.length < 4) { toast.error("Enter room code"); return; }
    setLoading(true);
    try {
      const { data } = await api.post("/rooms/join", { room_code: code });
      toast.success(`Joined room ${data.room_code}`);
      nav(`/lobby/${data.id}`);
    } catch (e) { toast.error(e.message); } finally { setLoading(false); }
  };

  return (
    <AppLayout active="home">
      <h1 className="heading text-2xl font-extrabold text-slate-900">Join Room</h1>
      <p className="text-slate-500 text-sm mt-1">Enter the code shared by your opponent.</p>

      <div className="card p-4 mt-4">
        <label className="text-xs font-bold tracking-wider text-slate-500">ROOM CODE</label>
        <div className="flex items-center gap-2 mt-2">
          <KeyRound size={22} className="text-slate-400" />
          <input data-testid="room-code-input" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="AB7K92"
            maxLength={8} className="flex-1 border border-slate-200 rounded-xl px-3 py-3 text-2xl tracking-widest font-bold uppercase text-center outline-none" />
        </div>
      </div>

      <button data-testid="confirm-join-btn" onClick={join} disabled={loading} className="btn-primary w-full mt-6">
        {loading ? "Joining…" : "Join Room"}
      </button>
    </AppLayout>
  );
}
