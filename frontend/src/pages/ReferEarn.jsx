import React, { useEffect, useState } from "react";
import AppLayout from "@/layouts/AppLayout";
import { Copy, Share2, Gift } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";

export default function ReferEarn() {
  const [data, setData] = useState(null);
  useEffect(() => { api.get("/referral").then(r => setData(r.data)); }, []);
  if (!data) return <AppLayout><div className="p-4 text-slate-500">Loading…</div></AppLayout>;

  const link = `${window.location.origin}/login?ref=${data.code}`;
  return (
    <AppLayout>
      <h1 className="heading text-2xl font-extrabold text-slate-900">Refer & Earn</h1>
      <div className="card p-5 mt-3 bg-gradient-to-br from-orange-500 to-rose-500 text-white border-0">
        <div className="flex items-center gap-2"><Gift size={20} /><div className="text-xs font-bold tracking-widest">EARN {data.percent}% ON EVERY BATTLE</div></div>
        <div className="heading text-3xl font-extrabold mt-2 tracking-widest" data-testid="ref-code">{data.code}</div>
        <div className="flex gap-2 mt-3">
          <button data-testid="copy-ref-btn" onClick={() => { navigator.clipboard?.writeText(data.code); toast.success("Copied"); }}
            className="flex-1 bg-white/20 py-2 rounded-xl flex items-center justify-center gap-1 font-bold"><Copy size={16} /> Copy Code</button>
          <button data-testid="share-ref-btn"
            onClick={async () => { try { await navigator.share?.({ text: `Play Ludo with me! Use my referral: ${data.code} at ${link}` }); } catch {} }}
            className="flex-1 bg-white/20 py-2 rounded-xl flex items-center justify-center gap-1 font-bold"><Share2 size={16} /> Share</button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-4">
        <div className="card p-4"><div className="text-xs text-slate-500">Total Referrals</div><div className="heading text-xl font-extrabold text-slate-900 mt-1" data-testid="ref-count">{data.total_referrals}</div></div>
        <div className="card p-4"><div className="text-xs text-slate-500">Earnings</div><div className="heading text-xl font-extrabold text-emerald-600 mt-1" data-testid="ref-earnings">₹{data.total_earnings}</div></div>
      </div>

      <div className="card p-4 mt-4">
        <div className="text-xs font-bold tracking-widest text-slate-500">HOW IT WORKS</div>
        <ol className="text-sm text-slate-700 mt-2 space-y-1 list-decimal list-inside">
          <li>Share your code with friends</li>
          <li>They sign up using your code</li>
          <li>You earn {data.percent}% on every battle they play</li>
        </ol>
      </div>
    </AppLayout>
  );
}
