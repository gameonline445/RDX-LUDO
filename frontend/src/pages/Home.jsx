import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowUpRight, Lock, Gift, Play } from "lucide-react";
import AppLayout from "@/layouts/AppLayout";
import { useAuth } from "@/context/AuthContext";

const LUDO_IMG = "https://images.unsplash.com/photo-1596687909057-dfac2b25b891?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1OTV8MHwxfHNlYXJjaHwzfHxsdWRvJTIwYm9hcmQlMjBnYW1lfGVufDB8fHx8MTc4NjczMTQ3N3ww&ixlib=rb-4.1.0&q=85";

export default function Home() {
  const { user, settings } = useAuth();
  const nav = useNavigate();
  return (
    <AppLayout active="home">
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        <h1 className="heading text-3xl font-extrabold text-slate-900 tracking-tight">
          Hey, {user?.username || "Player"}
        </h1>
        <p className="text-slate-500 mt-1">Welcome to {settings.app_name || "MY LUDO"}</p>

        <Link to="/refer" data-testid="refer-banner"
          className="mt-5 flex items-center justify-between card p-4 hover:-translate-y-0.5 transition-transform">
          <div>
            <div className="text-[11px] font-bold tracking-widest text-slate-500">REFER &amp; EARN</div>
            <div className="heading text-2xl font-extrabold text-slate-900">{settings.referral_percent}% Refer</div>
          </div>
          <div className="w-11 h-11 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg">
            <ArrowUpRight size={20} />
          </div>
        </Link>

        <div className="mt-6 text-xs font-bold tracking-widest text-blue-600">GAMES</div>

        <button data-testid="ludo-classic-card"
          onClick={() => nav("/battles")}
          className="mt-3 block w-full text-left rounded-3xl overflow-hidden border border-slate-100 shadow-md relative group">
          <img src={LUDO_IMG} alt="Ludo Classic" className="w-full h-52 object-cover group-hover:scale-105 transition-transform duration-500" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
          <span className="absolute top-3 left-3 pill pill-green flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-600 animate-pulse" /> LIVE
          </span>
          <div className="absolute bottom-3 left-4 text-white">
            <div className="heading text-2xl font-extrabold">Ludo Classic</div>
            <div className="text-xs opacity-90">Play real cash · 1v1</div>
          </div>
          <div className="absolute bottom-3 right-4 bg-blue-600 text-white rounded-full px-4 py-2 font-bold flex items-center gap-1 shadow-lg">
            <Play size={16} /> Play
          </div>
        </button>

        <div className="mt-4 card p-3 flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-fuchsia-500 to-indigo-500 flex items-center justify-center">
            <Gift className="text-white" />
          </div>
          <div className="flex-1">
            <div className="font-bold text-slate-900">1 Goti Ludo</div>
            <div className="text-xs text-slate-500">Coming soon</div>
          </div>
          <span className="pill bg-slate-100 text-slate-500 flex items-center gap-1"><Lock size={12} /> COMING SOON</span>
        </div>
      </div>
    </AppLayout>
  );
}
