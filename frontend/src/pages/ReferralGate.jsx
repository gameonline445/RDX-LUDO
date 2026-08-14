import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

export default function ReferralGate() {
  const { code } = useParams();
  const nav = useNavigate();
  useEffect(() => {
    if (code) localStorage.setItem("pending_referral", code.toUpperCase());
    nav("/login", { replace: true });
  }, [code, nav]);
  return <div className="app-shell p-6 text-slate-500 text-center">Applying referral…</div>;
}
