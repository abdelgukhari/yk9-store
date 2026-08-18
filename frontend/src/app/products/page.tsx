"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import type { Brand, Category, Product } from "@/lib/types";
import ProductCard from "@/components/ProductCard";
import { SearchIcon } from "@/components/icons";

const SORTS = [
  { value: "newest", label: "الأحدث" },
  { value: "price_asc", label: "السعر: من الأقل" },
  { value: "price_desc", label: "السعر: من الأعلى" },
  { value: "bestseller", label: "الأكثر مبيعًا" },
];

export default function ProductsPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-8"><div className="card-premium h-96 animate-pulse" /></div>}>
      <ProductsContent />
    </Suspense>
  );
}

function ProductsContent() {
  const params = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);

  const category = params.get("category") ?? "";
  const brand = params.get("brand") ?? "";
  const search = params.get("search") ?? "";
  const sort = params.get("sort") ?? "newest";
  const minPrice = params.get("min_price") ?? "";
  const maxPrice = params.get("max_price") ?? "";

  useEffect(() => {
    Promise.all([
      api<Category[]>("/api/catalog/categories/"),
      api<Brand[]>("/api/catalog/brands/"),
    ]).then(([c, b]) => {
      setCategories(c);
      setBrands(b);
    }).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    const qs = new URLSearchParams();
    if (category) qs.set("category", category);
    if (brand) qs.set("brand", brand);
    if (search) qs.set("search", search);
    if (sort !== "newest") qs.set("sort", sort);
    if (minPrice) qs.set("min_price", minPrice);
    if (maxPrice) qs.set("max_price", maxPrice);
    try {
      const data = await api<Product[]>(`/api/catalog/products/?${qs.toString()}`);
      setProducts(data);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [category, brand, search, sort, minPrice, maxPrice]);

  useEffect(() => {
    // setState happens after network await, not synchronously.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const update = (key: string, value: string) => {
    const qs = new URLSearchParams(params.toString());
    if (value) qs.set(key, value);
    else qs.delete(key);
    const url = `/products/?${qs.toString()}`;
    window.history.pushState(null, "", url);
    setLoading(true);
    load();
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold">المتجر</h1>
        <p className="mt-1 text-muted">سماعات، شواحن، وإكسسوارات موبايل أصلية</p>
      </div>

      <form
        className="mb-6 flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const input = new FormData(e.currentTarget).get("q") as string;
          update("search", input);
        }}
      >
        <div className="relative flex-1">
          <SearchIcon className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
          <input
            name="q"
            defaultValue={search}
            placeholder="ابحث عن منتج..."
            className="w-full rounded-xl border border-line bg-bg-card py-2.5 pr-10 pl-4 text-sm outline-none focus:border-gold"
          />
        </div>
        <button className="rounded-xl bg-gold px-5 py-2.5 text-sm font-bold text-black">
          بحث
        </button>
      </form>

      <div className="mb-6 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted">الفئة:</span>
        <button
          onClick={() => update("category", "")}
          className={`rounded-full px-3 py-1.5 transition ${
            !category ? "bg-gold text-black" : "border border-line text-muted hover:text-gold"
          }`}
        >
          الكل
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => update("category", category === c.slug ? "" : c.slug)}
            className={`rounded-full px-3 py-1.5 transition ${
              category === c.slug ? "bg-gold text-black" : "border border-line text-muted hover:text-gold"
            }`}
          >
            {c.name_ar}
          </button>
        ))}
      </div>

      <div className="mb-8 flex flex-wrap items-center gap-4">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted">الترتيب:</span>
          {SORTS.map((s) => (
            <button
              key={s.value}
              onClick={() => update("sort", sort === s.value ? "" : s.value)}
              className={`rounded-full px-3 py-1.5 transition ${
                sort === s.value ? "bg-gold text-black" : "border border-line text-muted hover:text-gold"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted">السعر:</span>
          <input
            type="number"
            placeholder="من"
            defaultValue={minPrice}
            onBlur={(e) => update("min_price", e.target.value)}
            className="w-24 rounded-lg border border-line bg-bg-card px-2 py-1.5 text-sm outline-none focus:border-gold"
          />
          <input
            type="number"
            placeholder="إلى"
            defaultValue={maxPrice}
            onBlur={(e) => update("max_price", e.target.value)}
            className="w-24 rounded-lg border border-line bg-bg-card px-2 py-1.5 text-sm outline-none focus:border-gold"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted">البراند:</span>
          <select
            value={brand}
            onChange={(e) => update("brand", e.target.value)}
            className="rounded-lg border border-line bg-bg-card px-2 py-1.5 outline-none focus:border-gold"
          >
            <option value="">الكل</option>
            {brands.map((b) => (
              <option key={b.id} value={b.slug}>{b.name}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="card-premium aspect-[3/4] animate-pulse" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="card-premium py-20 text-center text-muted">
          لا توجد منتجات مطابقة للبحث.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
