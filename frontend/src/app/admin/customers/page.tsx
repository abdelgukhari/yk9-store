"use client";

import { useEffect, useState } from "react";
import { type AdminCustomer, type Paginated, fetchPage, formatDate, formatEGP } from "@/lib/admin";

const ROLE_LABELS: Record<string, string> = {
  owner: "المالك",
  admin: "مدير",
  customer_support: "دعم العملاء",
  inventory_manager: "مخزون",
  payment_reviewer: "مراجعة الدفع",
  content_manager: "محتوى",
  customer: "عميل",
};

export default function AdminCustomersPage() {
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<AdminCustomer> | null>(null);

  useEffect(() => {
    fetchPage<AdminCustomer>("/api/admin/customers/", { q: search, page })
      .then(setData)
      .catch(() => setData(null));
  }, [search, page]);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold text-text">العملاء</h1>
        <p className="text-sm text-muted">قائمة عملاء المتجر</p>
      </div>

      <div className="flex gap-2 md:max-w-sm">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (setPage(1), setSearch(q.trim()))}
          placeholder="بحث بالبريد أو الاسم"
          className="w-full rounded-lg border border-line bg-bg-card px-3 py-2 text-sm text-text outline-none placeholder:text-muted/60 focus:border-gold/50"
        />
        <button
          onClick={() => {
            setPage(1);
            setSearch(q.trim());
          }}
          className="rounded-lg bg-gold px-4 py-2 text-sm font-bold text-bg-base"
        >
          بحث
        </button>
      </div>

      <div className="card-premium overflow-x-auto p-2">
        {!data ? (
          <p className="p-4 text-sm text-muted">جارٍ التحميل...</p>
        ) : data.results.length === 0 ? (
          <p className="p-4 text-sm text-muted">لا يوجد عملاء</p>
        ) : (
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-line/60 text-right text-xs text-muted">
                <th className="px-3 py-2 font-medium">العميل</th>
                <th className="px-3 py-2 font-medium">الدور</th>
                <th className="px-3 py-2 font-medium">الطلبات</th>
                <th className="px-3 py-2 font-medium">الإجمالي</th>
                <th className="px-3 py-2 font-medium">التسجيل</th>
              </tr>
            </thead>
            <tbody>
              {data.results.map((c) => (
                <tr key={c.id} className="border-b border-line/40 last:border-0">
                  <td className="px-3 py-2">
                    <div className="text-text">
                      {c.first_name} {c.last_name}
                    </div>
                    <div className="text-xs text-muted" dir="ltr">
                      {c.email}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ring-1 ${
                        c.is_staff
                          ? "bg-gold/10 text-gold ring-gold/30"
                          : "bg-bg-raised text-muted ring-line"
                      }`}
                    >
                      {ROLE_LABELS[c.role] ?? c.role}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-muted">{c.orders_count}</td>
                  <td className="px-3 py-2 font-semibold text-gold">
                    {formatEGP(c.total_spent)}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted">{formatDate(c.date_joined)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {data && data.count > 0 && (
        <div className="flex items-center justify-between text-sm text-muted">
          <span>إجمالي {data.count} عميل</span>
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
    </div>
  );
}