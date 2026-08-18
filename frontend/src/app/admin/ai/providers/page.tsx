"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useApp } from "@/lib/app-context";
import { type AdminProvider } from "@/lib/admin";

const KINDS = [
  { value: "openai", label: "OpenAI-compatible" },
  { value: "ollama", label: "Ollama" },
  { value: "mock", label: "Mock (offline)" },
];

const EMPTY = { name: "", kind: "openai", base_url: "", model: "", is_active: true };

export default function AdminProvidersPage() {
  const { showToast } = useApp();
  const [providers, setProviders] = useState<AdminProvider[] | null>(null);
  const [editing, setEditing] = useState<AdminProvider | null>(null);
  const [form, setForm] = useState<{ [k: string]: string | boolean }>({ ...EMPTY });
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api<AdminProvider[]>("/api/admin/ai/providers/", { auth: true })
      .then(setProviders)
      .catch(() => setProviders(null));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const set = (key: string, value: string | boolean) =>
    setForm((f) => ({ ...f, [key]: value }));

  const save = async () => {
    setBusy(true);
    try {
      if (editing) {
        await api(`/api/admin/ai/providers/${editing.id}/`, {
          method: "PATCH",
          body: JSON.stringify(form),
          auth: true,
        });
      } else {
        await api("/api/admin/ai/providers/", {
          method: "POST",
          body: JSON.stringify(form),
          auth: true,
        });
      }
      showToast("تم الحفظ");
      setEditing(null);
      setForm({ ...EMPTY });
      load();
    } catch (err) {
      showToast(err instanceof ApiError ? err.detail : "خطأ في الحفظ");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (p: AdminProvider) => {
    if (!confirm(`حذف المزود "${p.name}"؟`)) return;
    try {
      await api(`/api/admin/ai/providers/${p.id}/`, { method: "DELETE", auth: true });
      load();
    } catch (err) {
      showToast(err instanceof ApiError ? err.detail : "خطأ في الحذف");
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold text-text">مزودات الذكاء الاصطناعي</h1>
        <p className="text-sm text-muted">
          إعدادات الاتصال بالمزودات (OpenAI-compatible / Ollama / Mock)
        </p>
      </div>

      {!providers ? (
        <p className="text-sm text-muted">جارٍ التحميل...</p>
      ) : (
        <div className="flex flex-col gap-3">
          {providers.map((p) => (
            <div key={p.id} className="card-premium p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-text">{p.name}</span>
                    <span
                      className={`h-2 w-2 rounded-full ${
                        p.is_active
                          ? p.is_online
                            ? "bg-success"
                            : "bg-warning"
                          : "bg-line"
                      }`}
                      title={p.is_online ? "متصل" : p.is_active ? "لم يُتحقق بعد" : "معطل"}
                    />
                  </div>
                  <div className="mt-0.5 text-xs text-muted">
                    {p.kind_label}
                    {p.model ? ` · ${p.model}` : ""}
                    {p.base_url ? ` · ${p.base_url}` : ""}
                  </div>
                  {p.last_checked_at && (
                    <div className="text-xs text-muted">
                      آخر فحص: {new Date(p.last_checked_at).toLocaleString("ar-EG")}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditing(p);
                      setForm({
                        name: p.name,
                        kind: p.kind,
                        base_url: p.base_url,
                        model: p.model,
                        is_active: p.is_active,
                      });
                    }}
                    className="rounded-lg bg-bg-raised px-3 py-1.5 text-xs text-text ring-1 ring-line"
                  >
                    تعديل
                  </button>
                  <button
                    onClick={() => remove(p)}
                    className="rounded-lg bg-danger/10 px-3 py-1.5 text-xs text-danger ring-1 ring-danger/30"
                  >
                    حذف
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card-premium p-5">
        <h2 className="mb-3 font-bold text-text">
          {editing ? `تعديل: ${editing.name}` : "مزود جديد"}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-muted">الاسم *</label>
            <input
              required
              value={String(form.name)}
              onChange={(e) => set("name", e.target.value)}
              className="w-full rounded-lg border border-line bg-bg-card px-3 py-2 text-sm outline-none focus:border-gold"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted">النوع *</label>
            <select
              value={String(form.kind)}
              onChange={(e) => set("kind", e.target.value)}
              className="w-full rounded-lg border border-line bg-bg-card px-3 py-2 text-sm outline-none focus:border-gold"
            >
              {KINDS.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.label}
                </option>
              ))}
            </select>
          </div>
          {form.kind !== "mock" && (
            <>
              <div>
                <label className="mb-1 block text-xs text-muted">Base URL (اختياري)</label>
                <input
                  value={String(form.base_url)}
                  onChange={(e) => set("base_url", e.target.value)}
                  placeholder="https://api.openai.com/v1"
                  dir="ltr"
                  className="w-full rounded-lg border border-line bg-bg-card px-3 py-2 text-sm outline-none focus:border-gold"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted">Model (اختياري)</label>
                <input
                  value={String(form.model)}
                  onChange={(e) => set("model", e.target.value)}
                  placeholder="gpt-4o-mini"
                  dir="ltr"
                  className="w-full rounded-lg border border-line bg-bg-card px-3 py-2 text-sm outline-none focus:border-gold"
                />
              </div>
            </>
          )}
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            checked={Boolean(form.is_active)}
            onChange={(e) => set("is_active", e.target.checked)}
            className="h-4 w-4 accent-gold"
          />
          مفعّل
        </label>
        <div className="mt-4 flex gap-2">
          <button
            disabled={busy || !String(form.name).trim()}
            onClick={save}
            className="rounded-lg bg-gold px-4 py-2 text-sm font-bold text-bg-base disabled:opacity-50"
          >
            {busy ? "جارٍ الحفظ..." : "حفظ"}
          </button>
          <button
            onClick={() => {
              setEditing(null);
              setForm({ ...EMPTY });
            }}
            className="rounded-lg bg-bg-raised px-4 py-2 text-sm text-muted ring-1 ring-line"
          >
            إلغاء
          </button>
        </div>
        {form.kind !== "mock" && (
          <p className="mt-3 text-xs text-muted">
            مفتاح API يُقرأ من متغير البيئة AI_API_KEY ولا يُخزن في قاعدة البيانات. إذا تُرك
            Base URL فارغًا، يُستخدم AI_BASE_URL من البيئة.
          </p>
        )}
      </div>
    </div>
  );
}