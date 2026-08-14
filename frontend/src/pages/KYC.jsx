import React, { useEffect, useState } from "react";
import AppLayout from "@/layouts/AppLayout";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

export default function KYC() {
  const { refresh } = useAuth();
  const [form, setForm] = useState({ full_name: "", dob: "", pan: "", upi_id: "" });
  const [status, setStatus] = useState("");
  useEffect(() => { api.get("/kyc/mine").then(r => setStatus(r.data?.status || "not_started")); }, []);
  const submit = async () => {
    if (!form.full_name || !form.dob || !form.pan) { toast.error("Fill all required fields"); return; }
    try { await api.post("/kyc/submit", form); toast.success("KYC submitted"); await refresh(); setStatus("pending"); }
    catch (e) { toast.error(e.message); }
  };
  return (
    <AppLayout>
      <h1 className="heading text-2xl font-extrabold text-slate-900">Complete KYC</h1>
      <div className="text-xs mt-1"><span className="pill pill-orange">{status.toUpperCase()}</span></div>
      <div className="card p-4 mt-3 space-y-3">
        <input data-testid="kyc-name" placeholder="Full Name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="w-full border border-slate-200 rounded-xl px-3 py-3 outline-none" />
        <input data-testid="kyc-dob" placeholder="DOB (YYYY-MM-DD)" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} className="w-full border border-slate-200 rounded-xl px-3 py-3 outline-none" />
        <input data-testid="kyc-pan" placeholder="PAN Number" value={form.pan} onChange={(e) => setForm({ ...form, pan: e.target.value.toUpperCase() })} className="w-full border border-slate-200 rounded-xl px-3 py-3 outline-none" />
        <input data-testid="kyc-upi" placeholder="Payout UPI (optional)" value={form.upi_id} onChange={(e) => setForm({ ...form, upi_id: e.target.value })} className="w-full border border-slate-200 rounded-xl px-3 py-3 outline-none" />
        <button data-testid="submit-kyc-btn" onClick={submit} className="btn-primary w-full">Submit KYC</button>
      </div>
    </AppLayout>
  );
}
