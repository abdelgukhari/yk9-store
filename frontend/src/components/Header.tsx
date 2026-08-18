"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useApp } from "@/lib/app-context";
import { CartIcon, CloseIcon, MenuIcon, PyramidIcon, UserIcon } from "./icons";

export default function Header() {
  const { cartCount, user, logout, showToast } = useApp();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40">
      <div className="bg-gradient-to-l from-gold-dark via-gold to-gold-dark text-black">
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-4 py-1.5 text-center text-[11px] font-bold sm:text-sm">
          <span className="animate-pulse">🔥</span>
          <span>شحن مجاني للطلبات فوق ١٠٠٠ ج.م</span>
          <span className="hidden sm:inline">•</span>
          <span className="hidden sm:inline">الدفع عند الاستلام متاح</span>
        </div>
      </div>
      <div className="border-b border-line bg-bg-base/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4">
        <button
          className="p-2 text-muted md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="القائمة"
        >
          {open ? <CloseIcon className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
        </button>

        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/brand/yk9-logo.png"
            alt="YK9"
            width={48}
            height={48}
            className="rounded-lg object-contain"
          />
          <span className="flex items-center gap-2 text-3xl font-extrabold tracking-tight gold-gradient-text">
            YK9
            <PyramidIcon className="h-6 w-6 shrink-0 text-gold" />
          </span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm md:flex">
          <Link href="/" className="text-muted transition hover:text-gold">
            الرئيسية
          </Link>
          <Link href="/products" className="text-muted transition hover:text-gold">
            المتجر
          </Link>
          <Link href="/track" className="text-muted transition hover:text-gold">
            تتبع طلبك
          </Link>
          <Link
            href="/products/?category=wireless-audio"
            className="text-muted transition hover:text-gold"
          >
            سماعات
          </Link>
          <Link
            href="/products/?category=chargers"
            className="text-muted transition hover:text-gold"
          >
            شواحن
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/login"
            className="hidden rounded-lg px-2 py-2 text-xs text-muted/70 transition hover:text-gold sm:inline"
            title="لوحة التحكم"
          >
            لوحة التحكم
          </Link>
          {user ? (
            <div className="flex items-center gap-1">
              <Link
                href="/account"
                className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-muted transition hover:text-gold"
              >
                <UserIcon className="h-5 w-5" />
                <span className="hidden sm:inline">{user.first_name || user.email.split("@")[0]}</span>
              </Link>
              <button
                onClick={() => {
                  logout();
                  showToast("تم تسجيل الخروج");
                }}
                className="rounded-lg px-3 py-2 text-sm text-muted transition hover:text-danger"
              >
                خروج
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="rounded-lg border border-line px-3 py-2 text-sm text-muted transition hover:border-gold hover:text-gold"
            >
              تسجيل الدخول
            </Link>
          )}

          <Link
            href="/cart"
            className="relative flex items-center gap-2 rounded-lg bg-bg-raised px-3 py-2 text-sm text-gold ring-1 ring-line transition hover:ring-gold"
          >
            <CartIcon className="h-5 w-5" />
            <span className="hidden sm:inline">السلة</span>
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1 text-xs font-bold text-black">
                {cartCount}
              </span>
            )}
          </Link>
        </div>
      </div>
      </div>

      {open && (
        <nav className="flex flex-col gap-1 border-t border-line px-4 py-2 md:hidden">
          <Link href="/" className="rounded-lg px-3 py-2 text-muted hover:bg-bg-raised">الرئيسية</Link>
          <Link href="/products" className="rounded-lg px-3 py-2 text-muted hover:bg-bg-raised">المتجر</Link>
          <Link href="/track" className="rounded-lg px-3 py-2 text-muted hover:bg-bg-raised">تتبع طلبك</Link>
          <Link href="/products/?category=wireless-audio" className="rounded-lg px-3 py-2 text-muted hover:bg-bg-raised">سماعات</Link>
          <Link href="/products/?category=chargers" className="rounded-lg px-3 py-2 text-muted hover:bg-bg-raised">شواحن</Link>
          <Link href="/admin/login" className="rounded-lg px-3 py-2 text-muted hover:bg-bg-raised">لوحة التحكم</Link>
        </nav>
      )}
    </header>
  );
}
