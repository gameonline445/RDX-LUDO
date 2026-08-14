import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Shield } from "lucide-react";

export default function AdminLogin() {
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const nav = useNavigate();

  const login = async () => {
    try {
      const { data } = await api.post("/admin/login", { username: u, password: p });
      localStorage.setItem("admin_token", data.token);
      toast.success("Welcome admin");
      nav("/admin/panel");
    } catch (e) { toast.error(e.message); }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-600 flex items-center justify-center"><Shield /></div>
          <div><div className="text-xs uppercase text-slate-400">MY LUDO</div><div className="text-xl font-extrabold">Admin Panel</div></div>
        </div>
        <input data-testid="admin-user" value={u} onChange={(e) => setU(e.target.value)} placeholder="Username" className="w-full mt-6 bg-slate-900 border border-slate-700 rounded-xl px-3 py-3 outline-none" />
        <input data-testid="admin-pass" value={p} onChange={(e) => setP(e.target.value)} type="password" placeholder="Password" className="w-full mt-2 bg-slate-900 border border-slate-700 rounded-xl px-3 py-3 outline-none" />
        <button data-testid="admin-login-btn" onClick={login} className="w-full mt-4 bg-blue-600 hover:bg-blue-700 rounded-xl py-3 font-bold">Login</button>
        <div className="text-xs text-slate-400 mt-3 text-center">Default: admin / admin@1234</div>
      </div>
    </div>
  );
}
