import React, { useEffect, useState } from "react";
import AppLayout from "@/layouts/AppLayout";
import { api } from "@/lib/api";
import { Bell, Check } from "lucide-react";

export default function Notifications() {
  const [items, setItems] = useState([]);
  const load = () => api.get("/notifications").then(r => setItems(r.data));
  useEffect(() => { load(); api.post("/notifications/read-all").catch(() => {}); }, []);

  return (
    <AppLayout>
      <h1 className="heading text-2xl font-extrabold text-slate-900">Notifications</h1>
      <div className="space-y-2 mt-3">
        {items.length === 0 && <div className="card p-4 text-slate-500 text-sm text-center">No notifications yet.</div>}
        {items.map(n => (
          <div key={n.id} className="card p-3 flex items-start gap-3" data-testid={`notif-${n.id}`}>
            <div className="icon-tile bg-purple-500"><Bell size={16} /></div>
            <div className="flex-1">
              <div className="font-bold text-slate-900 text-sm">{n.title}</div>
              <div className="text-xs text-slate-600">{n.body}</div>
              <div className="text-[10px] text-slate-400 mt-1">{new Date(n.created_at).toLocaleString()}</div>
            </div>
            {n.read && <Check size={14} className="text-emerald-500" />}
          </div>
        ))}
      </div>
    </AppLayout>
  );
}
