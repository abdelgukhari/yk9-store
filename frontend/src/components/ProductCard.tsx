"use client";

import Link from "next/link";
import { useApp } from "@/lib/app-context";
import type { Product } from "@/lib/types";
import ProductImage from "./ProductImage";

function formatEGP(value: string | number) {
  return `${Number(value).toLocaleString("ar-EG")} ج.م`;
}

export default function ProductCard({ product }: { product: Product }) {
  const { addToCart, showToast } = useApp();

  return (
    <div className="card-premium group flex flex-col overflow-hidden">
      <Link href={`/products/${product.slug}`} className="relative block aspect-square overflow-hidden">
        <ProductImage imageUrl={product.image_url} alt={product.name_ar} className="transition duration-300 group-hover:scale-105" />
        {product.discount_percent > 0 && (
          <span className="absolute top-3 right-3 rounded-full bg-danger px-2.5 py-1 text-xs font-bold">
            خصم {product.discount_percent}%
          </span>
        )}
        {product.is_best_seller && (
          <span className="absolute top-3 left-3 rounded-full bg-gold px-2.5 py-1 text-xs font-bold text-black">
            الأكثر مبيعًا
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="text-xs text-muted">{product.brand.name}</div>
        <Link href={`/products/${product.slug}`} className="font-bold leading-snug transition hover:text-gold">
          {product.name_ar}
        </Link>
        <div className="mt-1 flex items-center gap-1 text-xs text-muted">
          {product.battery_life_hours && <span>{product.battery_life_hours} ساعة</span>}
          {product.noise_cancellation && (
            <>
              {product.battery_life_hours && <span>•</span>}
              <span>عزل ضوضاء</span>
            </>
          )}
        </div>
        <div className="mt-auto flex items-end justify-between pt-2">
          <div>
            <div className="text-lg font-extrabold text-gold">{formatEGP(product.min_price)}</div>
            {product.discount_percent > 0 && (
              <div className="text-xs text-muted line-through">{formatEGP((Number(product.min_price) / (1 - product.discount_percent / 100)).toFixed(0))}</div>
            )}
          </div>
        </div>
        <button
          onClick={async () => {
            if (!product.variant_id) {
              showToast("المنتج غير متوفر حاليًا");
              return;
            }
            try {
              await addToCart(product.variant_id, 1);
              showToast("أُضيف إلى السلة ✓");
            } catch {
              showToast("تعذر إضافة المنتج");
            }
          }}
          disabled={!product.variant_id}
          className="mt-2 w-full rounded-lg bg-gold py-2 text-sm font-bold text-black transition hover:bg-gold-light disabled:cursor-not-allowed disabled:opacity-50"
        >
          {product.variant_id ? "أضف إلى السلة" : "غير متوفر"}
        </button>
      </div>
    </div>
  );
}
