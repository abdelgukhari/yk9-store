"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import PaymentProofForm from "@/components/PaymentProofForm";
import type { Order } from "@/lib/types";

function formatEGP(value: string | number) {
  return `${Number(value).toLocaleString("ar-EG")} ج.م`;
}

const STATUS_LABELS: Record<string, string> = {
  Pending: "بانتظار المعالجة",
  AwaitingConfirmation: "بانتظار تأكيد الطلب",
  PaymentVerificationPending: "بانتظار التحقق من الدفع",
  PaymentRejected: "تم رفض الدفع",
  Confirmed: "تم تأكيد الطلب",
  Processing: "قيد التجهيز",
  Shipped: "تم الشحن",
  Delivered: "تم التوصيل",
  Cancelled: "تم الإلغاء",
  Returned: "تم الاسترجاع",
  Refunded: "تم استرداد المبلغ",
};

export default function TrackPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-2xl px-4 py-10"><div className="card-premium h-72 animate-pulse" /></div>}>
      <TrackContent />
    </Suspense>
  );
}

function TrackContent() {
  const params = useSearchParams();
  const [orderNumber, setOrderNumber] = useState(params.get("order") ?? "");
  const [phone, setPhone] = useState("");
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const track = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setBusy(true);
    setError("");
    setOrder(null);
    try {
      const o = await api<Order>("/api/orders/track/", {
        method: "POST",
        body: JSON.stringify({ order_number: orderNumber, phone }),
      });
      setOrder(o);
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر العثور على الطلب");
    } finally {
      setBusy(false);
    }
  };

  const canSubmitProof =
    order?.payment_method === "VODAFONE_CASH" &&
    (order.status === "PaymentVerificationPending" || order.status === "PaymentRejected");

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-3xl font-extrabold">تتبع طلبك</h1>
      <p className="mt-2 text-muted">أدخل رقم الطلب ورقم الموبايل المسجل به.</p>

      <form onSubmit={track} className="card-premium mt-6 space-y-4 p-6">
        <div>
          <label className="mb-1 block text-sm text-muted">رقم الطلب *</label>
          <input
            required
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            placeholder="YK9-20260817-XXXXXX"
            className="w-full rounded-lg border border-line bg-bg-card px-3 py-2.5 text-sm outline-none focus:border-gold"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-muted">رقم الموبايل *</label>
          <input
            required
            pattern="01[0-9]{9}"
            title="رقم مصري صحيح مثل 01012345678"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="01XXXXXXXXX"
            className="w-full rounded-lg border border-line bg-bg-card px-3 py-2.5 text-sm outline-none focus:border-gold"
          />
        </div>
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-gold py-3 font-bold text-black transition hover:bg-gold-light disabled:opacity-50"
        >
          {busy ? "جارٍ البحث..." : "تتبع الطلب"}
        </button>
        {error && <p className="text-sm text-danger">{error}</p>}
      </form>

      {order && (
        <div className="card-premium mt-8 p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-sm text-muted">الطلب</div>
              <div className="text-lg font-extrabold text-gold">{order.order_number}</div>
            </div>
            <div className="rounded-full bg-gold/15 px-4 py-1.5 text-sm font-bold text-gold">
              {STATUS_LABELS[order.status] ?? order.status}
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {order.status_history.map((h, i) => (
              <div key={i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={`h-3 w-3 rounded-full ${i === 0 ? "bg-gold" : "bg-line"}`} />
                  {i < order.status_history.length - 1 && <div className="w-px flex-1 bg-line" />}
                </div>
                <div className="pb-1">
                  <div className="text-sm font-semibold">{STATUS_LABELS[h.new_status] ?? h.new_status}</div>
                  <div className="text-xs text-muted">
                    {new Date(h.created_at).toLocaleString("ar-EG")}
                    {h.reason ? ` — ${h.reason}` : ""}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 space-y-2 border-t border-line pt-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">الإجمالي</span>
              <span className="font-bold text-gold">{formatEGP(order.total)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">طريقة الدفع</span>
              <span>{order.payment_method === "COD" ? "الدفع عند الاستلام" : "فودافون كاش"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">العنوان</span>
              <span className="text-left">{order.governorate_name} — {order.address_detail}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">التوصيل المتوقع</span>
              <span>{order.estimated_delivery_days} يوم عمل</span>
            </div>
          </div>

          <div className="mt-4 space-y-2 border-t border-line pt-4">
            {order.items.map((it, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-muted">{it.product_name} × {it.quantity}</span>
                <span>{formatEGP(it.total)}</span>
              </div>
            ))}
          </div>

          {order.payment_method === "VODAFONE_CASH" && order.proofs.length > 0 && (
            <div className="mt-5 border-t border-line pt-4">
              <h3 className="mb-2 font-bold text-sm">إثباتات الدفع المرسلة</h3>
              <div className="space-y-2">
                {order.proofs.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 rounded-lg bg-bg-raised p-3 text-sm">
                    <a href={p.image_url} target="_blank" rel="noreferrer" className="shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.image_url} alt="إثبات دفع" className="h-12 w-12 rounded-lg object-cover" />
                    </a>
                    <div className="min-w-0">
                      <div className="text-muted text-xs">
                        المرسل: {p.sender_number}
                        {p.reference ? ` — مرجع: ${p.reference}` : ""}
                      </div>
                      <div className="text-xs text-muted">
                        {new Date(p.submitted_at).toLocaleString("ar-EG")}
                      </div>
                      {p.note && <div className="truncate text-xs text-muted">{p.note}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {order.status === "PaymentRejected" && (
            <div className="mt-5 rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm">
              <span className="font-bold text-danger">تم رفض إثبات الدفع:</span>{" "}
              {order.payment_rejection_reason || "التحويل غير مؤكد."} يمكنك إعادة إرسال إثبات أوضح.
            </div>
          )}

          {canSubmitProof && (
            <div className="mt-5 border-t border-line pt-4">
              <h3 className="mb-3 font-bold text-sm">
                {order.status === "PaymentRejected"
                  ? "إعادة إرسال إثبات الدفع"
                  : "أرسل إثبات التحويل"}
              </h3>
              <PaymentProofForm
                orderNumber={order.order_number}
                phone={phone}
                onSubmitted={() => track()}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
