"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useApp } from "@/lib/app-context";
import type { Order } from "@/lib/types";

const STATUS_LABELS: Record<string, string> = {
  Pending: "بانتظار المعالجة",
  AwaitingConfirmation: "بانتظار التأكيد",
  PaymentVerificationPending: "بانتظار التحقق من الدفع",
  PaymentRejected: "رفض الدفع",
  Confirmed: "مؤكد",
  Processing: "قيد التجهيز",
  Shipped: "تم الشحن",
  Delivered: "تم التوصيل",
  Cancelled: "ملغي",
  Returned: "مرتجع",
  Refunded: "مسترد",
};

function formatEGP(value: string | number) {
  return `${Number(value).toLocaleString("ar-EG")} ج.م`;
}

export default function AccountPage() {
  const { user, loading, logout } = useApp();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    api<Order[]>("/api/orders/mine/", { auth: true })
      .then(setOrders)
      .catch(() => {})
      .finally(() => setOrdersLoading(false));
  }, [user]);

  if (loading || !user) return null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="card-premium p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold">
              أهلًا، {user.first_name} {user.last_name}
            </h1>
            <p className="mt-1 text-sm text-muted">{user.email}</p>
          </div>
          <button
            onClick={() => {
              logout();
              router.push("/");
            }}
            className="rounded-lg border border-line px-4 py-2 text-sm text-danger transition hover:border-danger"
          >
            تسجيل الخروج
          </button>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/cart" className="rounded-lg border border-line px-4 py-2 text-sm text-muted hover:text-gold">سلة المشتريات</Link>
        <Link href="/wishlist" className="rounded-lg border border-line px-4 py-2 text-sm text-muted hover:text-gold">المفضلة</Link>
        <Link href="/track" className="rounded-lg border border-line px-4 py-2 text-sm text-muted hover:text-gold">تتبع طلب</Link>
      </div>

      <h2 className="mt-10 mb-4 text-xl font-extrabold">طلباتي</h2>
      {ordersLoading ? (
        <div className="card-premium h-40 animate-pulse" />
      ) : orders.length === 0 ? (
        <div className="card-premium py-12 text-center text-muted">
          <p>لا توجد طلبات بعد.</p>
          <Link href="/products" className="mt-3 inline-block rounded-xl bg-gold px-5 py-2.5 text-sm font-bold text-black">
            ابدأ التسوق
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <div key={o.order_number} className="card-premium p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-bold text-gold">{o.order_number}</div>
                  <div className="text-xs text-muted">
                    {new Date(o.created_at).toLocaleString("ar-EG")}
                  </div>
                </div>
                <span className="rounded-full bg-gold/15 px-3 py-1 text-xs font-bold text-gold">
                  {STATUS_LABELS[o.status] ?? o.status}
                </span>
                <span className="font-extrabold">{formatEGP(o.total)}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {o.items.map((it, i) => (
                  <span key={i} className="rounded-lg bg-bg-raised px-3 py-1 text-xs text-muted">
                    {it.product_name} × {it.quantity}
                  </span>
                ))}
              </div>
              <a
                href={`/track?order=${o.order_number}`}
                onClick={(e) => {
                  e.preventDefault();
                  router.push(`/track?order=${o.order_number}`);
                }}
                className="mt-3 inline-block text-sm text-gold hover:underline"
              >
                عرض الحالة
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
