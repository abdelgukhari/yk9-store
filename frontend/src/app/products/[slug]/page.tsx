"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { useApp } from "@/lib/app-context";
import type { Product, ProductVariant } from "@/lib/types";
import ProductImage from "@/components/ProductImage";
import ProductCard from "@/components/ProductCard";
import { CheckIcon, WhatsAppIcon } from "@/components/icons";

function formatEGP(value: string | number) {
  return `${Number(value).toLocaleString("ar-EG")} ج.م`;
}

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { addToCart, showToast, user } = useApp();
  const [product, setProduct] = useState<Product | null>(null);
  const [variant, setVariant] = useState<ProductVariant | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState("");

  useEffect(() => {
    api<Product>(`/api/catalog/products/${slug}/`)
      .then((p) => {
        setProduct(p);
        const active = p.variants?.find((v) => v.stock > 0) ?? p.variants?.[0];
        setVariant(active ?? null);
      })
      .catch(() => setProduct(null))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="card-premium aspect-[4/3] animate-pulse md:aspect-[2/1]" />
      </div>
    );
  }
  if (!product) return notFound();

  const addToCartHandler = async () => {
    if (!variant) return;
    setBusy(true);
    try {
      await addToCart(variant.id, quantity);
      showToast("أُضيف إلى السلة ✓");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "تعذر إضافة المنتج");
    } finally {
      setBusy(false);
    }
  };

  const openWhatsapp = async () => {
    const win = window.open("", "_blank", "noopener,noreferrer");
    try {
      const params = new URLSearchParams({
        product: product.name_ar,
        color: variant?.color ?? "",
        price: String(variant?.price ?? product.min_price),
        link: `/products/${product.slug}`,
      });
      const res = await api<{ wa_link: string }>(`/api/whatsapp/contact/?${params.toString()}`);
      if (win) win.location.href = res.wa_link;
      else window.open(res.wa_link, "_blank", "noopener,noreferrer");
    } catch {
      win?.close();
      showToast("تعذر فتح واتساب، حاول مرة أخرى");
    }
  };

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api(`/api/catalog/products/${product.slug}/reviews/`, {
        method: "POST",
        body: JSON.stringify({ rating, comment: reviewText }),
        auth: true,
      });
      setReviewText("");
      showToast("شكرًا لتقييمك! يظهر التقييم بعد المراجعة");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "حدث خطأ");
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <nav className="mb-6 text-sm text-muted">
        <Link href="/" className="hover:text-gold">الرئيسية</Link> /
        <Link href="/products" className="hover:text-gold"> المتجر</Link> /
        <span className="text-text"> {product.name_ar}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="card-premium aspect-square overflow-hidden">
          <ProductImage imageUrl={product.image_url} alt={product.name_ar} />
        </div>

        <div>
          <div className="text-sm text-muted">{product.brand.name}</div>
          <h1 className="mt-1 text-3xl font-extrabold">{product.name_ar}</h1>
          {product.rating_avg && (
            <div className="mt-2 text-sm text-muted">
              ⭐ {product.rating_avg} ({product.reviews_count} تقييم)
            </div>
          )}

          <div className="mt-4 flex items-end gap-3">
            {variant ? (
              <>
                <span className="text-3xl font-black text-gold">{formatEGP(variant.price)}</span>
                {variant.compare_at_price && (
                  <span className="mb-1 text-lg text-muted line-through">
                    {formatEGP(variant.compare_at_price)}
                  </span>
                )}
              </>
            ) : (
              <span className="text-3xl font-black text-gold">{formatEGP(product.min_price)}</span>
            )}
          </div>
          {variant?.discount_percent ? (
            <span className="mt-2 inline-block rounded-full bg-danger/15 px-3 py-1 text-xs font-bold text-danger">
              خصم {variant.discount_percent}%
            </span>
          ) : null}

          {product.description && (
            <p className="mt-4 text-muted">{product.description}</p>
          )}

          {product.variants && product.variants.length > 1 && (
            <div className="mt-5">
              <div className="mb-2 text-sm font-semibold">اللون:</div>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setVariant(v)}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                      variant?.id === v.id ? "border-gold text-gold" : "border-line text-muted hover:text-gold"
                    }`}
                  >
                    <span
                      className="h-4 w-4 rounded-full border border-line"
                      style={{ backgroundColor: v.color_hex || "#fff" }}
                    />
                    {v.color}
                    {v.stock === 0 && <span className="text-xs text-danger">نفد</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 flex items-center gap-3">
            <div className="flex items-center rounded-xl border border-line">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="px-4 py-2.5 text-xl text-muted hover:text-gold"
              >
                −
              </button>
              <span className="w-10 text-center font-bold">{quantity}</span>
              <button
                onClick={() => setQuantity((q) => q + 1)}
                className="px-4 py-2.5 text-xl text-muted hover:text-gold"
              >
                +
              </button>
            </div>
            <button
              onClick={addToCartHandler}
              disabled={!variant || variant.stock === 0 || busy}
              className="flex-1 rounded-xl bg-gold py-3 font-bold text-black transition hover:bg-gold-light disabled:cursor-not-allowed disabled:opacity-50"
            >
              {!variant || variant.stock === 0 ? "غير متوفر" : busy ? "جارٍ الإضافة..." : "أضف إلى السلة"}
            </button>
          </div>

          <button
            type="button"
            onClick={openWhatsapp}
            className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#25d366]/15 px-4 py-2.5 text-sm font-medium text-[#25d366] transition hover:bg-[#25d366]/25"
          >
            <WhatsAppIcon className="h-5 w-5" />
            اسأل عن المنتج واتساب
          </button>

          <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
            {product.battery_life_hours && (
              <div className="card-premium flex items-center gap-2 p-3">
                <CheckIcon className="h-4 w-4 text-gold" /> عمر البطارية: {product.battery_life_hours} ساعة
              </div>
            )}
            {product.charging_type && (
              <div className="card-premium flex items-center gap-2 p-3">
                <CheckIcon className="h-4 w-4 text-gold" /> الشحن: {product.charging_type}
              </div>
            )}
            {product.bluetooth_version && (
              <div className="card-premium flex items-center gap-2 p-3">
                <CheckIcon className="h-4 w-4 text-gold" /> بلوتوث {product.bluetooth_version}
              </div>
            )}
            {product.noise_cancellation && (
              <div className="card-premium flex items-center gap-2 p-3">
                <CheckIcon className="h-4 w-4 text-gold" /> عزل ضوضاء نشط
              </div>
            )}
            {product.warranty_months && (
              <div className="card-premium flex items-center gap-2 p-3">
                <CheckIcon className="h-4 w-4 text-gold" /> ضمان {product.warranty_months} شهر
              </div>
            )}
            {product.water_resistance && (
              <div className="card-premium flex items-center gap-2 p-3">
                <CheckIcon className="h-4 w-4 text-gold" /> مقاومة الماء {product.water_resistance}
              </div>
            )}
          </div>
        </div>
      </div>

      {product.box_contents && (
        <div className="card-premium mt-8 p-6">
          <h2 className="mb-2 font-bold">محتوى العلبة</h2>
          <p className="text-sm text-muted">{product.box_contents}</p>
        </div>
      )}

      {product.specifications && product.specifications.length > 0 && (
        <div className="card-premium mt-4 p-6">
          <h2 className="mb-3 font-bold">المواصفات</h2>
          <dl className="grid gap-2 sm:grid-cols-2">
            {product.specifications.map((s) => (
              <div key={s.key} className="flex justify-between gap-4 border-b border-line py-1 text-sm">
                <dt className="text-muted">{s.key}</dt>
                <dd className="font-medium">{s.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      <div className="card-premium mt-8 p-6">
        <h2 className="mb-4 font-bold">أضف تقييمك</h2>
        <form onSubmit={submitReview} className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <select
            value={rating}
            onChange={(e) => setRating(Number(e.target.value))}
            className="rounded-lg border border-line bg-bg-card px-3 py-2.5 text-sm outline-none focus:border-gold"
          >
            {[5, 4, 3, 2, 1].map((r) => (
              <option key={r} value={r}>{r} ★</option>
            ))}
          </select>
          <input
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            placeholder="اكتب تقييمك عن المنتج..."
            className="flex-1 rounded-lg border border-line bg-bg-card px-4 py-2.5 text-sm outline-none focus:border-gold"
          />
          <button
            type="submit"
            className="rounded-lg bg-gold px-5 py-2.5 text-sm font-bold text-black disabled:opacity-50"
            disabled={!user || reviewText.length < 3}
            title={!user ? "سجل الدخول لتقييم المنتج" : ""}
          >
            إرسال
          </button>
        </form>
        {!user && <p className="mt-2 text-xs text-muted">سجّل الدخول لتتمكن من التقييم.</p>}
      </div>

      {product.related && product.related.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-6 text-2xl font-extrabold">منتجات مشابهة</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {product.related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
