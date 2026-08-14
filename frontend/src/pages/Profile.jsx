import React from "react";
import { Link, useNavigate } from "react-router-dom";
import AppLayout from "@/layouts/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { Clock, LifeBuoy, Gift, ShieldCheck, LogOut, IndianRupee, GamepadIcon, Users } from "lucide-react";

export default function Profile() {
  const { user, logout } = useAuth();
  const nav = useNavigate();

  return (
    <AppLayout active="profile">
      <h1 className="heading text-2xl font-extrabold text-slate-900">My Profile</h1>

      <div className="card p-4 mt-3 flex items-center gap-3">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-400 to-rose-500 text-white flex items-center justify-center text-2xl font-extrabold">
          {user?.username?.[0]?.toUpperCase()}
        </div>
        <div className="flex-1">
          <div className="font-extrabold text-slate-900" data-testid="profile-username">{user?.username}</div>
          <div className="text-xs text-slate-500">+91 {user?.mobile}</div>
        </div>
        <Link to="/kyc" data-testid="edit-kyc" className="text-blue-600 text-sm font-bold">Edit</Link>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-3">
        <Link to="/kyc" data-testid="kyc-card" className="card p-3 flex items-center gap-2">
          <div className="icon-tile bg-emerald-500"><ShieldCheck size={18} /></div>
          <div>
            <div className="text-xs text-slate-500">KYC</div>
            <div className="font-bold text-slate-900 capitalize">{user?.kyc_status?.replace("_", " ")}</div>
          </div>
        </Link>
        <Link to="/refer" data-testid="referral-card" className="card p-3 flex items-center gap-2">
          <div className="icon-tile bg-orange-500"><Gift size={18} /></div>
          <div>
            <div className="text-xs text-slate-500">Referral</div>
            <div className="font-bold text-slate-900 tracking-wide">{user?.referral_code}</div>
          </div>
        </Link>
      </div>

      <div className="mt-4 text-xs font-bold tracking-widest text-slate-500">YOUR STATS</div>
      <div className="grid grid-cols-3 gap-2 mt-2">
        <div className="card p-3 text-center"><IndianRupee className="mx-auto text-emerald-500" size={18} /><div className="font-extrabold text-slate-900 mt-1" data-testid="stat-coin-won">{user?.coin_won || 0}</div><div className="text-[10px] text-slate-500">Coin Won</div></div>
        <div className="card p-3 text-center"><GamepadIcon className="mx-auto text-blue-500" size={18} /><div className="font-extrabold text-slate-900 mt-1" data-testid="stat-games">{user?.games_played || 0}</div><div className="text-[10px] text-slate-500">Games</div></div>
        <div className="card p-3 text-center"><Users className="mx-auto text-orange-500" size={18} /><div className="font-extrabold text-slate-900 mt-1" data-testid="stat-refs">{user?.referrals_count || 0}</div><div className="text-[10px] text-slate-500">Referrals</div></div>
      </div>

      <div className="mt-4 text-xs font-bold tracking-widest text-slate-500">QUICK ACTIONS</div>
      <div className="grid grid-cols-2 gap-3 mt-2">
        <Link to="/history" className="card p-3 flex items-center gap-2"><div className="icon-tile bg-purple-500"><Clock size={18} /></div><span className="font-bold text-slate-800">History</span></Link>
        <Link to="/support" className="card p-3 flex items-center gap-2"><div className="icon-tile bg-cyan-600"><LifeBuoy size={18} /></div><span className="font-bold text-slate-800">Support</span></Link>
      </div>

      <button data-testid="logout-btn" onClick={() => { logout(); nav("/login"); }} className="w-full mt-6 py-3 rounded-xl border border-red-200 bg-red-50 text-red-700 font-bold flex items-center justify-center gap-2">
        <LogOut size={16} /> Logout
      </button>
    </AppLayout>
  );
}
