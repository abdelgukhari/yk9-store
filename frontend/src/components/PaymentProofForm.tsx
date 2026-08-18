"use client";

import { useRef, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useApp } from "@/lib/app-context";

export default function PaymentProofForm({
  orderNumber,
  phone,
  onSubmitted,
}: {
  orderNumber: string;
  phone: string;
  onSubmitted?: () => void;
}) {
  const { showToast } = useApp();
  const [senderNumber, setSenderNumber] = useState(phone);
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) {
      showToast("اختر صورة إثبات التحويل");
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("order_number", orderNumber);
      fd.append("phone", phone);
      fd.append("sender_number", senderNumber);
      fd.append("reference", reference);
      fd.append("note", note);
      fd.append("proof_image", file);
      await api(`/api/orders/${orderNumber}/payment-proof/`, {
        method: "POST",
        body: fd,
        form: true,
        guest: true,
      });
      setDone(true);
      onSubmitted?.();
      showToast("تم إرسال إثبات الدفع بنجاح");
    } catch (err) {
      const msg = err instanceof ApiError ? err.detail : "تعذر إرسال الإثبات";
      showToast(msg);
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="rounded-xl border border-success/30 bg-success/10 p-4 text-sm">
        تم استلام إثبات الدفع الخاص بك بنجاح، وسيتم التحقق منه والرد عليك بأقرب وقت.
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs text-muted">
            رقم المرسل (فودافون كاش) *
          </label>
          <input
            required
            pattern="01[0-9]{9}"
            title="رقم مصري صحيح مثل 01012345678"
            value={senderNumber}
            onChange={(e) => setSenderNumber(e.target.value)}
            className="w-full rounded-lg border border-line bg-bg-card px-3 py-2 text-sm outline-none focus:border-gold"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted">
            رقم العملية المرجعي (اختياري)
          </label>
          <input
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="الرقم الذي يصل في رسالة فودافون"
            className="w-full rounded-lg border border-line bg-bg-card px-3 py-2 text-sm outline-none focus:border-gold"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs text-muted">صورة إثبات التحويل *</label>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
          className="w-full rounded-lg border border-line bg-bg-card px-3 py-2 text-sm text-muted file:ml-3 file:mr-0 file:cursor-pointer file:rounded-lg file:border-0 file:bg-gold/15 file:px-3 file:py-1.5 file:text-sm file:font-bold file:text-gold focus:border-gold"
        />
        {fileName && <p className="mt-1 text-xs text-muted">{fileName}</p>}
      </div>

      <div>
        <label className="mb-1 block text-xs text-muted">ملاحظة (اختياري)</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-line bg-bg-card px-3 py-2 text-sm outline-none focus:border-gold"
        />
      </div>

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-xl bg-gold py-3 font-bold text-black transition hover:bg-gold-light disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "جارٍ إرسال الإثبات..." : "إرسال إثبات الدفع"}
      </button>
    </form>
  );
}
