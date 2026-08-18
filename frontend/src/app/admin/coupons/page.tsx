"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useApp } from "@/lib/app-context";
import { type AdminCoupon, type Paginated, fetchPage, formatEGP } from "@/lib/admin";

const EMPTY = {
  code: "",
  type: "percent" as "fixed" | "percent",
  value: "",
  min_subtotal: "0",
  max_discount: "",
  usage_limit: "0",
  is_active: true,
};

export default function AdminCouponsPage() {
  const { showToast } = useApp();
  const [data, setData] = useState<Paginated<AdminCoupon> | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    fetchPage<AdminCoupon>("/api/admin/coupons/").then(setData).catch(() => setData(null));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/api/admin/coupons/", {
        method: "POST",
        body: JSON.stringify({
          code: form.code.trim().toUpperCase(),
          type: form.type,
          value: form.value,
          min_subtotal: form.min_subtotal,
          max_discount: form.max_discount ? form.max_discount : null,
          usage_limit: Number(form.usage_limit),
          is_active: form.is_active,
        }),
        auth: true,
      });
      showToast("تم إنشاء الكوبون");
      setForm(EMPTY);
      load();
    } catch (err) {
      showToast(err instanceof ApiError ? err.detail : "خطأ");
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (c: AdminCoupon) => {
    try {
      await api(`/api/admin/coupons/${c.id}/`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: !c.is_active }),
        auth: true,
      });
      load();
    } catch {
      showToast("خطأ في التحديث");
    }
  };

  const inputCls =
    "rounded-lg border border-line bg-bg-card px-3 py-2 text-sm text-text outline-none placeholder:text-muted/60 focus:border-gold/50";

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold text-text">الكوبونات</h1>
        <p className="text-sm text-muted">إنشاء وإدارة أكواد الخصم</p>
      </div>

      <form onSubmit={create} className="card-premium flex flex-wrap items-end gap-3 p-5">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted">الكود</label>
          <input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="SAVE10" className={inputCls + " w-36"} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted">النوع</label>
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as "fixed" | "percent" })} className={inputCls}>
            <option value="percent">نسبة %</option>
            <option value="fixed">قيمة ثابتة</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted">القيمة</label>
          <input required type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} className={inputCls + " w-24"} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted">حد أدنى للسلة</label>
          <input type="number" value={form.min_subtotal} onChange={(e) => setForm({ ...form, min_subtotal: e.target.value })} className={inputCls + " w-24"} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted">حد أقصى للخصم</label>
          <input type="number" value={form.max_discount} onChange={(e) => setForm({ ...form, max_discount: e.target.value })} className={inputCls + " w-24"} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted">الاستخدام الأقصى (0=غير محدود)</label>
          <input type="number" value={form.usage_limit} onChange={(e) => setForm({ ...form, usage_limit: e.target.value })} className={inputCls + " w-24"} />
        </div>
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-gold px-4 py-2 text-sm font-bold text-bg-base disabled:opacity-50"
        >
          إنشاء
        </button>
      </form>

      <div className="card-premium overflow-x-auto p-2">
        {!data ? (
          <p className="p-4 text-sm text-muted">جارٍ التحميل...</p>
        ) : data.results.length === 0 ? (
          <p className="p-4 text-sm text-muted">لا توجد كوبونات</p>
        ) : (
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-line/60 text-right text-xs text-muted">
                <th className="px-3 py-2 font-medium">الكود</th>
                <th className="px-3 py-2 font-medium">النوع</th>
                <th className="px-3 py-2 font-medium">الخصم</th>
                <th className="px-3 py-2 font-medium">الاستخدام</th>
                <th className="px-3 py-2 font-medium">الحالة</th>
                <th className="px-3 py-2 font-medium">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {data.results.map((c) => (
                <tr key={c.id} className="border-b border-line/40 last:border-0">
                  <td className="px-3 py-2 font-mono text-gold">{c.code}</td>
                  <td className="px-3 py-2 text-muted">
                    {c.type === "percent" ? `نسبة ${c.value}%` : formatEGP(c.value)}
                  </td>
                  <td className="px-3 py-2 text-muted">
                    {c.max_discount ? formatEGP(c.max_discount) : "—"}
                  </td>
                  <td className="px-3 py-2 text-muted">
                    {c.used_count}/{c.usage_limit || "∞"}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ring-1 ${
                        c.is_active
                          ? "bg-success/10 text-success ring-success/30"
                          : "bg-bg-raised text-muted ring-line"
                      }`}
                    >
                      {c.is_active ? "مفعل" : "معطل"}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => toggle(c)}
                      className="rounded-lg bg-bg-raised px-3 py-1 text-xs text-text ring-1 ring-line"
                    >
                      {c.is_active ? "تعطيل" : "تفعيل"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}