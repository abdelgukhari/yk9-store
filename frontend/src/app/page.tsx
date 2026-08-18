"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { api } from "@/lib/api";
import type { Product } from "@/lib/types";
import ProductCard from "@/components/ProductCard";
import {
  BatteryIcon,
  CheckIcon,
  PyramidIcon,
  ShieldIcon,
  TruckIcon,
  WalletIcon,
} from "@/components/icons";

const TRUST = [
  { icon: TruckIcon, title: "شحن لجميع المحافظات", sub: "يصلك خلال 1-4 أيام" },
  { icon: WalletIcon, title: "الدفع عند الاستلام", sub: "أو فودافون كاش" },
  { icon: ShieldIcon, title: "ضمان حقيقي", sub: "منتجات أصلية 100%" },
  { icon: BatteryIcon, title: "استرجاع خلال 14 يوم", sub: "بدون أسئلة" },
];

const CATEGORY_TILES = [
  { slug: "wireless-audio", name: "سماعات لاسلكية", img: "/categories/earbuds.jpg", tag: "الأكثر مبيعًا" },
  { slug: "chargers", name: "شواحن سريعة", img: "/categories/chargers.jpg", tag: "خصم حتى 40%" },
  { slug: "mobile-accessories", name: "إكسسوارات موبايل", img: "/categories/accessories.jpg", tag: "كل ما تحتاج" },
  { slug: "smart-watches", name: "ساعات ذكية", img: "/categories/watches.jpg", tag: "جديد" },
  { slug: "audio-speakers", name: "سماعات وسبيكرز", img: "/categories/speakers.jpg", tag: "صوت قوي" },
];

