import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { Dice5, ShieldCheck } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function Login() {
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [refCode, setRefCode] = useState("");
  const [stage, setStage] = useState("mobile");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();

  const send = async () => {
    if (!/^\d{10}$/.test(mobile)) { toast.error("Enter valid 10-digit mobile"); return; }
    setLoading(true);
    try {
      const { data } = await api.post("/auth/send-otp", { mobile });
      toast.success(`Demo OTP: ${data.demo_otp}`);
      setStage("otp");
    } catch (e) { toast.error(e.message); } finally { setLoading(false); }
  };

  const verify = async () => {
    if (otp.length < 4) { toast.error("Enter OTP"); return; }
    setLoading(true);
    try {
      const { data } = await api.post("/auth/verify-otp", { mobile, otp, referral_code: refCode || undefined });
      await login(data.token, data.user);
      toast.success(`Welcome, ${data.user.username}!`);
      nav("/", { replace: true });
    } catch (e) { toast.error(e.message); } finally { setLoading(false); }
  };

  return (
    <div className="app-shell flex flex-col">
      <div className="px-6 pt-16 pb-8 bg-gradient-to-b from-indigo-100 via-blue-50 to-transparent">
        <div className="flex flex-col items-center gap-3">
          <div className="w-20 h-20 rounded-3xl bg-white shadow-lg flex items-center justify-center border border-blue-100">
            <Dice5 size={40} className="text-blue-600" />
          </div>
          <h1 className="heading text-3xl font-extrabold tracking-tight text-slate-900">MY LUDO</h1>
          <p className="text-slate-500 text-sm">Play · Win · Earn</p>
        </div>
      </div>

      <div className="px-6 py-6 flex-1">
        <div className="card p-5 space-y-4">
          {stage === "mobile" && (
            <>
              <label className="text-xs font-bold tracking-wider text-slate-500">MOBILE NUMBER</label>
              <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden">
                <span className="px-3 py-3 bg-slate-50 text-slate-600 border-r border-slate-200 font-semibold">+91</span>
                <input
                  data-testid="mobile-input"
                  type="tel" maxLength={10} value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
                  placeholder="10-digit mobile"
                  className="flex-1 px-3 py-3 outline-none"
                />
              </div>
              <input
                data-testid="referral-input"
                value={refCode} onChange={(e) => setRefCode(e.target.value.toUpperCase())}
                placeholder="Referral code (optional)"
                className="w-full border border-slate-200 rounded-xl px-3 py-3 outline-none"
              />
              <button data-testid="send-otp-btn" onClick={send} disabled={loading} className="btn-primary w-full">
                {loading ? "Sending…" : "Send OTP"}
              </button>
              <div className="text-xs text-slate-500 flex items-center gap-2 justify-center pt-2">
                <ShieldCheck size={14} /> Demo mode: use OTP <b className="text-slate-700">123456</b>
              </div>
            </>
          )}
          {stage === "otp" && (
            <>
              <label className="text-xs font-bold tracking-wider text-slate-500">ENTER OTP</label>
              <input
                data-testid="otp-input"
                type="tel" maxLength={6} value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                placeholder="6-digit OTP"
                className="w-full border border-slate-200 rounded-xl px-3 py-3 outline-none text-2xl tracking-widest text-center"
              />
              <button data-testid="verify-otp-btn" onClick={verify} disabled={loading} className="btn-primary w-full">
                {loading ? "Verifying…" : "Verify & Continue"}
              </button>
              <button className="text-blue-600 text-sm font-semibold w-full" onClick={() => setStage("mobile")}>Change mobile</button>
            </>
          )}
        </div>
        <div className="text-center text-xs text-slate-400 mt-6">
          By continuing you agree to the Terms & Privacy Policy.
        </div>
      </div>
    </div>
  );
}
