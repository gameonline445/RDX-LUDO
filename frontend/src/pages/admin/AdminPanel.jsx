import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API } from "@/lib/api";
import { toast } from "sonner";
import { Shield, Users, ArrowDownToLine, ArrowUpFromLine, GamepadIcon, Settings as SettingsIcon, LogOut, ShieldCheck, FileText } from "lucide-react";

const adminApi = axios.create({ baseURL: API });
adminApi.interceptors.request.use((cfg) => {
  const t = localStorage.getItem("admin_token");
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

const TABS = [
  { key: "dashboard", label: "Dashboard", icon: Shield },
  { key: "users", label: "Users", icon: Users },
  { key: "deposits", label: "Deposits", icon: ArrowDownToLine },
  { key: "withdrawals", label: "Withdrawals", icon: ArrowUpFromLine },
  { key: "battles", label: "Battles", icon: GamepadIcon },
  { key: "kyc", label: "KYC", icon: ShieldCheck },
  { key: "settings", label: "Settings", icon: SettingsIcon },
];

export default function AdminPanel() {
  const [tab, setTab] = useState("dashboard");
  const [stats, setStats] = useState({});
  const [users, setUsers] = useState([]);
  const [deps, setDeps] = useState([]);
  const [wds, setWds] = useState([]);
  const [battles, setBattles] = useState([]);
  const [kyc, setKyc] = useState([]);
  const [settings, setSettings] = useState({});
  const nav = useNavigate();

  const logout = () => { localStorage.removeItem("admin_token"); nav("/admin"); };

  const load = useCallback(async () => {
    try {
      if (tab === "dashboard") setStats((await adminApi.get("/admin/dashboard")).data);
      if (tab === "users") setUsers((await adminApi.get("/admin/users")).data);
      if (tab === "deposits") setDeps((await adminApi.get("/admin/deposits", { params: { status_filter: "pending" } })).data);
      if (tab === "withdrawals") setWds((await adminApi.get("/admin/withdrawals", { params: { status_filter: "pending" } })).data);
      if (tab === "battles") setBattles((await adminApi.get("/admin/battles")).data);
      if (tab === "kyc") setKyc((await adminApi.get("/admin/kyc")).data);
      if (tab === "settings") setSettings((await adminApi.get("/admin/settings")).data);
    } catch (e) {
      if (e?.response?.status === 401 || e?.response?.status === 403) { logout(); }
      else toast.error(e?.response?.data?.detail || e.message);
    }
    // eslint-disable-next-line
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  const depAction = async (id, action) => {
    try { await adminApi.post("/admin/deposits/action", { deposit_id: id, action }); toast.success("Done"); load(); }
    catch (e) { toast.error(e?.response?.data?.detail || e.message); }
  };
  const wdAction = async (id, action) => {
    try { await adminApi.post("/admin/withdrawals/action", { withdrawal_id: id, action }); toast.success("Done"); load(); }
    catch (e) { toast.error(e?.response?.data?.detail || e.message); }
  };
  const kycAction = async (uid, action) => {
    try { await adminApi.post("/admin/kyc/action", { user_id: uid, action }); toast.success("Done"); load(); }
    catch (e) { toast.error(e?.response?.data?.detail || e.message); }
  };
  const userStatus = async (uid, s) => {
    try { await adminApi.post("/admin/users/status", { user_id: uid, status: s }); toast.success("Updated"); load(); }
    catch (e) { toast.error(e?.response?.data?.detail || e.message); }
  };
  const saveSettings = async () => {
    try { const { data } = await adminApi.post("/admin/settings", settings); setSettings(data); toast.success("Saved"); }
    catch (e) { toast.error(e?.response?.data?.detail || e.message); }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      <aside className="w-56 bg-slate-900 border-r border-slate-800 flex flex-col">
        <div className="p-4 flex items-center gap-2 border-b border-slate-800">
          <Shield className="text-blue-400" /> <span className="font-extrabold">MY LUDO Admin</span>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {TABS.map(t => {
            const Icon = t.icon;
            return (
              <button key={t.key} data-testid={`admin-tab-${t.key}`} onClick={() => setTab(t.key)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold ${tab === t.key ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-slate-800"}`}>
                <Icon size={16} /> {t.label}
              </button>
            );
          })}
        </nav>
        <button onClick={logout} className="m-3 py-2 rounded-xl bg-red-600 flex items-center justify-center gap-2 font-bold"><LogOut size={16} /> Logout</button>
      </aside>

      <main className="flex-1 p-6 overflow-x-auto">
        <h1 className="text-2xl font-extrabold capitalize">{tab}</h1>

        {tab === "dashboard" && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
            {[
              ["Total Users", stats.total_users, "text-blue-400"],
              ["Active", stats.active_users, "text-emerald-400"],
              ["Live Battles", stats.live_battles, "text-orange-400"],
              ["Total Battles", stats.total_battles, "text-purple-400"],
              ["Pending Deposits", stats.pending_deposits, "text-yellow-400"],
              ["Pending Withdrawals", stats.pending_withdrawals, "text-yellow-400"],
              ["Pending KYC", stats.pending_kyc, "text-orange-400"],
              ["Open Tickets", stats.open_tickets, "text-cyan-400"],
              ["Total Deposits", `₹${stats.total_deposits || 0}`, "text-emerald-400"],
              ["Total Withdrawals", `₹${stats.total_withdrawals || 0}`, "text-red-400"],
            ].map(([l, v, c]) => (
              <div key={l} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="text-xs text-slate-400">{l}</div>
                <div className={`text-2xl font-extrabold mt-1 ${c}`}>{v ?? 0}</div>
              </div>
            ))}
          </div>
        )}

        {tab === "users" && (
          <table className="w-full mt-4 text-sm">
            <thead className="text-slate-400 text-left"><tr><th className="p-2">Username</th><th>Mobile</th><th>Wallet</th><th>KYC</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-t border-slate-800">
                  <td className="p-2 font-bold">{u.username}</td>
                  <td>{u.mobile}</td>
                  <td>₹{((u.wallet?.deposit_balance || 0) + (u.wallet?.winnings_balance || 0) + (u.wallet?.bonus_balance || 0)).toFixed(2)}</td>
                  <td className="capitalize">{u.kyc_status}</td>
                  <td className="capitalize">{u.account_status}</td>
                  <td>
                    {u.account_status === "active"
                      ? <button data-testid={`suspend-${u.id}`} onClick={() => userStatus(u.id, "suspended")} className="text-red-400 text-xs font-bold">Suspend</button>
                      : <button data-testid={`activate-${u.id}`} onClick={() => userStatus(u.id, "active")} className="text-emerald-400 text-xs font-bold">Activate</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === "deposits" && (
          <div className="space-y-2 mt-4">
            {deps.length === 0 && <div className="text-slate-500">No pending deposits.</div>}
            {deps.map(d => (
              <div key={d.id} className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center gap-3">
                {d.screenshot && <img src={d.screenshot} className="w-16 h-16 rounded object-cover" alt="ss" />}
                <div className="flex-1">
                  <div className="font-bold">{d.username} · ₹{d.amount}</div>
                  <div className="text-xs text-slate-400">UTR: {d.utr} · {new Date(d.created_at).toLocaleString()}</div>
                </div>
                <button data-testid={`verify-dep-${d.id}`} onClick={() => depAction(d.id, "verify")} className="bg-emerald-600 px-3 py-1.5 rounded-lg text-sm font-bold">Verify</button>
                <button data-testid={`reject-dep-${d.id}`} onClick={() => depAction(d.id, "reject")} className="bg-red-600 px-3 py-1.5 rounded-lg text-sm font-bold">Reject</button>
              </div>
            ))}
          </div>
        )}

        {tab === "withdrawals" && (
          <div className="space-y-2 mt-4">
            {wds.length === 0 && <div className="text-slate-500">No pending withdrawals.</div>}
            {wds.map(d => (
              <div key={d.id} className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center gap-3">
                <div className="flex-1">
                  <div className="font-bold">{d.username} · ₹{d.amount}</div>
                  <div className="text-xs text-slate-400">
                    {d.method === "bank"
                      ? `Bank · ${d.holder_name || "-"} · A/C ${d.account_number} · IFSC ${d.ifsc}${d.bank_name ? " · " + d.bank_name : ""}`
                      : `UPI · ${d.upi_id}${d.holder_name ? " · " + d.holder_name : ""}`}
                  </div>
                  <div className="text-[10px] text-slate-500">{new Date(d.created_at).toLocaleString()}</div>
                </div>
                <button onClick={() => wdAction(d.id, "approve")} className="bg-blue-600 px-3 py-1.5 rounded-lg text-sm font-bold">Approve</button>
                <button onClick={() => wdAction(d.id, "mark_paid")} className="bg-emerald-600 px-3 py-1.5 rounded-lg text-sm font-bold">Mark Paid</button>
                <button onClick={() => wdAction(d.id, "reject")} className="bg-red-600 px-3 py-1.5 rounded-lg text-sm font-bold">Reject</button>
              </div>
            ))}
          </div>
        )}

        {tab === "battles" && (
          <table className="w-full mt-4 text-sm">
            <thead className="text-slate-400 text-left"><tr><th className="p-2">Room</th><th>Players</th><th>Entry</th><th>Prize</th><th>Status</th><th>Winner</th></tr></thead>
            <tbody>
              {battles.map(b => (
                <tr key={b.id} className="border-t border-slate-800">
                  <td className="p-2 font-bold">{b.room_code}</td>
                  <td>{(b.player_details || []).map(p => p.username).join(" vs ")}</td>
                  <td>₹{b.entry_amount}</td>
                  <td>₹{b.prize_amount}</td>
                  <td className="capitalize">{b.status}</td>
                  <td>{b.winner_id ? "yes" : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === "kyc" && (
          <div className="space-y-2 mt-4">
            {kyc.length === 0 && <div className="text-slate-500">No pending KYC.</div>}
            {kyc.map(k => (
              <div key={k.id} className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center gap-3">
                <div className="flex-1"><div className="font-bold">{k.full_name}</div><div className="text-xs text-slate-400">PAN: {k.pan} · DOB: {k.dob}</div></div>
                <button onClick={() => kycAction(k.user_id, "approve")} className="bg-emerald-600 px-3 py-1.5 rounded-lg text-sm font-bold">Approve</button>
                <button onClick={() => kycAction(k.user_id, "reject")} className="bg-red-600 px-3 py-1.5 rounded-lg text-sm font-bold">Reject</button>
              </div>
            ))}
          </div>
        )}

        {tab === "settings" && (
          <div className="space-y-3 mt-4 max-w-xl">
            {["app_name", "upi_id", "payee_name", "support_number", "whatsapp_number", "min_deposit", "max_deposit", "min_withdraw", "max_withdraw", "platform_fee_percent", "referral_percent", "turn_timer_seconds", "room_expiry_minutes"].map(k => (
              <label key={k} className="block">
                <span className="text-xs text-slate-400 uppercase">{k.replaceAll("_"," ")}</span>
                <input data-testid={`setting-${k}`} value={settings[k] ?? ""} onChange={(e) => setSettings({ ...settings, [k]: e.target.value })}
                  className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 outline-none" />
              </label>
            ))}
            {["maintenance_mode", "real_money_mode", "demo_mode"].map(k => (
              <label key={k} className="flex items-center gap-2">
                <input type="checkbox" checked={!!settings[k]} onChange={(e) => setSettings({ ...settings, [k]: e.target.checked })} />
                <span className="text-sm">{k.replaceAll("_"," ")}</span>
              </label>
            ))}
            <button data-testid="save-settings-btn" onClick={saveSettings} className="bg-blue-600 hover:bg-blue-700 px-6 py-2.5 rounded-xl font-bold">Save Settings</button>
          </div>
        )}
      </main>
    </div>
  );
}
