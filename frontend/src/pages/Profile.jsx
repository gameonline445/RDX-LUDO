import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AppLayout from "@/layouts/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { Clock, LifeBuoy, Gift, ShieldCheck, LogOut, IndianRupee, Gamepad2, Users, Pencil, Ticket, Check, ArrowUpRight, User as UserIcon } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";

export default function Profile() {
  const { user, logout, refresh } = useAuth();
  const nav = useNavigate();
  const [ref, setRef] = useState(null);

  useEffect(() => { api.get("/referral").then(r => setRef(r.data)).catch(() => {}); }, []);

  const redeem = async () => {
    try {
      const { data } = await api.post("/referral/redeem", {});
      toast.success(`₹${data.amount} moved to winnings`);
      await refresh();
      setRef(prev => prev ? { ...prev, bonus_balance: 0 } : prev);
    } catch (e) { toast.error(e.message); }
  };

  return (
    <AppLayout active="profile">
      <div className="card p-4 relative">
        <span className="pill pill-blue">MY PROFILE</span>
        <button data-testid="edit-profile-btn" className="absolute right-3 top-3 flex items-center gap-1 border border-slate-200 rounded-full px-3 py-1 text-xs font-bold text-slate-700 bg-white active:scale-95">
          <Pencil size={12} /> Edit
        </button>
        <div className="flex items-center gap-3 mt-3">
          <div className="w-16 h-16 rounded-full bg-blue-100 border-2 border-blue-500 flex items-center justify-center text-blue-700 text-2xl font-extrabold">
            <UserIcon size={30} />
          </div>
          <div className="flex-1">
            <div className="heading text-xl font-extrabold text-slate-900" data-testid="profile-username">{user?.username}</div>
            <div className="text-xs text-slate-500 mt-0.5">📞 +91 {user?.mobile}</div>
            <Link to="/kyc" data-testid="complete-kyc-pill" className="mt-2 inline-block bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">Complete KYC</Link>
          </div>
        </div>
      </div>

      {/* Referral Applied */}
      <div className="card p-4 mt-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center"><Ticket className="text-blue-600" size={20} /></div>
          <div className="flex-1">
            <div className="font-extrabold text-slate-900">Referral Applied</div>
            <div className="text-xs text-slate-500">This code is locked to your account</div>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 bg-slate-50 rounded-xl p-2 border border-slate-200">
          <div className="flex-1 heading text-lg font-extrabold text-slate-900 tracking-widest px-2" data-testid="ref-applied-code">
            {ref?.applied_code || "—"}
          </div>
          <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center"><Check size={16} /></div>
        </div>
      </div>

      <div className="mt-4 text-xs font-bold tracking-widest text-blue-600">YOUR STATS</div>
      <div className="grid grid-cols-3 gap-2 mt-2">
        <div className="card p-3 text-center">
          <div className="w-9 h-9 mx-auto rounded-xl bg-blue-50 flex items-center justify-center"><IndianRupee size={16} className="text-blue-600" /></div>
          <div className="text-[10px] font-bold text-slate-500 mt-2 tracking-wider">COIN WON</div>
          <div className="heading font-extrabold text-slate-900" data-testid="stat-coin-won">₹{user?.coin_won || 0}</div>
        </div>
        <div className="card p-3 text-center">
          <div className="w-9 h-9 mx-auto rounded-xl bg-blue-50 flex items-center justify-center"><Gamepad2 size={16} className="text-blue-600" /></div>
          <div className="text-[10px] font-bold text-slate-500 mt-2 tracking-wider">GAME PLAYED</div>
          <div className="heading font-extrabold text-slate-900" data-testid="stat-games">{user?.games_played || 0}</div>
        </div>
        <div className="card p-3 text-center">
          <div className="w-9 h-9 mx-auto rounded-xl bg-blue-50 flex items-center justify-center"><Users size={16} className="text-blue-600" /></div>
          <div className="text-[10px] font-bold text-slate-500 mt-2 tracking-wider">REFERRAL</div>
          <div className="heading font-extrabold text-slate-900" data-testid="stat-refs">{ref?.total_referrals ?? user?.referrals_count ?? 0}</div>
        </div>
      </div>

      <div className="mt-4 text-xs font-bold tracking-widest text-blue-600">QUICK ACTIONS</div>
      <div className="grid grid-cols-2 gap-3 mt-2">
        <Link to="/history" data-testid="quick-history" className="card p-3 flex items-center justify-between hover:-translate-y-0.5 transition-transform">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center"><Clock size={18} className="text-blue-600" /></div>
            <div>
              <div className="font-bold text-slate-900 text-sm">History</div>
              <div className="text-[10px] text-slate-500">Battles & payments</div>
            </div>
          </div>
          <ArrowUpRight size={14} className="text-slate-400" />
        </Link>
        <Link to="/support" data-testid="quick-support" className="card p-3 flex items-center justify-between hover:-translate-y-0.5 transition-transform">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center"><LifeBuoy size={18} className="text-blue-600" /></div>
            <div>
              <div className="font-bold text-slate-900 text-sm">Support</div>
              <div className="text-[10px] text-slate-500">Chat & help</div>
            </div>
          </div>
          <ArrowUpRight size={14} className="text-slate-400" />
        </Link>
      </div>

      <button data-testid="referral-redeem-btn" onClick={redeem}
        className="mt-3 w-full card p-3 flex items-center gap-3 hover:-translate-y-0.5 transition-transform text-left">
        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center"><Gift size={18} className="text-blue-600" /></div>
        <div className="flex-1">
          <div className="font-bold text-slate-900 text-sm">Referral Redeem</div>
          <div className="text-[11px] text-slate-500">Move referral earnings ₹{ref?.bonus_balance || 0} to winnings</div>
        </div>
        <ArrowUpRight size={14} className="text-slate-400" />
      </button>

      <button data-testid="logout-btn" onClick={() => { logout(); nav("/"); }}
        className="w-full mt-4 py-3 rounded-xl border border-red-200 bg-red-50 text-red-700 font-bold flex items-center justify-center gap-2">
        <LogOut size={16} /> Logout
      </button>
    </AppLayout>
  );
}
