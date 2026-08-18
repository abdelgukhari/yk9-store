"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { useApp } from "@/lib/app-context";
import PaymentProofForm from "@/components/PaymentProofForm";
import type { Address, GovernorateRate, Totals } from "@/lib/types";
import { CheckIcon } from "@/components/icons";

function formatEGP(value: string | number) {
  return `${Number(value).toLocaleString("ar-EG")} ج.م`;
}

type CheckoutResult = {
  order_number: string;
  status: string;
  total: number;
  payment_method: string;
  estimated_delivery_days: number;
};

export default function CheckoutPage() {
  const { cart, cartCount, user, showToast, clearCart } = useApp();
  const [governorates, setGovernorates] = useState<GovernorateRate[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [payment, setPayment] = useState<"COD" | "VODAFONE_CASH">("COD");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<CheckoutResult | null>(null);

  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    whatsapp: "",
    governorate_id: "",
    city_name: "",
    area: "",
    detail: "",
    landmark: "",
    notes: "",
  });

  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  useEffect(() => {
    api<GovernorateRate[]>("/api/shipping/governorates/").then(setGovernorates).catch(() => {});
    if (user) {
      api<Address[]>("/api/addresses/", { auth: true }).then(setAddresses).catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    if (!form.governorate_id) return;
    api<Totals>("/api/cart/totals/", {
      method: "POST",
      body: JSON.stringify({ governorate_id: form.governorate_id, coupon_code: couponCode }),
      guest: true,
      auth: true,
    })
      .then(setTotals)
      .catch(() => setTotals(null));
  }, [form.governorate_id, couponCode]);

  const applyAddress = (a: Address) => {
    setForm({
      full_name: a.full_name,
      phone: a.phone,
      whatsapp: a.whatsapp,
      governorate_id: String(a.governorate),
      city_name: a.city_name,
      area: a.area,
      detail: a.detail,
      landmark: a.landmark,
      notes: a.notes,
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cart || cart.items.length === 0) {
      showToast("السلة فارغة");
      return;
    }
    setBusy(true);
    try {
      const res = await api<CheckoutResult>("/api/checkout/", {
        method: "POST",
        body: JSON.stringify({ ...form, payment_method: payment, coupon_code: couponCode }),
        guest: true,
        auth: true,
      });
      setResult(res);
      await clearCart();
    } catch (err) {
      const msg = err instanceof ApiError ? err.detail : "حدث خطأ في إتمام الطلب";
      showToast(msg);
    } finally {
      setBusy(false);
    }
  };

  if (result) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/15">
          <CheckIcon className="h-8 w-8 text-success" />
        </div>
        <h1 className="mt-6 text-3xl font-extrabold">تم استلام طلبك بنجاح!</h1>
        <p className="mt-3 text-muted">
          رقم الطلب: <span className="font-bold text-gold">{result.order_number}</span>
        </p>
        <p className="mt-1 text-muted">
          الإجمالي: {formatEGP(result.total)} — التوصيل خلال {result.estimated_delivery_days} يوم عمل
        </p>
        {result.payment_method === "VODAFONE_CASH" && (
          <div className="card-premium mt-8 p-5 text-right">
            <h2 className="mb-2 font-bold">الدفع عبر فودافون كاش</h2>
            <ol className="mb-5 list-decimal space-y-1 pr-5 text-sm text-muted">
              <li>حوّل المبلغ {formatEGP(result.total)} على رقم 01037839725</li>
              <li>صوّر إثبات التحويل ثم حمّله هنا مباشرة</li>
              <li>بديلًا يمكنك إرسال الصورة على واتساب مع رقم الطلب {result.order_number}</li>
            </ol>
            <PaymentProofForm orderNumber={result.order_number} phone={form.phone} />
            <a
              href="/track"
              className="mt-4 inline-block rounded-xl bg-gold px-6 py-3 font-bold text-black hover:bg-gold-light"
            >
              متابعة حالة الطلب
            </a>
          </div>
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href="/track"
            className="rounded-xl bg-gold px-6 py-3 font-bold text-black hover:bg-gold-light"
          >
            تتبع طلبك
          </Link>
          <Link href="/products" className="rounded-xl border border-line px-6 py-3 font-bold hover:border-gold hover:text-gold">
            متابعة التسوق
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-extrabold">إتمام الطلب</h1>

      {(!cart || cart.items.length === 0) && !result && (
        <div className="card-premium py-16 text-center">
          <p className="text-muted">السلة فارغة.</p>
          <Link href="/products" className="mt-4 inline-block rounded-xl bg-gold px-6 py-3 font-bold text-black">
            تصفح المنتجات
          </Link>
        </div>
      )}

      {cart && cart.items.length > 0 && (
        <form onSubmit={submit} className="grid gap-8 lg:grid-cols-[1fr_380px]">
          <div className="space-y-6">
            {user && addresses.length > 0 && (
              <div className="card-premium p-5">
                <h2 className="mb-3 font-bold">عنوان محفوظ</h2>
                <div className="flex flex-wrap gap-2">
                  {addresses.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => applyAddress(a)}
                      className="rounded-lg border border-line px-3 py-2 text-sm text-muted hover:border-gold hover:text-gold"
                    >
                      {a.governorate_name} — {a.detail}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="card-premium space-y-4 p-5">
              <h2 className="font-bold">بيانات التوصيل</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs text-muted">الاسم بالكامل *</label>
                  <input
                    required
                    value={form.full_name}
                    onChange={(e) => set("full_name", e.target.value)}
                    className="w-full rounded-lg border border-line bg-bg-card px-3 py-2 text-sm outline-none focus:border-gold"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted">رقم الموبايل * (01XXXXXXXXX)</label>
                  <input
                    required
                    pattern="01[0-9]{9}"
                    title="رقم مصري صحيح مثل 01012345678"
                    value={form.phone}
                    onChange={(e) => set("phone", e.target.value)}
                    className="w-full rounded-lg border border-line bg-bg-card px-3 py-2 text-sm outline-none focus:border-gold"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted">واتساب (اختياري)</label>
                  <input
                    pattern="01[0-9]{9}"
                    value={form.whatsapp}
                    onChange={(e) => set("whatsapp", e.target.value)}
                    className="w-full rounded-lg border border-line bg-bg-card px-3 py-2 text-sm outline-none focus:border-gold"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted">المحافظة *</label>
                  <select
                    required
                    value={form.governorate_id}
                    onChange={(e) => set("governorate_id", e.target.value)}
                    className="w-full rounded-lg border border-line bg-bg-card px-3 py-2 text-sm outline-none focus:border-gold"
                  >
                    <option value="">اختر</option>
                    {governorates.map((g) => (
                      <option key={g.id} value={g.governorate}>
                        {g.governorate_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted">المدينة / المنطقة</label>
                  <input
                    value={form.city_name}
                    onChange={(e) => set("city_name", e.target.value)}
                    className="w-full rounded-lg border border-line bg-bg-card px-3 py-2 text-sm outline-none focus:border-gold"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted">العنوان التفصيلي *</label>
                  <input
                    required
                    value={form.detail}
                    onChange={(e) => set("detail", e.target.value)}
                    placeholder="اسم الشارع، رقم العقار..."
                    className="w-full rounded-lg border border-line bg-bg-card px-3 py-2 text-sm outline-none focus:border-gold"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted">علامة مميزة</label>
                  <input
                    value={form.landmark}
                    onChange={(e) => set("landmark", e.target.value)}
                    className="w-full rounded-lg border border-line bg-bg-card px-3 py-2 text-sm outline-none focus:border-gold"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs text-muted">ملاحظات</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => set("notes", e.target.value)}
                    rows={2}
                    className="w-full rounded-lg border border-line bg-bg-card px-3 py-2 text-sm outline-none focus:border-gold"
                  />
                </div>
              </div>
            </div>

            <div className="card-premium p-5">
              <h2 className="mb-3 font-bold">طريقة الدفع</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setPayment("COD")}
                  className={`rounded-xl border p-4 text-right transition ${
                    payment === "COD" ? "border-gold bg-gold/5" : "border-line hover:border-gold/50"
                  }`}
                >
                  <div className="font-bold">الدفع عند الاستلام (COD)</div>
                  <div className="mt-1 text-xs text-muted">ادفع كاش عند وصول الشحنة</div>
                </button>
                <button
                  type="button"
                  onClick={() => setPayment("VODAFONE_CASH")}
                  className={`rounded-xl border p-4 text-right transition ${
                    payment === "VODAFONE_CASH" ? "border-gold bg-gold/5" : "border-line hover:border-gold/50"
                  }`}
                >
                  <div className="font-bold">فودافون كاش</div>
                  <div className="mt-1 text-xs text-muted">تحويل فوري مع إرسال الإثبات واتساب</div>
                </button>
              </div>
            </div>
          </div>

          <div className="card-premium h-fit p-5">
            <h2 className="mb-3 font-bold">ملخص الطلب ({cartCount})</h2>
            <div className="space-y-2 border-b border-line pb-3 text-sm">
              {cart.items.slice(0, 4).map((i) => (
                <div key={i.id} className="flex justify-between gap-2">
                  <span className="truncate text-muted">{i.product_name} × {i.quantity}</span>
                  <span>{formatEGP(i.line_total)}</span>
                </div>
              ))}
              {cart.items.length > 4 && (
                <div className="text-xs text-muted">+ {cart.items.length - 4} منتجات أخرى</div>
              )}
            </div>

            <div className="mt-3 mb-3 flex gap-2">
              <input
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                placeholder="كود الخصم"
                className="w-full rounded-lg border border-line bg-bg-card px-3 py-2 text-sm uppercase outline-none focus:border-gold"
              />
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-muted">
                <span>الإجمالي الفرعي</span>
                <span>{formatEGP(cart.subtotal)}</span>
              </div>
              {totals && (
                <>
                  <div className="flex justify-between text-muted">
                    <span>الخصم</span>
                    <span className="text-danger">− {formatEGP(totals.discount)}</span>
                  </div>
                  <div className="flex justify-between text-muted">
                    <span>الشحن</span>
                    <span>{totals.shipping_fee > 0 ? formatEGP(totals.shipping_fee) : "مجاني"}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between border-t border-line pt-2 text-lg font-extrabold">
                <span>الإجمالي</span>
                <span className="text-gold">{totals ? formatEGP(totals.total) : formatEGP(cart.subtotal)}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={busy || !totals}
              className="mt-4 w-full rounded-xl bg-gold py-3 font-bold text-black transition hover:bg-gold-light disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? "جارٍ إتمام الطلب..." : totals ? "تأكيد الطلب" : "اختر المحافظة أولًا"}
            </button>
            <p className="mt-3 text-center text-[11px] text-muted">
              بالضغط على تأكيد الطلب أنت توافق على شروط الاستخدام وسياسة الاسترجاع.
            </p>
          </div>
        </form>
      )}
    </div>
  );
}

