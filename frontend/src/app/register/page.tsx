"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/app-context";

export default function RegisterPage() {
  const { register, showToast } = useApp();
  const router = useRouter();
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await register(form);
      showToast("تم إنشاء الحساب! تحقق من بريدك لتأكيد الحساب");
      router.push("/login");
    } catch (err) {
      const m = err instanceof Error ? err.message : "حدث خطأ";
      setError(m.replace(/^non_field_errors:\s*/i, ""));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="card-premium p-8">
        <h1 className="text-2xl font-extrabold">إنشاء حساب</h1>
        <p className="mt-1 text-sm text-muted">انضم إلى YK9 لمتابعة طلباتك وأسرع تجربة</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm text-muted">الاسم الأول</label>
              <input
                required
                value={form.first_name}
                onChange={(e) => set("first_name", e.target.value)}
                className="w-full rounded-lg border border-line bg-bg-card px-3 py-2.5 text-sm outline-none focus:border-gold"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-muted">الاسم الأخير</label>
              <input
                required
                value={form.last_name}
                onChange={(e) => set("last_name", e.target.value)}
                className="w-full rounded-lg border border-line bg-bg-card px-3 py-2.5 text-sm outline-none focus:border-gold"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm text-muted">البريد الإلكتروني</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              className="w-full rounded-lg border border-line bg-bg-card px-3 py-2.5 text-sm outline-none focus:border-gold"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-muted">كلمة المرور</label>
            <input
              type="password"
              required
              minLength={8}
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              className="w-full rounded-lg border border-line bg-bg-card px-3 py-2.5 text-sm outline-none focus:border-gold"
            />
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-gold py-3 font-bold text-black transition hover:bg-gold-light disabled:opacity-50"
          >
            {busy ? "جارٍ الإنشاء..." : "إنشاء الحساب"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-muted">
          لديك حساب؟{" "}
          <Link href="/login" className="text-gold hover:underline">
            تسجيل الدخول
          </Link>
        </p>
      </div>
    </div>
  );
}
