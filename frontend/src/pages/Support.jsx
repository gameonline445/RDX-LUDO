import React from "react";
import AppLayout from "@/layouts/AppLayout";
import { MessageCircle, ShieldCheck, Clock, LifeBuoy, ChevronRight, Zap, Headphones } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function Support() {
  const { settings } = useAuth();
  const num = (settings.whatsapp_number || "8306865537").replace(/\D/g, "");
  const link = `https://wa.me/91${num}?text=${encodeURIComponent("Hi, I need help with " + (settings.app_name || "RDX LUDO"))}`;

  return (
    <AppLayout active="support">
      <div className="card p-5 bg-gradient-to-br from-blue-50 via-indigo-50 to-transparent border-slate-100">
        <div className="flex items-start justify-between">
          <span className="pill pill-blue flex items-center gap-1" data-testid="support-title-pill">
            <Headphones size={12} /> SUPPORT CENTER
          </span>
          <span className="pill pill-green flex items-center gap-1" data-testid="support-online-pill">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> ONLINE
          </span>
        </div>
        <h1 className="heading text-3xl font-extrabold text-slate-900 mt-3">We're here for you</h1>
        <p className="text-slate-500 text-sm mt-1">Get help with battles, wallet, KYC and more — anytime.</p>
        <div className="flex flex-wrap gap-2 mt-4">
          <span className="pill bg-white border border-slate-200 text-slate-700 flex items-center gap-1"><Zap size={12} className="text-blue-600" /> 1–2 min reply</span>
          <span className="pill bg-white border border-slate-200 text-slate-700 flex items-center gap-1"><Clock size={12} className="text-blue-600" /> 24×7 active</span>
          <span className="pill bg-white border border-slate-200 text-slate-700 flex items-center gap-1"><ShieldCheck size={12} className="text-blue-600" /> Secure</span>
        </div>
      </div>

      <div className="mt-6 text-xs font-bold tracking-widest text-blue-600">CONTACT OPTIONS</div>
      <a data-testid="whatsapp-btn" href={link} target="_blank" rel="noopener"
        className="mt-2 card p-3 flex items-center gap-3 hover:-translate-y-0.5 transition-transform">
        <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center">
          <MessageCircle size={26} className="text-emerald-600" />
        </div>
        <div className="flex-1">
          <div className="heading font-extrabold text-slate-900">WhatsApp</div>
          <div className="text-xs text-slate-500">Message us on WhatsApp</div>
        </div>
        <span className="text-[10px] font-extrabold tracking-widest text-slate-500">INSTANT</span>
        <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center"><ChevronRight size={16} /></div>
      </a>

      <div className="text-center text-xs text-slate-500 mt-3">
        Our team usually replies within 1–2 minutes during active hours.
      </div>
      <div className="text-center text-[11px] text-slate-400 mt-1">
        +91 {settings.whatsapp_number || "8306865537"}
      </div>
    </AppLayout>
  );
}
