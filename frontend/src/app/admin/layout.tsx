"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { useApp } from "@/lib/app-context";

const NAV = [
  { href: "/admin", label: "لوحة التحكم", icon: "◈" },
  { href: "/admin/orders", label: "الطلبات", icon: "□" },
  { href: "/admin/products", label: "المنتجات", icon: "▣" },
  { href: "/admin/coupons", label: "الكوبونات", icon: "◫" },
  { href: "/admin/reviews", label: "المراجعات", icon: "★" },
  { href: "/admin/customers", label: "العملاء", icon: "👤" },
  { href: "/admin/ai-agents", label: "وكلاء الذكاء", icon: "✦" },
  { href: "/admin/ai/providers", label: "مزودات الذكاء", icon: "◉" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useApp();
  const isLogin = pathname.replace(/\/+$/, "") === "/admin/login";

  useEffect(() => {
    if (isLogin || loading) return;
    if (!user) {
      router.replace("/admin/login");
    } else if (!user.is_staff) {
      router.replace("/");
    }
  }, [user, loading, isLogin, router]);

  if (isLogin) return <>{children}</>;

  if (loading || !user || !user.is_staff) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center text-muted">
        جارٍ التحقق...
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 lg:flex-row">
      <aside className="lg:w-64 lg:shrink-0">
        <div className="card-premium p-4 lg:sticky lg:top-8">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/15 font-space text-lg font-bold text-gold">
              Y
            </div>
            <div>
              <div className="font-bold text-text">YK9 Admin</div>
              <div className="truncate text-xs text-muted">{user.email}</div>
            </div>
          </div>
          <nav className="flex flex-wrap gap-1 lg:flex-col">
            {NAV.map((item) => {
              const active =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                    active
                      ? "bg-gold/15 text-gold ring-1 ring-gold/30"
                      : "text-muted hover:bg-bg-raised hover:text-text"
                  }`}
                >
                  <span className="w-5 text-center">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
            <button
              onClick={() => {
                logout();
                router.replace("/admin/login");
              }}
              className="mt-2 flex items-center gap-2 rounded-lg px-3 py-2 text-start text-sm text-danger transition-colors hover:bg-bg-raised"
            >
              <span className="w-5 text-center">⏻</span>
              <span>تسجيل الخروج</span>
            </button>
          </nav>
        </div>
      </aside>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
