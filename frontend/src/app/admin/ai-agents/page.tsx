"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useApp } from "@/lib/app-context";
import { type AdminAgent, type AdminProvider } from "@/lib/admin";

export default function AdminAgentsPage() {
  const { showToast } = useApp();
  const [agents, setAgents] = useState<AdminAgent[] | null>(null);
  const [providers, setProviders] = useState<AdminProvider[]>([]);
  const [editing, setEditing] = useState<AdminAgent | null>(null);
  const [instructions, setInstructions] = useState("");
  const [providerId, setProviderId] = useState<string>("");
  const [temperature, setTemperature] = useState("0.4");
  const [maxTokens, setMaxTokens] = useState("600");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api<AdminAgent[]>("/api/admin/ai/agents/", { auth: true })
      .then(setAgents)
      .catch(() => setAgents(null));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    api<AdminProvider[]>("/api/admin/ai/providers/", { auth: true })
      .then(setProviders)
      .catch(() => {});
  }, []);

  const toggle = async (a: AdminAgent) => {
    try {
      await api(`/api/admin/ai/agents/${a.id}/`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: !a.is_active }),
        auth: true,
      });
      load();
    } catch {
      showToast("خطأ");
    }
  };

  const save = async () => {
    if (!editing) return;
    setBusy(true);
    try {
      await api(`/api/admin/ai/agents/${editing.id}/`, {
        method: "PATCH",
        body: JSON.stringify({
          system_instructions: instructions,
          provider: providerId ? Number(providerId) : null,
          temperature: Number(temperature),
          max_tokens: Number(maxTokens),
        }),
        auth: true,
      });
      showToast("تم الحفظ");
      setEditing(null);
      load();
    } catch (err) {
      showToast(err instanceof ApiError ? err.detail : "خطأ");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold text-text">وكلاء الذكاء الاصطناعي</h1>
        <p className="text-sm text-muted">إدارة توجيهات وسلوك وكلاء الدردشة</p>
      </div>

      {!agents ? (
        <p className="text-sm text-muted">جارٍ التحميل...</p>
      ) : agents.length === 0 ? (
        <p className="text-sm text-muted">لا يوجد وكلاء</p>
      ) : (
        <div className="flex flex-col gap-3">
          {agents.map((a) => (
            <div key={a.id} className="card-premium p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-bold text-text">
                    {a.name}
                    {a.is_default && (
                      <span className="mr-2 rounded-full bg-gold/15 px-2 py-0.5 text-xs text-gold ring-1 ring-gold/30">
                        الافتراضي
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted">
                    {a.role || "—"} · {a.provider_name ?? "بدون مزود"}
                  </div>
                  {a.description && (
                    <div className="mt-1 text-sm text-muted">{a.description}</div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggle(a)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold ring-1 ${
                      a.is_active
                        ? "bg-success/10 text-success ring-success/30"
                        : "bg-danger/10 text-danger ring-danger/30"
                    }`}
                  >
                    {a.is_active ? "مفعل" : "معطل"}
                  </button>
                  <button
                    onClick={() => {
                      setEditing(a);
                      setInstructions(a.system_instructions);
                      setProviderId(a.provider ? String(a.provider) : "");
                      setTemperature(String(a.temperature));
                      setMaxTokens(String(a.max_tokens));
                    }}
                    className="rounded-lg bg-bg-raised px-3 py-1.5 text-xs text-text ring-1 ring-line"
                  >
                    التوجيهات
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div className="card-premium p-5 ring-1 ring-gold/30">
          <h2 className="mb-2 font-bold text-text">
            توجيهات: {editing.name}
          </h2>
          <textarea
            rows={8}
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            className="w-full rounded-lg border border-line bg-bg-card px-3 py-2 text-sm text-text outline-none placeholder:text-muted/60 focus:border-gold/50"
          />
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs text-muted">المزود</label>
              <select
                value={providerId}
                onChange={(e) => setProviderId(e.target.value)}
                className="w-full rounded-lg border border-line bg-bg-card px-3 py-2 text-sm outline-none focus:border-gold"
              >
                <option value="">الافتراضي (من البيئة)</option>
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.kind_label})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted">الحرارة (temperature)</label>
              <input
                type="number"
                min={0}
                max={2}
                step={0.1}
                value={temperature}
                onChange={(e) => setTemperature(e.target.value)}
                className="w-full rounded-lg border border-line bg-bg-card px-3 py-2 text-sm outline-none focus:border-gold"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted">الحد الأقصى للرموز</label>
              <input
                type="number"
                min={1}
                step={50}
                value={maxTokens}
                onChange={(e) => setMaxTokens(e.target.value)}
                className="w-full rounded-lg border border-line bg-bg-card px-3 py-2 text-sm outline-none focus:border-gold"
              />
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              disabled={busy}
              onClick={save}
              className="rounded-lg bg-gold px-4 py-2 text-sm font-bold text-bg-base disabled:opacity-50"
            >
              حفظ
            </button>
            <button
              onClick={() => setEditing(null)}
              className="rounded-lg bg-bg-raised px-4 py-2 text-sm text-muted ring-1 ring-line"
            >
              إلغاء
            </button>
          </div>
        </div>
      )}
    </div>
  );
}