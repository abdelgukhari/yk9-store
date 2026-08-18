"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useApp } from "@/lib/app-context";
import { ApiError } from "@/lib/api";

export default function AdminLoginPage() {
  const router = useRouter();
  const { login, showToast } = useApp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const user = await login(email, password);
      if (!user.is_staff) {
        showToast("هذا الحساب ليس لديه صلاحيات إدارية");
        return;
      }
      router.replace("/admin");
    } catch (err) {
      const msg = err instanceof ApiError ? err.detail : "فشل تسجيل الدخول";
      showToast(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="card-premium w-full max-w-sm p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gold/15 text-2xl font-bold text-gold">
            Y
          </div>
          <h1 className="text-xl font-bold text-text">لوحة تحكم YK9</h1>
          <p className="mt-1 text-sm text-muted">الدخول بحساب موظف (Staff)</p>
        </div>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="البريد الإلكتروني"
            className="rounded-xl border border-line bg-bg-card px-4 py-2.5 text-sm text-text outline-none placeholder:text-muted/60 focus:border-gold/50"
          />
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="كلمة المرور"
            className="rounded-xl border border-line bg-bg-card px-4 py-2.5 text-sm text-text outline-none placeholder:text-muted/60 focus:border-gold/50"
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded-xl bg-gold px-4 py-2.5 text-sm font-bold text-bg-base transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "جارٍ الدخول..." : "دخول"}
          </button>
        </form>
        <p className="mt-4 text-center text-xs text-muted">
          <Link href="/" className="text-gold hover:underline">
            العودة للمتجر
          </Link>
        </p>
      </div>
    </div>
  );
}
