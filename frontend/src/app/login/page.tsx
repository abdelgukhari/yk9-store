"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/app-context";

export default function LoginPage() {
  const { login, user } = useApp();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) router.push("/account");
  }, [user, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await login(email, password);
      router.push("/account");
    } catch (err) {
      setError(err instanceof Error ? err.message : "بيانات غير صحيحة");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="card-premium p-8">
        <h1 className="text-2xl font-extrabold">تسجيل الدخول</h1>
        <p className="mt-1 text-sm text-muted">أهلًا بعودتك إلى YK9</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm text-muted">البريد الإلكتروني</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-line bg-bg-card px-3 py-2.5 text-sm outline-none focus:border-gold"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-muted">كلمة المرور</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-line bg-bg-card px-3 py-2.5 text-sm outline-none focus:border-gold"
            />
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-gold py-3 font-bold text-black transition hover:bg-gold-light disabled:opacity-50"
          >
            {busy ? "جارٍ الدخول..." : "تسجيل الدخول"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-muted">
          ليس لديك حساب؟{" "}
          <Link href="/register" className="text-gold hover:underline">
            أنشئ حسابًا
          </Link>
        </p>
      </div>
    </div>
  );
}
