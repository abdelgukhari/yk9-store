"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import {
  type AdminOrder,
  type AdminOrderStatuses,
  type Paginated,
  fetchPage,
  formatEGP,
  formatDate,
  statusLabel,
  statusStyle,
} from "@/lib/admin";

const QUICK = [
  "",
  "AwaitingConfirmation",
  "PaymentVerificationPending",
  "PaymentRejected",
  "Confirmed",
  "Processing",
  "Shipped",
  "Delivered",
  "Cancelled",
];

export default function AdminOrdersPage() {
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<AdminOrder> | null>(null);
  const [statuses, setStatuses] = useState<string[]>([]);

  useEffect(() => {
    api<AdminOrderStatuses>("/api/admin/orders/statuses/", { auth: true })
      .then((s) => setStatuses(s.statuses))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchPage<AdminOrder>("/api/admin/orders/", {
      status,
      q: search,
      page,
    })
      .then(setData)
      .catch(() => setData(null));
  }, [status, search, page]);

  const applySearch = useCallback(() => {
    setPage(1);
    setSearch(q.trim());
  }, [q]);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold text-text">الطلبات</h1>
        <p className="text-sm text-muted">
          إدارة حالات الطلبات ومراجعة المدفوعات
        </p>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => {
              setStatus("");
              setPage(1);
            }}
            className={`rounded-full px-3 py-1 text-xs ring-1 transition-colors ${
              status === ""
                ? "bg-gold/15 text-gold ring-gold/30"
                : "bg-bg-raised text-muted ring-line hover:text-text"
            }`}
          >
            الكل
          </button>
          {QUICK.slice(1).map((st) => (
            <button
              key={st}
              onClick={() => {
                setStatus(st);
                setPage(1);
              }}
              className={`rounded-full px-3 py-1 text-xs ring-1 transition-colors ${
                status === st
                  ? "bg-gold/15 text-gold ring-gold/30"
                  : "bg-bg-raised text-muted ring-line hover:text-text"
              }`}
            >
              {statusLabel(st)}
            </button>
          ))}
        </div>
        <div className="flex gap-2 md:mr-auto">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applySearch()}
            placeholder="رقم الطلب، الاسم، الهاتف، البريد"
            className="w-full rounded-lg border border-line bg-bg-card px-3 py-2 text-sm text-text outline-none placeholder:text-muted/60 focus:border-gold/50 md:w-64"
          />
          <button
            onClick={applySearch}
            className="rounded-lg bg-gold px-4 py-2 text-sm font-bold text-bg-base transition-opacity hover:opacity-90"
          >
            بحث
          </button>
        </div>
      </div>

      <div className="card-premium overflow-x-auto p-2">
        {!data ? (
          <p className="p-4 text-sm text-muted">جارٍ التحميل...</p>
        ) : data.results.length === 0 ? (
          <p className="p-4 text-sm text-muted">لا توجد طلبات مطابقة</p>
        ) : (
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-line/60 text-right text-xs text-muted">
                <th className="px-3 py-2 font-medium">الطلب</th>
                <th className="px-3 py-2 font-medium">العميل</th>
                <th className="px-3 py-2 font-medium">الحالة</th>
                <th className="px-3 py-2 font-medium">الدفع</th>
                <th className="px-3 py-2 font-medium">الإجمالي</th>
                <th className="px-3 py-2 font-medium">التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {data.results.map((o) => (
                <tr key={o.order_number} className="border-b border-line/40 last:border-0">
                  <td className="px-3 py-2">
                    <Link
                      href={`/admin/orders/${o.order_number}`}
                      className="font-mono text-xs text-gold hover:underline"
                    >
                      {o.order_number}
                    </Link>
                    <div className="text-xs text-muted">{o.item_count} عنصر</div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="text-text">{o.full_name}</div>
                    <div className="text-xs text-muted" dir="ltr">
                      {o.phone}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ring-1 ${statusStyle(o.status)}`}
                    >
                      {statusLabel(o.status)}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs">
                    <div>{o.payment_method === "COD" ? "الدفع عند الاستلام" : "فودافون كاش"}</div>
                    <div className="text-muted">{o.payment_status ?? "—"}</div>
                  </td>
                  <td className="px-3 py-2 font-semibold text-gold">
                    {formatEGP(o.total)}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted">
                    {formatDate(o.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {data && data.count > 0 && (
        <div className="flex items-center justify-between text-sm text-muted">
          <span>
            إجمالي {data.count} طلب
          </span>
          <div className="flex gap-2">
            <button
              disabled={!data.previous}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-lg bg-bg-raised px-3 py-1.5 ring-1 ring-line disabled:opacity-40"
            >
              السابق
            </button>
            <button
              disabled={!data.next}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg bg-bg-raised px-3 py-1.5 ring-1 ring-line disabled:opacity-40"
            >
              التالي
            </button>
          </div>
        </div>
      )}

      <details className="rounded-xl border border-line bg-bg-card p-4">
        <summary className="cursor-pointer text-sm font-semibold text-muted">
          كل الحالات
        </summary>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {statuses.map((st) => (
            <button
              key={st}
              onClick={() => {
                setStatus(st);
                setPage(1);
              }}
              className={`rounded-full px-3 py-1 text-xs ring-1 ${
                status === st
                  ? "bg-gold/15 text-gold ring-gold/30"
                  : "bg-bg-raised text-muted ring-line"
              }`}
            >
              {statusLabel(st)}
            </button>
          ))}
        </div>
      </details>
    </div>
  );
}