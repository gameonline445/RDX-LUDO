import React from "react";
import AppLayout from "@/layouts/AppLayout";
import { MessageCircle, ShieldCheck, Clock, LifeBuoy } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function Support() {
  const { settings } = useAuth();
  const num = (settings.whatsapp_number || "8306865537").replace(/\D/g, "");
  const link = `https://wa.me/91${num}?text=${encodeURIComponent("Hi, I need help with " + settings.app_name)}`;

  return (
    <AppLayout active="support">
      <h1 className="heading text-2xl font-extrabold text-slate-900">Support Center</h1>
      <p className="text-slate-500 text-sm mt-1">We're here for you</p>
      <p className="text-slate-500 text-sm mt-1">Get help with battles, wallet, KYC and more — anytime.</p>

      <div className="mt-4 flex items-center gap-2">
        <span className="pill pill-green flex items-center gap-1" data-testid="support-online-pill">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> ONLINE
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-4">
        <div className="card p-3 text-center"><Clock className="mx-auto text-blue-500" size={18} /><div className="text-[11px] font-bold mt-1 text-slate-900">1–2 min</div><div className="text-[10px] text-slate-500">reply</div></div>
        <div className="card p-3 text-center"><LifeBuoy className="mx-auto text-cyan-600" size={18} /><div className="text-[11px] font-bold mt-1 text-slate-900">24×7</div><div className="text-[10px] text-slate-500">active</div></div>
        <div className="card p-3 text-center"><ShieldCheck className="mx-auto text-emerald-500" size={18} /><div className="text-[11px] font-bold mt-1 text-slate-900">Secure</div><div className="text-[10px] text-slate-500">private</div></div>
      </div>

      <a data-testid="whatsapp-btn" href={link} target="_blank" rel="noopener"
        className="mt-6 w-full flex items-center justify-center gap-2 bg-[#25D366] text-white font-bold py-3.5 rounded-xl shadow-lg active:scale-95 transition-transform">
        <MessageCircle size={20} /> MESSAGE ON WHATSAPP
      </a>
      <div className="text-center text-xs text-slate-500 mt-2">+91 {settings.whatsapp_number}</div>
    </AppLayout>
  );
}
