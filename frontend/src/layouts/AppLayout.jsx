import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, Bell, Wallet as WalletIcon, Gift, Home, LifeBuoy, User, X, LogOut, Percent, Clock, Download, Dice5 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { LOGO_URL, BRAND_FALLBACK } from "@/lib/brand";

const NavItem = ({ to, active, icon: Icon, color, label, testId }) => (
  <Link to={to} data-testid={testId} className="flex flex-col items-center flex-1 py-1">
    <div
      className="w-11 h-11 rounded-xl flex items-center justify-center transition-transform active:scale-95"
      style={{ background: active ? color : "#F1F5F9", color: active ? "#fff" : "#64748B" }}
    >
      <Icon size={22} />
    </div>
    <span className={`text-[11px] mt-1 font-semibold ${active ? "text-slate-900" : "text-slate-500"}`}>{label}</span>
    {active && <span className="w-1 h-1 rounded-full bg-blue-600 mt-0.5" />}
  </Link>
);

const DrawerItem = ({ to, icon: Icon, label, color, onClose, testId }) => (
  <Link
    to={to}
    onClick={onClose}
    data-testid={testId}
    className="flex items-center gap-3 p-3 rounded-2xl border border-slate-100 bg-white hover:bg-slate-50 transition-colors"
  >
    <div className="icon-tile" style={{ background: color }}>
      <Icon size={20} />
    </div>
    <span className="font-semibold text-slate-800 flex-1">{label}</span>
    <span className="text-slate-400">›</span>
  </Link>
);

export default function AppLayout({ children, active }) {
  const { user, totalBalance, settings, logout } = useAuth();
  const [drawer, setDrawer] = useState(false);
  const nav = useNavigate();
  const loc = useLocation();

  const bonus = 0; // referral bonus placeholder for header chip

  return (
    <div className="app-shell">
      {/* Header */}
      <div className="gradient-header-bg sticky top-0 z-30 px-4 py-3 flex items-center justify-between border-b border-slate-200">
        <div className="flex items-center gap-2">
          <button
            data-testid="menu-btn"
            onClick={() => setDrawer(true)}
            className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-rose-500 text-white flex items-center justify-center shadow-md active:scale-95 transition-transform"
          >
            <Menu size={20} />
          </button>
          <div className="w-10 h-10 rounded-full bg-white shadow-inner border border-slate-200 flex items-center justify-center overflow-hidden">
            <img src={LOGO_URL} alt="RDX LUDO" className="w-9 h-9 object-contain" />
          </div>
          <span className="font-bold text-slate-900 tracking-tight">{settings.app_name || BRAND_FALLBACK}</span>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/notifications" data-testid="notifications-btn" className="w-10 h-10 rounded-xl bg-purple-500 text-white flex items-center justify-center shadow-md active:scale-95">
            <Bell size={18} />
          </Link>
          <Link to="/wallet" data-testid="header-wallet-chip" className="flex items-center gap-1 bg-emerald-500 text-white rounded-xl px-2 h-10 shadow-md active:scale-95">
            <WalletIcon size={16} />
            <span className="font-bold text-sm">₹{Number(totalBalance || 0).toFixed(0)}</span>
          </Link>
          <Link to="/refer" data-testid="header-refer-chip" className="flex items-center gap-1 bg-orange-500 text-white rounded-xl px-2 h-10 shadow-md active:scale-95">
            <Gift size={16} />
            <span className="font-bold text-sm">{bonus}</span>
          </Link>
        </div>
      </div>

      {/* Main content */}
      <div className="px-4 py-4">{children}</div>

      {/* Bottom Nav */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white/95 backdrop-blur-md border-t border-slate-200 flex items-stretch h-16 px-2 z-40">
        <NavItem to="/" active={active === "home"} icon={Home} color="#2563EB" label="Home" testId="nav-home" />
        <NavItem to="/wallet" active={active === "wallet"} icon={WalletIcon} color="#16A34A" label="Wallet" testId="nav-wallet" />
        <NavItem to="/support" active={active === "support"} icon={LifeBuoy} color="#0891B2" label="Support" testId="nav-support" />
        <NavItem to="/profile" active={active === "profile"} icon={User} color="#EA580C" label="Profile" testId="nav-profile" />
      </div>

      {/* Drawer */}
      {drawer && (
        <div className="fixed inset-0 z-50" data-testid="drawer">
          <div className="absolute inset-0 bg-black/30" onClick={() => setDrawer(false)} />
          <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-full max-w-md pointer-events-none">
            <div className="absolute left-0 top-0 bottom-0 w-72 bg-white shadow-2xl pointer-events-auto flex flex-col animate-in slide-in-from-left duration-200">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-white flex items-center justify-center border border-slate-200 overflow-hidden">
                    <img src={LOGO_URL} alt="RDX LUDO" className="w-10 h-10 object-contain" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">{settings.app_name || BRAND_FALLBACK}</div>
                    <div className="text-xs text-slate-500">Play · Win · Earn</div>
                  </div>
                </div>
                <button data-testid="drawer-close" onClick={() => setDrawer(false)} className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center"><X size={18} /></button>
              </div>
              <div className="p-3 space-y-2 overflow-y-auto">
                <DrawerItem to="/" icon={Home} label="Home" color="#2563EB" onClose={() => setDrawer(false)} testId="drawer-home" />
                <DrawerItem to="/profile" icon={User} label="My Profile" color="#EA580C" onClose={() => setDrawer(false)} testId="drawer-profile" />
                <DrawerItem to="/wallet" icon={WalletIcon} label="My Wallet" color="#16A34A" onClose={() => setDrawer(false)} testId="drawer-wallet" />
                <DrawerItem to="/refer" icon={Gift} label="Refer & Earn" color="#F97316" onClose={() => setDrawer(false)} testId="drawer-refer" />
                <DrawerItem to="/history" icon={Clock} label="History" color="#9333EA" onClose={() => setDrawer(false)} testId="drawer-history" />
                <DrawerItem to="/notifications" icon={Bell} label="Notifications" color="#7C3AED" onClose={() => setDrawer(false)} testId="drawer-notifications" />
                <DrawerItem to="/support" icon={LifeBuoy} label="Support" color="#0891B2" onClose={() => setDrawer(false)} testId="drawer-support" />
                <button data-testid="drawer-install" onClick={() => setDrawer(false)} className="w-full flex items-center gap-3 p-3 rounded-2xl border border-slate-100 bg-white">
                  <div className="icon-tile" style={{ background: "#22C55E" }}><Download size={20} /></div>
                  <span className="font-semibold text-slate-800 flex-1 text-left">Install App</span>
                </button>
                <button
                  data-testid="drawer-logout"
                  onClick={() => { logout(); setDrawer(false); nav("/login"); }}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl border border-red-100 bg-red-50 mt-4"
                >
                  <div className="icon-tile" style={{ background: "#EF4444" }}><LogOut size={20} /></div>
                  <span className="font-semibold text-red-700 flex-1 text-left">Logout</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
