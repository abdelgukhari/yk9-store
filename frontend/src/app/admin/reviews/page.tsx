"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useApp } from "@/lib/app-context";
import { type AdminReview, type Paginated, fetchPage, formatDate } from "@/lib/admin";

export default function AdminReviewsPage() {
  const { showToast } = useApp();
  const [filter, setFilter] = useState("pending");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<AdminReview> | null>(null);

  const load = useCallback(() => {
    fetchPage<AdminReview>("/api/admin/reviews/", { status: filter, page })
      .then(setData)
      .catch(() => setData(null));
  }, [filter, page]);

  useEffect(() => {
    load();
  }, [load]);

  const moderate = async (r: AdminReview, approve: boolean) => {
    try {
      await api(`/api/admin/reviews/${r.id}/moderate/`, {
        method: "POST",
        body: JSON.stringify({ approve }),
        auth: true,
      });
      showToast(approve ? "تمت الموافقة" : "تم الرفض");
      load();
    } catch {
      showToast("خطأ");
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold text-text">المراجعات</h1>
        <p className="text-sm text-muted">الموافقة على مراجعات العملاء</p>
      </div>

      <div className="flex gap-1.5">
        {[
          { key: "pending", label: "بانتظار الموافقة" },
          { key: "approved", label: "مقبولة" },
          { key: "", label: "الكل" },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => {
              setFilter(f.key);
              setPage(1);
            }}
            className={`rounded-full px-3 py-1 text-xs ring-1 ${
              filter === f.key
                ? "bg-gold/15 text-gold ring-gold/30"
                : "bg-bg-raised text-muted ring-line"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {!data ? (
          <p className="text-sm text-muted">جارٍ التحميل...</p>
        ) : data.results.length === 0 ? (
          <p className="text-sm text-muted">لا توجد مراجعات</p>
        ) : (
          data.results.map((r) => (
            <div key={r.id} className="card-premium p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm">
                  <Link
                    href={`/admin/products/${r.product}`}
                    className="font-semibold text-gold hover:underline"
                  >
                    {r.product_name}
                  </Link>
                  <span className="text-warning">{"★".repeat(r.rating)}</span>
                  <span className="text-muted">
                    {(r.user_email ?? r.guest_name) || "ضيف"}
                  </span>
                </div>
                <span className="text-xs text-muted">{formatDate(r.created_at)}</span>
              </div>
              {r.comment && (
                <p className="mt-2 text-sm text-text">{r.comment}</p>
              )}
              {!r.is_approved && (
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => moderate(r, true)}
                    className="rounded-lg bg-success px-3 py-1.5 text-xs font-bold text-bg-base"
                  >
                    موافقة
                  </button>
                  <button
                    onClick={() => moderate(r, false)}
                    className="rounded-lg bg-danger/15 px-3 py-1.5 text-xs font-bold text-danger ring-1 ring-danger/30"
                  >
                    رفض
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {data && data.count > 0 && (
        <div className="flex items-center justify-between text-sm text-muted">
          <span>إجمالي {data.count} مراجعة</span>
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