"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  type AdminProduct,
  type Paginated,
  fetchPage,
  formatEGP,
} from "@/lib/admin";

const STATUS_LABELS: Record<string, string> = {
  draft: "مسودة",
  active: "نشط",
  archived: "مؤرشف",
};

export default function AdminProductsPage() {
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<AdminProduct> | null>(null);

  useEffect(() => {
    fetchPage<AdminProduct>("/api/admin/products/", { status, q: search, page })
      .then(setData)
      .catch(() => setData(null));
  }, [status, search, page]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text">المنتجات</h1>
          <p className="text-sm text-muted">إدارة المنتجات والمخزون</p>
        </div>
        <Link
          href="/admin/products/new"
          className="rounded-lg bg-gold px-4 py-2 text-sm font-bold text-bg-base transition-opacity hover:opacity-90"
        >
          + منتج جديد
        </Link>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="flex flex-wrap gap-1.5">
          {["", "draft", "active", "archived"].map((st) => (
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
              {st === "" ? "الكل" : STATUS_LABELS[st]}
            </button>
          ))}
        </div>
        <div className="flex gap-2 md:mr-auto">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (setPage(1), setSearch(q.trim()))}
            placeholder="بحث بالاسم أو slug"
            className="w-full rounded-lg border border-line bg-bg-card px-3 py-2 text-sm text-text outline-none placeholder:text-muted/60 focus:border-gold/50 md:w-64"
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
      </div>

      <div className="card-premium overflow-x-auto p-2">
        {!data ? (
          <p className="p-4 text-sm text-muted">جارٍ التحميل...</p>
        ) : data.results.length === 0 ? (
          <p className="p-4 text-sm text-muted">لا توجد منتجات مطابقة</p>
        ) : (
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-line/60 text-right text-xs text-muted">
                <th className="px-3 py-2 font-medium">المنتج</th>
                <th className="px-3 py-2 font-medium">العلامة</th>
                <th className="px-3 py-2 font-medium">التصنيف</th>
                <th className="px-3 py-2 font-medium">الحالة</th>
                <th className="px-3 py-2 font-medium">السعر</th>
                <th className="px-3 py-2 font-medium">المخزون</th>
              </tr>
            </thead>
            <tbody>
              {data.results.map((p) => (
                <tr key={p.id} className="border-b border-line/40 last:border-0">
                  <td className="px-3 py-2">
                    <Link
                      href={`/admin/products/${p.id}`}
                      className="font-medium text-text hover:text-gold"
                    >
                      {p.name_ar}
                    </Link>
                    <div className="font-mono text-xs text-muted">{p.slug}</div>
                  </td>
                  <td className="px-3 py-2 text-muted">{p.brand_name}</td>
                  <td className="px-3 py-2 text-muted">{p.category_name}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ring-1 ${
                        p.status === "active"
                          ? "bg-success/10 text-success ring-success/30"
                          : p.status === "draft"
                            ? "bg-warning/10 text-warning ring-warning/30"
                            : "bg-bg-raised text-muted ring-line"
                      }`}
                    >
                      {STATUS_LABELS[p.status]}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-semibold text-gold">
                    {formatEGP(p.min_price)}
                  </td>
                  <td className="px-3 py-2 text-muted">{p.total_stock}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {data && data.count > 0 && (
        <div className="flex items-center justify-between text-sm text-muted">
          <span>إجمالي {data.count} منتج</span>
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