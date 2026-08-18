"use client";

import Link from "next/link";
import { api } from "@/lib/api";
import { useApp } from "@/lib/app-context";
import type { GovernorateRate, Totals } from "@/lib/types";
import ProductImage from "@/components/ProductImage";
import { useEffect, useState } from "react";

function formatEGP(value: string | number) {
  return `${Number(value).toLocaleString("ar-EG")} ج.م`;
}

export default function CartPage() {
  const { cart, cartCount, updateCartItem, removeCartItem, showToast } = useApp();
  const [totals, setTotals] = useState<Totals | null>(null);
  const [governorateId, setGovernorateId] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [governorates, setGovernorates] = useState<GovernorateRate[]>([]);

  useEffect(() => {
    api<GovernorateRate[]>("/api/shipping/governorates/")
      .then(setGovernorates)
      .catch(() => {});
  }, []);

  const calculate = async (govId: string, coupon = couponCode) => {
    if (!govId) return;
    try {
      const t = await api<Totals>("/api/cart/totals/", {
        method: "POST",
        body: JSON.stringify({ governorate_id: govId, coupon_code: coupon }),
        guest: true,
        auth: true,
      });
      setTotals(t);
      setGovernorateId(govId);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "تعذر حساب الشحن");
    }
  };

  if (!cart || cart.items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <div className="text-6xl">🛒</div>
        <h1 className="mt-4 text-2xl font-extrabold">سلة فارغة</h1>
        <p className="mt-2 text-muted">لم تضف أي منتجات بعد.</p>
        <Link
          href="/products"
          className="mt-6 inline-block rounded-xl bg-gold px-6 py-3 font-bold text-black hover:bg-gold-light"
        >
          تصفح المنتجات
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-extrabold">سلة المشتريات ({cartCount} منتج)</h1>

      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="space-y-3">
          {cart.items.map((item) => (
            <div key={item.id} className="card-premium flex gap-4 p-4">
              <div className="h-24 w-24 shrink-0 overflow-hidden rounded-lg">
                <ProductImage imageUrl={item.image_url} alt={item.product_name} />
              </div>
              <div className="flex flex-1 flex-col">
                <Link href={`/products/${item.product_slug}`} className="font-bold hover:text-gold">
                  {item.product_name}
                </Link>
                <div className="text-sm text-muted">
                  {item.color} • {formatEGP(item.price)}
                </div>
                <div className="mt-auto flex items-center justify-between pt-2">
                  <div className="flex items-center rounded-lg border border-line">
                    <button
                      onClick={() => updateCartItem(item.id, Math.max(1, item.quantity - 1))}
                      className="px-3 py-1.5 text-muted hover:text-gold"
                    >
                      −
                    </button>
                    <span className="w-8 text-center text-sm font-bold">{item.quantity}</span>
                    <button
                      onClick={() => updateCartItem(item.id, item.quantity + 1)}
                      className="px-3 py-1.5 text-muted hover:text-gold"
                    >
                      +
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-gold">{formatEGP(item.line_total)}</span>
                    <button
                      onClick={() => removeCartItem(item.id)}
                      className="text-sm text-danger hover:underline"
                    >
                      حذف
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <div className="card-premium p-5">
            <h2 className="mb-3 font-bold">ملخص الطلب</h2>

            <div className="mb-3">
              <label className="mb-1 block text-xs text-muted">المحافظة</label>
              <select
                value={governorateId}
                onChange={(e) => calculate(e.target.value)}
                className="w-full rounded-lg border border-line bg-bg-card px-3 py-2 text-sm outline-none focus:border-gold"
              >
                <option value="">اختر المحافظة</option>
                {governorates.map((g) => (
                  <option key={g.id} value={g.governorate}>
                    {g.governorate_name} ({formatEGP(g.price)})
                  </option>
                ))}
              </select>
              {governorates.length === 0 && (
                <p className="mt-1 text-[11px] text-muted">جارٍ تحميل المحافظات...</p>
              )}
            </div>

            <div className="mb-3 flex gap-2">
              <input
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                placeholder="كود الخصم"
                className="w-full rounded-lg border border-line bg-bg-card px-3 py-2 text-sm uppercase outline-none focus:border-gold"
              />
              <button
                onClick={async () => {
                  try {
                    await api("/api/coupon/", {
                      method: "POST",
                      body: JSON.stringify({ code: couponCode }),
                      guest: true,
                      auth: true,
                    });
                    showToast("تم تطبيق الكوبون");
                    if (governorateId) await calculate(governorateId, couponCode);
                  } catch (e) {
                    showToast(e instanceof Error ? e.message : "كوبون غير صالح");
                  }
                }}
                className="rounded-lg bg-bg-raised px-4 text-sm text-gold ring-1 ring-line hover:ring-gold"
              >
                تطبيق
              </button>
            </div>

            <div className="space-y-2 border-t border-line pt-3 text-sm">
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
                    <span>الشحن ({totals.governorate})</span>
                    <span>{totals.shipping_fee > 0 ? formatEGP(totals.shipping_fee) : "مجاني"}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between border-t border-line pt-2 text-lg font-extrabold">
                <span>الإجمالي</span>
                <span className="text-gold">
                  {totals ? formatEGP(totals.total) : formatEGP(cart.subtotal)}
                </span>
              </div>
            </div>

            <Link
              href="/checkout"
              className="mt-4 block rounded-xl bg-gold py-3 text-center font-bold text-black transition hover:bg-gold-light"
            >
              إتمام الطلب
            </Link>
            <Link
              href="/products"
              className="mt-2 block text-center text-sm text-muted hover:text-gold"
            >
              متابعة التسوق
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
