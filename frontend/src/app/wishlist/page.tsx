"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useApp } from "@/lib/app-context";
import ProductImage from "@/components/ProductImage";

type WishlistEntry = {
  id: number;
  product_id: number;
  product_name: string;
  product_slug: string;
  min_price: string;
  image_url: string | null;
};

function formatEGP(value: string | number) {
  return `${Number(value).toLocaleString("ar-EG")} ج.م`;
}

export default function WishlistPage() {
  const { user } = useApp();
  const [state, setState] = useState<{
    status: "idle" | "ready";
    items: WishlistEntry[];
  }>({ status: "idle", items: [] });

  useEffect(() => {
    if (!user) return;
    api<WishlistEntry[]>("/api/wishlist/", { auth: true })
      .then((items) => setState({ status: "ready", items }))
      .catch(() => setState((s) => ({ ...s, status: "ready" })));
  }, [user]);

  const remove = async (id: number) => {
    await api(`/api/wishlist/?product_id=${id}`, { method: "DELETE", auth: true });
    setState((s) => ({ ...s, items: s.items.filter((i) => i.id !== id) }));
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="mb-6 text-3xl font-extrabold">المفضلة</h1>

      {!user ? (
        <div className="card-premium py-16 text-center">
          <p className="text-muted">سجّل الدخول لعرض مفضلتك.</p>
          <Link href="/login" className="mt-4 inline-block rounded-xl bg-gold px-6 py-3 font-bold text-black">
            تسجيل الدخول
          </Link>
        </div>
      ) : state.status === "idle" ? (
        <div className="card-premium h-40 animate-pulse" />
      ) : state.items.length === 0 ? (
        <div className="card-premium py-16 text-center">
          <p className="text-muted">قائمة المفضلة فارغة.</p>
          <Link href="/products" className="mt-4 inline-block rounded-xl bg-gold px-6 py-3 font-bold text-black">
            تصفح المنتجات
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {state.items.map((item) => (
            <div key={item.id} className="card-premium overflow-hidden">
              <Link href={`/products/${item.product_slug}`} className="block aspect-video overflow-hidden">
                <ProductImage imageUrl={item.image_url} alt={item.product_name} />
              </Link>
              <div className="p-4">
                <Link href={`/products/${item.product_slug}`} className="font-bold hover:text-gold">
                  {item.product_name}
                </Link>
                <div className="mt-1 text-gold">{formatEGP(item.min_price)}</div>
                <button
                  onClick={() => remove(item.product_id)}
                  className="mt-3 text-sm text-danger hover:underline"
                >
                  إزالة من المفضلة
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
