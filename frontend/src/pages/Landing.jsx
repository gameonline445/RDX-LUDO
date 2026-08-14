import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowUpRight, Sparkles, ShieldCheck, Trophy, Wallet as WalletIcon, Gift, LifeBuoy, LogIn, Zap, Play } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { LOGO_URL, BRAND_FALLBACK } from "@/lib/brand";

const LUDO_IMG = "https://rdxludo.in/games/ludo-classic.png";
const LUDO_1GOT_IMG = "https://rdxludo.in/games/ludo-1got.png";

export default function Landing() {
  const { user, settings } = useAuth();
  const nav = useNavigate();
  useEffect(() => { if (user) nav("/home", { replace: true }); }, [user, nav]);

  const brand = settings.app_name || BRAND_FALLBACK;

  return (
    <div className="app-shell">
      {/* Top bar */}
      <div className="gradient-header-bg sticky top-0 z-30 px-4 py-3 flex items-center justify-between border-b border-slate-200">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-white shadow-inner border border-slate-200 flex items-center justify-center overflow-hidden">
            <img src={LOGO_URL} alt="RDX LUDO" className="w-9 h-9 object-contain" />
          </div>
          <div>
            <div className="font-extrabold text-slate-900 leading-tight">{brand}</div>
            <div className="text-[10px] text-slate-500">Play · Win · Earn</div>
          </div>
        </div>
        <Link to="/login" data-testid="landing-signin-btn" className="flex items-center gap-1 bg-slate-900 text-white px-3 h-9 rounded-xl font-bold text-sm shadow-md active:scale-95">
          Sign In <LogIn size={14} />
        </Link>
      </div>

      <div className="px-4 py-5 space-y-5">
        {/* Hero */}
        <div className="card p-5 relative overflow-hidden">
          <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-blue-100/60 blur-2xl" />
          <div className="absolute -right-6 -bottom-10 w-40 h-40 rounded-full bg-indigo-100/60 blur-2xl" />
          <div className="relative">
            <span className="pill pill-blue flex items-center gap-1 w-fit"><Sparkles size={12} /> WELCOME TO {brand}</span>
            <h1 className="heading text-3xl font-extrabold text-slate-900 mt-3 leading-tight">
              Play Ludo.<br />
              <span className="text-blue-600">Win Real Cash.</span>
            </h1>
            <p className="text-sm text-slate-500 mt-1">Welcome to {brand}</p>
            <div className="grid grid-cols-3 gap-2 mt-4">
              <div className="card p-3 text-center border-slate-100">
                <ArrowUpRight className="mx-auto text-blue-600" size={16} />
                <div className="heading font-extrabold text-slate-900 mt-1">2%</div>
                <div className="text-[10px] text-slate-500">Referral</div>
              </div>
              <div className="card p-3 text-center border-slate-100">
                <ShieldCheck className="mx-auto text-emerald-600" size={16} />
                <div className="heading font-extrabold text-slate-900 mt-1">24/7</div>
                <div className="text-[10px] text-slate-500">Support</div>
              </div>
              <div className="card p-3 text-center border-slate-100">
                <LifeBuoy className="mx-auto text-cyan-600" size={16} />
                <div className="heading font-extrabold text-slate-900 mt-1">Live</div>
                <div className="text-[10px] text-slate-500">Chat & Call</div>
              </div>
            </div>
          </div>
        </div>

        {/* Game Arena */}
        <div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-bold tracking-widest text-blue-600">GAME ARENA</div>
              <div className="heading text-xl font-extrabold text-slate-900">Pick Your Mode</div>
            </div>
            <span className="pill pill-green flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> 1 LIVE
            </span>
          </div>
          <button data-testid="landing-ludo-card" onClick={() => nav("/login")}
            className="mt-3 block w-full text-left rounded-3xl overflow-hidden border border-slate-100 shadow-md relative group">
            <img src={LUDO_IMG} alt="Ludo Classic" className="w-full h-52 object-cover group-hover:scale-105 transition-transform duration-500" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
            <span className="absolute top-3 left-3 pill pill-green">LIVE NOW</span>
            <div className="absolute bottom-3 left-4 text-white">
              <div className="heading text-2xl font-extrabold">Ludo Classic</div>
              <div className="text-xs opacity-90">1v1 · Instant match · Fair battles</div>
            </div>
            <div className="absolute bottom-3 right-4 bg-blue-600 text-white rounded-full px-4 py-2 font-bold flex items-center gap-1 shadow-lg">
              <Play size={16} /> Play Now
            </div>
          </button>

          <div className="mt-3 card p-3 flex items-center gap-3 border-dashed">
            <img src={LUDO_1GOT_IMG} alt="1 Goti" className="w-14 h-14 rounded-2xl object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            <div className="flex-1">
              <div className="font-bold text-slate-900">1 Goti Ludo</div>
              <div className="text-xs text-slate-500">Fast-paced single-token mode</div>
            </div>
            <span className="pill bg-slate-100 text-slate-500 flex items-center gap-1">SOON</span>
          </div>
        </div>

        {/* Built for winners */}
        <div className="card p-5 relative overflow-hidden">
          <span className="pill pill-blue flex items-center gap-1 w-fit"><Sparkles size={12} /> PREMIUM PLATFORM</span>
          <h2 className="heading text-2xl font-extrabold text-slate-900 mt-2">Built for Winners</h2>
          <p className="text-sm text-slate-500 mt-1">Everything you need to play, earn, and withdraw — in one place.</p>

          <div className="mt-4 card p-4 border-slate-100 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold tracking-widest text-slate-500">REFERRAL PROGRAM</div>
                <div className="heading text-2xl font-extrabold text-blue-700">{settings.referral_percent || 2}<span className="text-lg">%</span> <span className="text-sm text-slate-600">Refer</span></div>
              </div>
              <button data-testid="landing-start-earning" onClick={() => nav("/login")} className="flex items-center gap-1 text-blue-700 font-bold text-xs">
                START EARNING
                <span className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg"><ArrowUpRight size={16} /></span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-3">
            {[
              { icon: Trophy, color: "text-yellow-600", bg: "bg-yellow-50", title: "Skill Battles", desc: "Head-to-head Ludo with real stakes" },
              { icon: WalletIcon, color: "text-emerald-600", bg: "bg-emerald-50", title: "Instant Wallet", desc: "Fast deposits & smooth withdrawals" },
              { icon: Gift, color: "text-orange-600", bg: "bg-orange-50", title: "Refer & Earn", desc: "Share link, earn on every friend" },
              { icon: LifeBuoy, color: "text-cyan-600", bg: "bg-cyan-50", title: "Live Support", desc: "Chat or call us anytime" },
            ].map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={i} className="card p-3 border-slate-100">
                  <div className={`w-10 h-10 rounded-xl ${f.bg} flex items-center justify-center`}><Icon size={18} className={f.color} /></div>
                  <div className="font-extrabold text-slate-900 mt-2 text-sm">{f.title}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{f.desc}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="card p-4">
          <div className="flex items-center justify-around text-xs text-slate-500 font-bold">
            <div className="flex items-center gap-1"><ShieldCheck size={14} className="text-blue-600" /> Secure</div>
            <div className="flex items-center gap-1"><Zap size={14} className="text-blue-600" /> Instant</div>
            <div className="flex items-center gap-1"><Gift size={14} className="text-blue-600" /> Refer</div>
          </div>
          <button data-testid="landing-join-btn" onClick={() => nav("/login")} className="btn-primary w-full mt-3 flex items-center justify-center gap-2">
            <LogIn size={18} /> Join {brand}
          </button>
        </div>

        <div className="text-center text-[11px] text-slate-400 pt-2">
          Play responsibly. 18+ only. T&C apply.
        </div>

        {/* Hindi promo copy */}
        <div className="card p-4 mt-2 border-slate-100 bg-slate-50" data-testid="promo-copy">
          <div className="text-[13px] text-slate-700 leading-relaxed">
            <b>{brand}</b> पर लूडो खेल कर या दोस्तों को शेयर कर के पैसा जीतो और तुरंत अपने Bank या UPI में ट्रांसफर कर सकते हैं। {brand} पर <b>ऑटो डिपाजिट</b> एंड <b>ऑटो विथड्रावल</b> है। <b>100% भरोसेमंद प्लेटफार्म</b> · 24 hours support.
          </div>
        </div>
      </div>
    </div>
  );
}
