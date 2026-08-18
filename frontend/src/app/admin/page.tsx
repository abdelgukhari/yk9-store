"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import {
  type AdminDashboard,
  type AdminOrder,
  formatEGP,
  statusLabel,
  statusStyle,
} from "@/lib/admin";

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className={`card-premium p-4 ${accent ? "ring-1 ring-gold/30" : ""}`}>
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-1 text-2xl font-bold text-text">{value}</div>
      {sub ? <div className="mt-1 text-xs text-gold">{sub}</div> : null}
    </div>
  );
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<AdminDashboard>("/api/admin/dashboard/", { auth: true })
      .then(setData)
      .catch(() => setError("تعذر تحميل البيانات"));
  }, []);

  if (error) return <p className="text-danger">{error}</p>;
  if (!data) return <p className="text-muted">جارٍ التحميل...</p>;

  const s = data.stats;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-text">نظرة عامة</h1>
        <p className="text-sm text-muted">ملخص أداء المتجر اليوم</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="طلبات اليوم" value={String(s.orders_today)} accent />
        <StatCard label="إجمالي الطلبات" value={String(s.orders_total)} />
        <StatCard label="إيرادات اليوم" value={formatEGP(s.revenue_today)} />
        <StatCard label="إجمالي الإيرادات" value={formatEGP(s.revenue_total)} />
        <StatCard
          label="بانتظار التأكيد"
          value={String(s.awaiting_confirmation)}
          accent
        />
        <StatCard
          label="بانتظار مراجعة الدفع"
          value={String(s.payment_verification_pending)}
          accent
        />
        <StatCard label="قيد التجهيز" value={String(s.processing)} />
        <StatCard
          label="منتجات منخفضة المخزون"
          value={String(s.low_stock_count)}
          accent
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card-premium p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold text-text">أحدث الطلبات</h2>
            <Link href="/admin/orders" className="text-xs text-gold hover:underline">
              عرض الكل
            </Link>
          </div>
          <div className="flex flex-col divide-y divide-line/60">
            {data.recent_orders.length === 0 && (
              <p className="py-4 text-sm text-muted">لا توجد طلبات بعد</p>
            )}
            {data.recent_orders.map((o: AdminOrder) => (
              <Link
                key={o.order_number}
                href={`/admin/orders/${o.order_number}`}
                className="flex items-center justify-between gap-2 py-2.5 text-sm hover:bg-bg-raised/50"
              >
                <div className="min-w-0">
                  <div className="font-mono text-xs text-gold">{o.order_number}</div>
                  <div className="truncate text-muted">
                    {o.full_name} · {formatEGP(o.total)}
                  </div>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs ring-1 ${statusStyle(o.status)}`}
                >
                  {statusLabel(o.status)}
                </span>
              </Link>
            ))}
          </div>
        </div>

        <div className="card-premium p-5">
          <h2 className="mb-3 font-bold text-text">منتجات منخفضة المخزون</h2>
          <div className="flex flex-col gap-2">
            {data.low_stock.length === 0 && (
              <p className="py-2 text-sm text-muted">كل المنتجات بمخزون جيد</p>
            )}
            {data.low_stock.map((item) => (
              <div
                key={item.variant_id}
                className="flex items-center justify-between rounded-lg bg-bg-raised/50 px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <div className="truncate text-text">{item.product_name}</div>
                  <div className="font-mono text-xs text-muted">{item.sku}</div>
                </div>
                <span className="shrink-0 text-xs text-warning">
                  متاح {item.available} (حد {item.threshold})
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card-premium p-5">
        <h2 className="mb-3 font-bold text-text">الأكثر مبيعاً (30 يوم)</h2>
        <div className="flex flex-col divide-y divide-line/60">
          {data.top_products.length === 0 && (
            <p className="py-2 text-sm text-muted">لا توجد مبيعات مسجلة</p>
          )}
          {data.top_products.map((p, i) => (
            <div
              key={i}
              className="flex items-center justify-between py-2 text-sm"
            >
              <div className="min-w-0 truncate text-text">{p.product_name}</div>
              <div className="shrink-0 text-muted">
                {p.quantity} قطعة · {formatEGP(p.revenue)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
