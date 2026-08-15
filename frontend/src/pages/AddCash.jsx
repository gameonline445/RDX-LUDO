import React, { useEffect, useState } from "react";
import AppLayout from "@/layouts/AppLayout";
import { api } from "@/lib/api";
import { Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export default function AddCash() {
  const [amount, setAmount] = useState("100");
  const [qr, setQr] = useState(null);
  const [utr, setUtr] = useState("");
  const [screenshot, setScreenshot] = useState("");
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  const loadQr = async (amt) => {
    try {
      const { data } = await api.get("/deposits/qr", {
        params: { amount: amt },
      });
      setQr(data);
    } catch (e) {
      toast.error(e.message);
    }
  };

  useEffect(() => {
    loadQr(amount || undefined);
  }, [amount]);

  const onAmount = (v) => {
    setAmount(v);
  };

  const submit = async () => {
    const a = parseFloat(amount);

    if (!a || a <= 0) {
      toast.error("Enter amount");
      return;
    }

    if (!utr.trim()) {
      toast.error("Enter UTR");
      return;
    }

    setLoading(true);

    try {
      await api.post("/deposits/create", {
        amount: a,
        utr,
        screenshot_data_url: screenshot || null,
      });

      toast.success("Deposit submitted for verification");
      nav("/wallet");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const onFile = (e) => {
    const f = e.target.files?.[0];

    if (!f) return;

    const r = new FileReader();

    r.onload = () => setScreenshot(r.result);

    r.readAsDataURL(f);
  };

  return (
    <AppLayout active="wallet">
      <h1 className="heading text-2xl font-extrabold text-slate-900">
        Add Cash
      </h1>

      <div className="card p-4 mt-3">
        <label className="text-xs font-bold tracking-wider text-slate-500">
          AMOUNT (₹)
        </label>

        <input
          data-testid="deposit-amount-input"
          value={amount}
          onChange={(e) =>
            onAmount(e.target.value.replace(/\D/g, ""))
          }
          className="w-full mt-2 border border-slate-200 rounded-xl px-3 py-3 text-2xl font-bold outline-none"
        />

        <div className="flex gap-2 mt-2">
          {[100, 200, 500, 1000].map((v) => (
            <button
              key={v}
              data-testid={`quick-dep-${v}`}
              onClick={() => onAmount(String(v))}
              className={`flex-1 py-2 rounded-full border font-bold text-sm ${
                String(amount) === String(v)
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-slate-700 border-slate-200"
              }`}
            >
              ₹{v}
            </button>
          ))}
        </div>
      </div>

      <div className="card p-4 mt-4 text-center">
        <div className="text-xs font-bold tracking-widest text-slate-500">
          SCAN & PAY
        </div>

        {qr?.qr_data_url ? (
          <img
            data-testid="upi-qr"
            src={qr.qr_data_url}
            alt="UPI QR"
            className="mx-auto w-56 h-56 rounded-2xl border border-slate-200 mt-2"
          />
        ) : (
          <div className="w-56 h-56 mx-auto rounded-2xl bg-slate-100 animate-pulse mt-2" />
        )}

        <div className="mt-3 flex items-center justify-center gap-2">
          <div
            className="font-bold text-slate-900 select-all"
            data-testid="upi-id"
          >
            {qr?.upi_id}
          </div>

          <button
            data-testid="copy-upi-btn"
            onClick={() => {
              navigator.clipboard?.writeText(qr?.upi_id || "");
              toast.success("UPI ID copied");
            }}
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center"
          >
            <Copy size={14} />
          </button>
        </div>

        <a
          data-testid="open-upi-btn"
          href={qr?.upi_uri || "#"}
          className="inline-flex items-center gap-2 mt-3 text-blue-600 font-bold text-sm"
        >
          <ExternalLink size={14} />
          Open UPI App
        </a>
      </div>

      <div className="card p-4 mt-4 space-y-3">
        <div className="text-xs font-bold tracking-widest text-slate-500">
          AFTER PAYMENT — SUBMIT PROOF
        </div>

        <input
          data-testid="utr-input"
          value={utr}
          onChange={(e) => setUtr(e.target.value)}
          placeholder="UTR / Transaction ID"
          className="w-full border border-slate-200 rounded-xl px-3 py-3 outline-none"
        />

        <div>
          <label className="text-xs text-slate-500">
            Payment Screenshot (optional)
          </label>

          <input
            data-testid="screenshot-input"
            type="file"
            accept="image/*"
            onChange={onFile}
            className="w-full mt-1 text-sm"
          />

          {screenshot && (
            <img
              src={screenshot}
              alt="proof"
              className="mt-2 w-24 h-24 rounded-lg object-cover"
            />
          )}
        </div>

        <button
          data-testid="submit-deposit-btn"
          onClick={submit}
          disabled={loading}
          className="btn-primary w-full"
        >
          {loading ? "Submitting…" : "Submit Deposit Request"}
        </button>

        <div className="text-[11px] text-slate-500 text-center">
          Admin will verify manually. Do NOT expect instant credit.
        </div>
      </div>
    </AppLayout>
  );
}
