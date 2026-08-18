"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useApp } from "@/lib/app-context";
import {
  type AdminOrderDetail,
  formatEGP,
  formatDate,
  statusLabel,
  statusStyle,
} from "@/lib/admin";

const TRANSITION_LABELS: Record<string, string> = {
  AwaitingConfirmation: "تأكيد الطلب",
  Confirmed: "تأكيد",
  PaymentVerificationPending: "بانتظار مراجعة الدفع",
  PaymentRejected: "الدفع مرفوض",
  Processing: "بدء التجهيز",
  Shipped: "تم الشحن",
  Delivered: "تم التسليم",
  Cancelled: "إلغاء",
  Returned: "إرجاع",
  Refunded: "استرداد",
};

export default function AdminOrderDetailPage() {
  const params = useParams<{ orderNumber: string }>();
  const { showToast } = useApp();
  const [data, setData] = useState<AdminOrderDetail | null>(null);
  const [busy, setBusy] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const load = useCallback(() => {
    api<AdminOrderDetail>(`/api/admin/orders/${params.orderNumber}/`, { auth: true })
      .then(setData)
      .catch(() => setData(null));
  }, [params.orderNumber]);

  useEffect(() => {
    load();
  }, [load]);

  if (!data) return <p className="text-muted">جارٍ التحميل...</p>;

  const o = data.order;
  const showPaymentReview =
    o.payment_method === "VODAFONE_CASH" &&
    (o.status === "PaymentVerificationPending" || o.status === "PaymentRejected");

  const act = async (newStatus: string, reason = "") => {
    setBusy(true);
    try {
      await api<AdminOrderDetail>(`/api/admin/orders/${o.order_number}/transition/`, {
        method: "POST",
        body: JSON.stringify({ new_status: newStatus, reason }),
        auth: true,
      });
      showToast("تم تحديث الحالة");
      load();
    } catch (err) {
      showToast(err instanceof ApiError ? err.detail : "حدث خطأ");
    } finally {
      setBusy(false);
    }
  };

  const reviewPayment = async (decision: "accept" | "reject") => {
    setBusy(true);
    try {
      await api<AdminOrderDetail>(`/api/admin/orders/${o.order_number}/payment/review/`, {
        method: "POST",
        body: JSON.stringify({
          decision,
          rejection_reason: decision === "reject" ? rejectReason : "",
        }),
        auth: true,
      });
      showToast(decision === "accept" ? "تم قبول الدفع" : "تم رفض الدفع");
      setRejectReason("");
      load();
    } catch (err) {
      showToast(err instanceof ApiError ? err.detail : "حدث خطأ");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/admin/orders"
            className="text-xs text-gold hover:underline"
          >
            ← عودة للطلبات
          </Link>
          <h1 className="font-mono text-xl font-bold text-text">{o.order_number}</h1>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-sm ring-1 ${statusStyle(o.status)}`}
        >
          {statusLabel(o.status)}
        </span>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="flex flex-col gap-5 lg:col-span-2">
          <div className="card-premium p-5">
            <h2 className="mb-3 font-bold text-text">العميل والعنوان</h2>
            <div className="grid gap-2 text-sm md:grid-cols-2">
              <div>
                <span className="text-muted">الاسم: </span>
                <span className="text-text">{o.full_name}</span>
              </div>
              <div>
                <span className="text-muted">الهاتف: </span>
                <span className="text-text" dir="ltr">{o.phone}</span>
              </div>
              <div>
                <span className="text-muted">المحافظة: </span>
                <span className="text-text">{o.governorate_name}</span>
              </div>
              <div>
                <span className="text-muted">المدينة: </span>
                <span className="text-text">{o.city_name}</span>
              </div>
              <div className="md:col-span-2">
                <span className="text-muted">العنوان: </span>
                <span className="text-text">
                  {o.area}، {o.address_detail}
                  {o.landmark ? ` (${o.landmark})` : ""}
                </span>
              </div>
              {o.notes && (
                <div className="md:col-span-2">
                  <span className="text-muted">ملاحظات: </span>
                  <span className="text-text">{o.notes}</span>
                </div>
              )}
            </div>
          </div>

          <div className="card-premium p-5">
            <h2 className="mb-3 font-bold text-text">المنتجات ({o.items?.length ?? 0})</h2>
            <div className="flex flex-col divide-y divide-line/60">
              {(o.items ?? []).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-2 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <div className="truncate text-text">{item.product_name}</div>
                    <div className="font-mono text-xs text-muted">
                      {item.sku} · {item.color || "—"}
                    </div>
                  </div>
                  <div className="shrink-0 text-muted">
                    {item.quantity} × {formatEGP(item.unit_price)}
                  </div>
                  <div className="shrink-0 font-semibold text-gold">
                    {formatEGP(item.total)}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex flex-col gap-1 border-t border-line/60 pt-3 text-sm">
              <div className="flex justify-between text-muted">
                <span>المجموع الفرعي</span>
                <span>{formatEGP(o.subtotal ?? 0)}</span>
              </div>
              <div className="flex justify-between text-muted">
                <span>الخصم{o.coupon_code ? ` (${o.coupon_code})` : ""}</span>
                <span>-{formatEGP(o.discount ?? 0)}</span>
              </div>
              <div className="flex justify-between text-muted">
                <span>الشحن</span>
                <span>{formatEGP(o.shipping_fee ?? 0)}</span>
              </div>
              <div className="flex justify-between font-bold text-gold">
                <span>الإجمالي</span>
                <span>{formatEGP(o.total)}</span>
              </div>
            </div>
          </div>

          <div className="card-premium p-5">
            <h2 className="mb-3 font-bold text-text">سجل الحالة</h2>
            <div className="flex flex-col gap-3">
              {(o.status_history ?? []).map((h, i) => (
                <div key={i} className="flex items-start gap-3 text-sm">
                  <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gold" />
                  <div>
                    <div className="text-text">
                      {h.prev_status ? statusLabel(h.prev_status) : "—"} →{" "}
                      {statusLabel(h.new_status)}
                    </div>
                    {h.reason && <div className="text-muted">{h.reason}</div>}
                    <div className="text-xs text-muted">{formatDate(h.created_at)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <div className="card-premium p-5">
            <h2 className="mb-3 font-bold text-text">الدفع</h2>
            <div className="flex flex-col gap-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted">الطريقة</span>
                <span>{o.payment_method === "COD" ? "الدفع عند الاستلام" : "فودافون كاش"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">الحالة</span>
                <span>{o.payment?.status ?? "—"}</span>
              </div>
              {o.payment?.verified_by_email && (
                <div className="flex justify-between">
                  <span className="text-muted">تمت المراجعة بواسطة</span>
                  <span>{o.payment.verified_by_email}</span>
                </div>
              )}
              {o.payment?.rejection_reason && (
                <div className="mt-1 rounded-lg bg-danger/10 p-2 text-xs text-danger">
                  سبب الرفض: {o.payment.rejection_reason}
                </div>
              )}
            </div>
          </div>

          {(o.proofs ?? []).length > 0 && (
            <div className="card-premium p-5">
              <h2 className="mb-3 font-bold text-text">إثباتات الدفع</h2>
              <div className="flex flex-col gap-3">
                {(o.proofs ?? []).map((p) => (
                  <div key={p.id} className="rounded-lg bg-bg-raised/50 p-3 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted">المرسل</span>
                      <span dir="ltr">{p.sender_number}</span>
                    </div>
                    {p.reference && (
                      <div className="mt-1 flex justify-between">
                        <span className="text-muted">المرجع</span>
                        <span>{p.reference}</span>
                      </div>
                    )}
                    {p.note && <div className="mt-1 text-muted">{p.note}</div>}
                    <div className="mt-1 text-muted">{formatDate(p.submitted_at)}</div>
                    {p.image_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.image_url}
                        alt="إثبات دفع"
                        className="mt-2 max-h-48 w-full rounded-lg object-contain ring-1 ring-line"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {showPaymentReview && (
            <div className="card-premium p-5 ring-1 ring-gold/30">
              <h2 className="mb-3 font-bold text-gold">مراجعة الدفع</h2>
              <input
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="سبب الرفض (إن وجد)"
                className="mb-3 w-full rounded-lg border border-line bg-bg-card px-3 py-2 text-sm text-text outline-none placeholder:text-muted/60 focus:border-gold/50"
              />
              <div className="flex gap-2">
                <button
                  disabled={busy}
                  onClick={() => reviewPayment("accept")}
                  className="flex-1 rounded-lg bg-success px-4 py-2 text-sm font-bold text-bg-base transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  قبول الدفع
                </button>
                <button
                  disabled={busy}
                  onClick={() => reviewPayment("reject")}
                  className="flex-1 rounded-lg bg-danger px-4 py-2 text-sm font-bold text-text transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  رفض الدفع
                </button>
              </div>
            </div>
          )}

          <div className="card-premium p-5">
            <h2 className="mb-3 font-bold text-text">إجراءات الحالة</h2>
            {data.allowed_statuses.length === 0 ? (
              <p className="text-sm text-muted">لا إجراءات متاحة لهذه الحالة</p>
            ) : (
              <div className="flex flex-col gap-2">
                {data.allowed_statuses.map((st) => (
                  <button
                    key={st}
                    disabled={busy}
                    onClick={() => act(st)}
                    className={`rounded-lg px-4 py-2 text-sm font-bold transition-opacity disabled:opacity-50 ${
                      st === "Cancelled"
                        ? "bg-danger/15 text-danger ring-1 ring-danger/30"
                        : "bg-gold text-bg-base hover:opacity-90"
                    }`}
                  >
                    {TRANSITION_LABELS[st] ?? st}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}