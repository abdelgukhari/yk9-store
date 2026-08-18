"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useApp } from "@/lib/app-context";
import {
  type AdminBrand,
  type AdminCategory,
  type AdminProductDetail,
  type AdminProductImage,
  type AdminVariant,
  formatEGP,
} from "@/lib/admin";

const EMPTY_FORM = {
  name_ar: "",
  name_en: "",
  model: "",
  brand: "",
  category: "",
  status: "draft",
  description: "",
  is_featured: false,
  is_best_seller: false,
  battery_life_hours: "",
  charging_type: "",
  bluetooth_version: "",
  water_resistance: "",
  noise_cancellation: false,
  warranty_months: "12",
  box_contents: "",
  seo_title: "",
  seo_description: "",
};

type FormState = typeof EMPTY_FORM;

export default function AdminProductEditPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useApp();
  const isNew = params.id === "new";
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [variants, setVariants] = useState<AdminVariant[]>([]);
  const [images, setImages] = useState<AdminProductImage[]>([]);
  const [brands, setBrands] = useState<AdminBrand[]>([]);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(isNew);

  const [nv, setNv] = useState({
    color: "",
    color_hex: "",
    sku: "",
    price: "",
    compare_at_price: "",
    stock: "",
  });
  const [imageAlt, setImageAlt] = useState("");
  const imageFileRef = useRef<HTMLInputElement>(null);
  const [imageBusy, setImageBusy] = useState(false);

  useEffect(() => {
    api<AdminBrand[]>("/api/admin/brands/", { auth: true })
      .then(setBrands)
      .catch(() => {});
    api<AdminCategory[]>("/api/admin/categories/", { auth: true })
      .then(setCategories)
      .catch(() => {});
    if (!isNew) {
      api<AdminProductDetail>(`/api/admin/products/${params.id}/`, { auth: true })
        .then((p) => {
          setForm({
            name_ar: p.name_ar,
            name_en: p.name_en,
            model: p.model,
            brand: String(p.brand ?? ""),
            category: String(p.category ?? ""),
            status: p.status,
            description: p.description,
            is_featured: p.is_featured,
            is_best_seller: p.is_best_seller,
            battery_life_hours: p.battery_life_hours || "",
            charging_type: p.charging_type,
            bluetooth_version: p.bluetooth_version,
            water_resistance: p.water_resistance,
            noise_cancellation: p.noise_cancellation,
            warranty_months: String(p.warranty_months ?? 12),
            box_contents: p.box_contents,
            seo_title: p.seo_title,
            seo_description: p.seo_description,
          });
          setVariants(p.variants);
          setImages(p.images);
          setLoaded(true);
        })
        .catch(() => setLoaded(false));
    }
  }, [isNew, params.id]);

  const set = (key: keyof FormState, value: string | boolean) =>
    setForm((f) => ({ ...f, [key]: value }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = {
        ...form,
        brand: Number(form.brand),
        category: Number(form.category),
        battery_life_hours: form.battery_life_hours ? Number(form.battery_life_hours) : null,
        warranty_months: Number(form.warranty_months || 12),
      };
      const res = await api<AdminProductDetail>(
        isNew ? "/api/admin/products/create/" : `/api/admin/products/${params.id}/`,
        {
          method: isNew ? "POST" : "PATCH",
          body: JSON.stringify(payload),
          auth: true,
        }
      );
      showToast("تم الحفظ");
      if (isNew) router.replace(`/admin/products/${res.id}`);
    } catch (err) {
      showToast(err instanceof ApiError ? err.detail : "خطأ في الحفظ");
    } finally {
      setBusy(false);
    }
  };

  const addVariant = async () => {
    setBusy(true);
    try {
      const res = await api<AdminVariant>("/api/admin/variants/", {
        method: "POST",
        body: JSON.stringify({
          product: isNew ? null : Number(params.id),
          color: nv.color,
          color_hex: nv.color_hex,
          sku: nv.sku,
          price: nv.price,
          compare_at_price: nv.compare_at_price || null,
          stock: nv.stock ? Number(nv.stock) : undefined,
        }),
        auth: true,
      });
      setVariants((v) => [...v, res]);
      setNv({ color: "", color_hex: "", sku: "", price: "", compare_at_price: "", stock: "" });
      showToast("تمت إضافة النوع");
    } catch (err) {
      showToast(err instanceof ApiError ? err.detail : "خطأ");
    } finally {
      setBusy(false);
    }
  };

  const updateVariant = async (v: AdminVariant, stock: string) => {
    setBusy(true);
    try {
      const res = await api<AdminVariant>(`/api/admin/variants/${v.id}/`, {
        method: "PATCH",
        body: JSON.stringify({ stock: Number(stock) }),
        auth: true,
      });
      setVariants((all) => all.map((x) => (x.id === v.id ? res : x)));
      showToast("تم تحديث المخزون");
    } catch (err) {
      showToast(err instanceof ApiError ? err.detail : "خطأ");
    } finally {
      setBusy(false);
    }
  };

  const deleteVariant = async (v: AdminVariant) => {
    if (!confirm(`حذف النوع ${v.color}؟`)) return;
    try {
      await api(`/api/admin/variants/${v.id}/`, { method: "DELETE", auth: true });
      setVariants((all) => all.filter((x) => x.id !== v.id));
      showToast("تم الحذف");
    } catch (err) {
      showToast(err instanceof ApiError ? err.detail : "خطأ");
    }
  };

  const uploadImage = async () => {
    const file = imageFileRef.current?.files?.[0];
    if (!file) {
      showToast("اختر صورة أولاً");
      return;
    }
    setImageBusy(true);
    try {
      const fd = new FormData();
      fd.append("product", String(params.id));
      fd.append("image", file);
      fd.append("alt", imageAlt);
      const res = await api<AdminProductImage>("/api/admin/images/", {
        method: "POST",
        body: fd,
        form: true,
        auth: true,
      });
      setImages((all) => [...all, res]);
      setImageAlt("");
      if (imageFileRef.current) imageFileRef.current.value = "";
      showToast("تمت إضافة الصورة");
    } catch (err) {
      showToast(err instanceof ApiError ? err.detail : "خطأ في رفع الصورة");
    } finally {
      setImageBusy(false);
    }
  };

  const deleteImage = async (img: AdminProductImage) => {
    if (!confirm("حذف هذه الصورة؟")) return;
    try {
      await api(`/api/admin/images/${img.id}/`, { method: "DELETE", auth: true });
      setImages((all) => all.filter((x) => x.id !== img.id));
      showToast("تم الحذف");
    } catch (err) {
      showToast(err instanceof ApiError ? err.detail : "خطأ");
    }
  };

  const archive = async () => {
    if (!confirm("أرشفة المنتج؟ سيختفي من المتجر.")) return;
    try {
      await api(`/api/admin/products/${params.id}/archive/`, { method: "POST", auth: true });
      showToast("تمت الأرشفة");
      router.push("/admin/products");
    } catch (err) {
      showToast(err instanceof ApiError ? err.detail : "خطأ");
    }
  };

  if (!loaded) {
    return (
      <p className="text-muted">
        {isNew ? "منتج جديد" : "تعذر تحميل المنتج"}
      </p>
    );
  }

  const inputCls =
    "w-full rounded-lg border border-line bg-bg-card px-3 py-2 text-sm text-text outline-none placeholder:text-muted/60 focus:border-gold/50";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin/products" className="text-xs text-gold hover:underline">
            ← عودة للمنتجات
          </Link>
          <h1 className="text-xl font-bold text-text">
            {isNew ? "منتج جديد" : `تعديل: ${form.name_ar}`}
          </h1>
        </div>
        {!isNew && (
          <button
            onClick={archive}
            className="rounded-lg bg-danger/15 px-4 py-2 text-sm font-bold text-danger ring-1 ring-danger/30"
          >
            أرشفة المنتج
          </button>
        )}
      </div>

      <form onSubmit={save} className="grid gap-5 lg:grid-cols-2">
        <div className="card-premium flex flex-col gap-4 p-5">
          <h2 className="font-bold text-text">البيانات الأساسية</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted">الاسم (عربي) *</label>
              <input required value={form.name_ar} onChange={(e) => set("name_ar", e.target.value)} className={inputCls} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted">الاسم (إنجليزي)</label>
              <input value={form.name_en} onChange={(e) => set("name_en", e.target.value)} className={inputCls} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted">الموديل</label>
              <input value={form.model} onChange={(e) => set("model", e.target.value)} className={inputCls} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted">الحالة</label>
              <select value={form.status} onChange={(e) => set("status", e.target.value)} className={inputCls}>
                <option value="draft">مسودة</option>
                <option value="active">نشط</option>
                <option value="archived">مؤرشف</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted">العلامة التجارية *</label>
              <select required value={form.brand} onChange={(e) => set("brand", e.target.value)} className={inputCls}>
                <option value="">اختر...</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted">التصنيف *</label>
              <select required value={form.category} onChange={(e) => set("category", e.target.value)} className={inputCls}>
                <option value="">اختر...</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name_ar}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted">الوصف</label>
            <textarea rows={4} value={form.description} onChange={(e) => set("description", e.target.value)} className={inputCls} />
          </div>
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-2 text-text">
              <input type="checkbox" checked={form.is_featured} onChange={(e) => set("is_featured", e.target.checked)} />
              مميز
            </label>
            <label className="flex items-center gap-2 text-text">
              <input type="checkbox" checked={form.is_best_seller} onChange={(e) => set("is_best_seller", e.target.checked)} />
              الأكثر مبيعاً
            </label>
            <label className="flex items-center gap-2 text-text">
              <input type="checkbox" checked={form.noise_cancellation} onChange={(e) => set("noise_cancellation", e.target.checked)} />
              عزل ضوضاء
            </label>
          </div>
        </div>

        <div className="card-premium flex flex-col gap-4 p-5">
          <h2 className="font-bold text-text">المواصفات التقنية</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted">عمر البطارية (ساعات)</label>
              <input type="number" value={form.battery_life_hours} onChange={(e) => set("battery_life_hours", e.target.value)} className={inputCls} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted">نوع الشحن</label>
              <input value={form.charging_type} onChange={(e) => set("charging_type", e.target.value)} className={inputCls} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted">بلوتوث</label>
              <input value={form.bluetooth_version} onChange={(e) => set("bluetooth_version", e.target.value)} className={inputCls} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted">مقاومة الماء</label>
              <input value={form.water_resistance} onChange={(e) => set("water_resistance", e.target.value)} className={inputCls} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted">الضمان (أشهر)</label>
              <input type="number" value={form.warranty_months} onChange={(e) => set("warranty_months", e.target.value)} className={inputCls} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted">SEO Title</label>
              <input value={form.seo_title} onChange={(e) => set("seo_title", e.target.value)} className={inputCls} />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted">مكونات الصندوق</label>
            <textarea rows={3} value={form.box_contents} onChange={(e) => set("box_contents", e.target.value)} className={inputCls} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted">SEO Description</label>
            <textarea rows={2} value={form.seo_description} onChange={(e) => set("seo_description", e.target.value)} className={inputCls} />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="mt-auto rounded-lg bg-gold px-4 py-2.5 text-sm font-bold text-bg-base transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "جارٍ الحفظ..." : "حفظ المنتج"}
          </button>
        </div>
      </form>

      {!isNew && (
        <div className="card-premium p-5">
          <h2 className="mb-3 font-bold text-text">الأنواع والمخزون</h2>
          {variants.length === 0 ? (
            <p className="text-sm text-muted">لا توجد أنواع بعد</p>
          ) : (
            <div className="mb-4 flex flex-col divide-y divide-line/60">
              {variants.map((v) => (
                <div key={v.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-5 w-5 rounded-full ring-1 ring-line"
                      style={{ backgroundColor: v.color_hex || "#ccc" }}
                    />
                    <span className="text-text">{v.color}</span>
                    <span className="font-mono text-xs text-muted">{v.sku}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-muted">{formatEGP(v.price)}</span>
                    <span className="text-xs text-muted">متاح {v.stock - v.reserved_quantity}</span>
                    <input
                      type="number"
                      defaultValue={v.stock}
                      onBlur={(e) => {
                        const val = e.target.value;
                        if (val !== "" && Number(val) !== v.stock) updateVariant(v, val);
                      }}
                      className="w-20 rounded-lg border border-line bg-bg-card px-2 py-1 text-sm text-text outline-none focus:border-gold/50"
                    />
                    <button
                      onClick={() => deleteVariant(v)}
                      className="rounded-lg bg-danger/15 px-3 py-1 text-xs font-bold text-danger ring-1 ring-danger/30"
                    >
                      حذف
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="flex flex-wrap items-end gap-2">
            <input value={nv.color} onChange={(e) => setNv({ ...nv, color: e.target.value })} placeholder="اللون" className={inputCls + " w-32"} />
            <input value={nv.color_hex} onChange={(e) => setNv({ ...nv, color_hex: e.target.value })} placeholder="#hex" className={inputCls + " w-24"} />
            <input value={nv.sku} onChange={(e) => setNv({ ...nv, sku: e.target.value })} placeholder="SKU" className={inputCls + " w-32"} />
            <input type="number" value={nv.price} onChange={(e) => setNv({ ...nv, price: e.target.value })} placeholder="السعر" className={inputCls + " w-24"} />
            <input type="number" value={nv.compare_at_price} onChange={(e) => setNv({ ...nv, compare_at_price: e.target.value })} placeholder="قبل الخصم" className={inputCls + " w-24"} />
            <input type="number" value={nv.stock} onChange={(e) => setNv({ ...nv, stock: e.target.value })} placeholder="المخزون" className={inputCls + " w-20"} />
            <button
              onClick={addVariant}
              disabled={busy}
              className="rounded-lg bg-gold px-4 py-2 text-sm font-bold text-bg-base disabled:opacity-50"
            >
              إضافة نوع
            </button>
          </div>
        </div>
      )}

      {!isNew && (
        <div className="card-premium p-5">
          <h2 className="mb-3 font-bold text-text">الصور</h2>
          {images.length === 0 ? (
            <p className="mb-4 text-sm text-muted">لا توجد صور بعد</p>
          ) : (
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6">
              {images.map((img) => (
                <div key={img.id} className="group relative overflow-hidden rounded-lg border border-line">
                  <img
                    src={img.image_url ?? ""}
                    alt={img.alt}
                    className="aspect-square h-full w-full object-cover"
                  />
                  <button
                    onClick={() => deleteImage(img)}
                    className="absolute top-1 left-1 rounded-md bg-danger/90 px-2 py-1 text-[10px] font-bold text-white opacity-0 transition group-hover:opacity-100"
                  >
                    حذف
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex flex-wrap items-end gap-2">
            <input ref={imageFileRef} type="file" accept="image/*" className={inputCls + " w-56"} />
            <input
              value={imageAlt}
              onChange={(e) => setImageAlt(e.target.value)}
              placeholder="وصف الصورة (alt)"
              className={inputCls + " w-56"}
            />
            <button
              onClick={uploadImage}
              disabled={imageBusy}
              className="rounded-lg bg-gold px-4 py-2 text-sm font-bold text-bg-base disabled:opacity-50"
            >
              {imageBusy ? "جارٍ الرفع..." : "رفع صورة"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}