const BANNERS = [
  {
    href: "/products/?category=wireless-audio",
    img: "/marketing/banner-sound.jpg",
    badge: "صوت بلا حدود",
    title: "سماعات تضعك في قلب الحدث",
    sub: "عزل ضوضاء • بطارية تدوم لأيام",
    cta: "اكتشف السماعات",
    accent: "from-[#1e90ff]/70",
  },
  {
    href: "/products/?category=chargers",
    img: "/marketing/banner-power.jpg",
    badge: "شحن فائق السرعة",
    title: "شواحن تشحن يومك بالكامل",
    sub: "من 0 إلى 80% في دقائق",
    cta: "اشحن أسرع",
    accent: "from-[#d4af37]/70",
  },
  {
    href: "/products/?category=mobile-accessories",
    img: "/marketing/banner-smart.jpg",
    badge: "أسلوبك الذكي",
    title: "إكسسوارات تجمع الأناقة بالتقنية",
    sub: "ساعات • كابلات • حوامل موبايل",
    cta: "تصفح الإكسسوارات",
    accent: "from-[#a07d1f]/70",
  },
];

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/4 h-96 w-96 rounded-full bg-gold/15 blur-3xl" />
        <div className="absolute -bottom-40 right-1/4 h-[28rem] w-[28rem] rounded-full bg-electric/15 blur-3xl" />
      </div>

      <div className="relative mx-auto grid max-w-7xl items-center gap-8 px-4 pb-8 pt-10 md:grid-cols-2 md:pt-16">
        <div className="text-center md:text-right">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-xs font-bold text-gold">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gold" />
            عروض هذا الأسبوع — خصومات حتى ٤٠٪
          </span>
          <h1 className="mt-5 text-4xl font-black leading-tight sm:text-5xl md:text-6xl">
            كل حاجة في الإلكترونيات،
            <br />
            <span className="gold-gradient-text">في مكان واحد.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-muted md:mx-0 md:text-lg">
            سماعات لاسلكية، شواحن سريعة، وإكسسوارات موبايل أصلية بضمان حقيقي —
            تصلك أينما كنت في مصر خلال 1-4 أيام.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3 md:justify-start">
            <Link
              href="/products"
              className="rounded-xl bg-gold px-7 py-3.5 font-bold text-black shadow-lg shadow-gold/25 transition hover:-translate-y-0.5 hover:bg-gold-light"
            >
              تسوق الآن 🛍️
            </Link>
            <Link
              href="#featured"
              className="rounded-xl border border-line bg-bg-raised px-7 py-3.5 font-bold text-text transition hover:-translate-y-0.5 hover:border-gold hover:text-gold"
            >
              الأكثر تميزًا
            </Link>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted md:justify-start">
            <span className="flex items-center gap-1.5">
              <CheckIcon className="h-4 w-4 text-success" /> دفع عند الاستلام
            </span>
            <span className="flex items-center gap-1.5">
              <CheckIcon className="h-4 w-4 text-success" /> ضمان حقيقي
            </span>
            <span className="flex items-center gap-1.5">
              <CheckIcon className="h-4 w-4 text-success" /> استرجاع 14 يوم
            </span>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-md md:max-w-none">
          <div className="pointer-events-none absolute -top-3 -right-3 z-10 flex h-14 w-14 rotate-6 items-center justify-center rounded-2xl bg-gold/15 ring-1 ring-gold/30 backdrop-blur">
            <PyramidIcon className="h-7 w-7 text-gold" />
          </div>

          <div className="card-premium glow-gold relative overflow-hidden rounded-2xl p-1.5">
            <div className="relative overflow-hidden rounded-xl ring-1 ring-gold/20">
              <Image
                src="/marketing/hero-headphones.jpg"
                alt="سماعات لاسلكية YK9"
                width={1000}
                height={1000}
                priority
                className="aspect-square h-auto w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/5 to-transparent" />
              <div className="absolute bottom-4 right-4 left-4 flex items-end justify-between gap-2">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-gold">
                    YK9 Flagship
                  </div>
                  <div className="text-lg font-extrabold">تشكيلة الصوت الجديدة</div>
                </div>
                <Link
                  href="/products/?category=wireless-audio"
                  className="rounded-lg bg-gold px-4 py-2 text-xs font-bold text-black transition hover:bg-gold-light"
                >
                  تسوق الآن
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="card-premium flex items-center gap-2.5 rounded-xl px-3 py-2.5">
              <span className="text-lg">⚡</span>
              <div className="min-w-0 text-xs">
                <div className="truncate font-extrabold text-gold">شحن سريع</div>
                <div className="truncate text-muted">خلال 1-4 أيام</div>
              </div>
            </div>
            <div className="card-premium flex items-center gap-2.5 rounded-xl px-3 py-2.5">
              <span className="text-lg">🎧</span>
              <div className="min-w-0 text-xs">
                <div className="truncate font-extrabold text-gold">ضمان سنة</div>
                <div className="truncate text-muted">على كل المنتجات</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative border-t border-line bg-bg-card/60 backdrop-blur">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-4 py-6 md:grid-cols-4">
          {TRUST.map((t) => (
            <div key={t.title} className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold/10 ring-1 ring-gold/20">
                <t.icon className="h-5 w-5 text-gold" />
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-bold">{t.title}</div>
                <div className="truncate text-xs text-muted">{t.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CategoryTiles() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-10">
      <div className="mb-5 flex items-end justify-between">
        <h2 className="text-2xl font-extrabold">تسوق حسب الفئة</h2>
        <Link href="/products" className="text-sm text-muted transition hover:text-gold">
          عرض الكل ←
        </Link>
      </div>
      <div className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 md:grid md:grid-cols-5 md:overflow-visible">
        {CATEGORY_TILES.map((c) => (
          <Link
            key={c.slug}
            href={`/products/?category=${c.slug}`}
            className="group w-36 shrink-0 snap-start md:w-auto"
          >
            <div className="card-premium relative aspect-[4/5] overflow-hidden rounded-2xl">
              <Image
                src={c.img}
                alt={c.name}
                width={600}
                height={750}
                className="h-full w-full object-cover transition duration-300 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              <span className="absolute top-2 right-2 rounded-full bg-danger px-2 py-0.5 text-[10px] font-bold">
                {c.tag}
              </span>
              <span className="absolute bottom-2 right-2 left-2 text-sm font-extrabold drop-shadow">
                {c.name}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function MarketingBanners() {
  return (
    <section className="mx-auto max-w-7xl px-4 pb-4">
      <div className="grid gap-4 md:grid-cols-3">
        {BANNERS.map((b) => (
          <Link
            key={b.href}
            href={b.href}
            className="group relative h-64 overflow-hidden rounded-2xl md:h-72"
          >
            <Image
              src={b.img}
              alt={b.title}
              width={1200}
              height={800}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
            />
            <div
              className={`absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 ${b.accent} to-transparent`}
            />
            <div className="absolute inset-x-0 bottom-0 p-5">
              <span className="text-xs font-bold uppercase tracking-wider text-gold-light">
                {b.badge}
              </span>
              <h3 className="mt-1 text-xl font-extrabold drop-shadow">{b.title}</h3>
              <p className="mt-1 text-sm text-muted">{b.sub}</p>
              <span className="mt-3 inline-block rounded-lg bg-white/90 px-4 py-2 text-xs font-bold text-black transition group-hover:bg-gold">
                {b.cta} ←
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function FlashDeals() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-6">
      <Link
        href="/products"
        className="group relative flex h-44 items-center overflow-hidden rounded-2xl sm:h-52"
      >
        <Image
          src="/marketing/deals-sound.jpg"
          alt="عروض الأسبوع"
          width={1200}
          height={500}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-l from-black/85 via-black/40 to-transparent" />
        <div className="relative p-6 sm:p-10">
          <span className="rounded-full bg-danger px-3 py-1 text-xs font-bold">
            🔥 عروض محدودة
          </span>
          <h2 className="mt-3 text-2xl font-black sm:text-4xl">
            خصومات تصل إلى <span className="gold-gradient-text">٤٠٪</span>
          </h2>
          <p className="mt-1 text-sm text-muted">
            لفترة محدودة على تشكيلة الصوت والشحن — الكمية محدودة.
          </p>
          <span className="mt-4 inline-block rounded-lg bg-gold px-5 py-2.5 text-sm font-bold text-black transition group-hover:bg-gold-light">
            اغتنم العرض الآن
          </span>
        </div>
      </Link>
    </section>
  );
}

function WhyUs() {
  const points = [
    "منتجات أصلية 100% مع ضمان حقيقي حتى سنة",
    "شحن سريع لجميع محافظات مصر خلال 1-4 أيام",
    "ادفع كاش عند الاستلام أو فودافون كاش بسهولة",
    "استرجاع مجاني خلال 14 يوم بدون أي أسئلة",
  ];
  return (
    <section className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-10 md:grid-cols-2">
      <div className="card-premium order-2 overflow-hidden rounded-2xl md:order-1">
        <Image
          src="/marketing/banner-power.jpg"
          alt="لماذا YK9"
          width={1200}
          height={800}
          className="aspect-[4/3] h-auto w-full object-cover"
        />
      </div>
      <div className="order-1 md:order-2">
        <span className="text-xs font-bold uppercase tracking-wider text-gold">
          لماذا تختار YK9؟
        </span>
        <h2 className="mt-2 text-3xl font-black">
          تجربة تسوق <span className="gold-gradient-text">آمنة وممتعة</span> حتى باب بيتك
        </h2>
        <ul className="mt-6 space-y-4">
          {points.map((p) => (
            <li key={p} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold/15 ring-1 ring-gold/30">
                <CheckIcon className="h-4 w-4 text-gold" />
              </span>
              <span className="text-sm text-muted">{p}</span>
            </li>
          ))}
        </ul>
        <Link
          href="/products"
          className="mt-7 inline-block rounded-xl bg-gold px-6 py-3 font-bold text-black transition hover:-translate-y-0.5 hover:bg-gold-light"
        >
          ابدأ التسوق
        </Link>
      </div>
    </section>
  );
}

function Section({
  title,
  products,
  loading,
}: {
  title: string;
  products: Product[];
  loading: boolean;
}) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-8" id={title === "الأكثر تميزًا" ? "featured" : undefined}>
      <div className="mb-6 flex items-end justify-between">
        <h2 className="flex items-center gap-2 text-2xl font-extrabold">
          {title === "الأكثر مبيعًا" && <span>🏆</span>}
          {title}
        </h2>
        <Link href="/products" className="text-sm text-muted transition hover:text-gold">
          عرض الكل ←
        </Link>
      </div>
      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card-premium aspect-[3/4] animate-pulse" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <p className="text-muted">لا توجد منتجات حاليًا.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </section>
  );
}

function AssistantCta() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-10">
      <div className="card-premium relative overflow-hidden rounded-2xl p-8 text-center md:p-12">
        <div className="pointer-events-none absolute -top-24 right-1/3 h-64 w-64 rounded-full bg-gold/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-electric/15 blur-3xl" />
        <div className="relative">
          <span className="text-4xl">🤖</span>
          <h2 className="mt-3 text-2xl font-extrabold md:text-3xl">
            محتار تختار؟ <span className="gold-gradient-text">اسأل مساعد YK9</span>
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-muted">
            رشّحلك المنتج الأنسب حسب الميزانية والاستخدام، وأجب عن أسئلتك حول الشحن
            والدفع والضمان فورًا.
          </p>
          <button
            className="mt-6 rounded-xl bg-gold px-7 py-3 font-bold text-black transition hover:-translate-y-0.5 hover:bg-gold-light"
            onClick={() => window.dispatchEvent(new Event("yk9-open-chat"))}
          >
            ابدأ المحادثة
          </button>
        </div>
      </div>
    </section>
  );
}

export default function HomePage() {
  const [featured, setFeatured] = useState<Product[]>([]);
  const [best, setBest] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api<Product[]>("/api/catalog/products/featured/"),
      api<Product[]>("/api/catalog/products/best-sellers/"),
    ])
      .then(([f, b]) => {
        setFeatured(f);
        setBest(b);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <Hero />
      <CategoryTiles />
      <MarketingBanners />
      <FlashDeals />
      <Section title="الأكثر تميزًا" products={featured} loading={loading} />
      <WhyUs />
      <Section title="الأكثر مبيعًا" products={best} loading={loading} />
      <AssistantCta />
    </>
  );
}