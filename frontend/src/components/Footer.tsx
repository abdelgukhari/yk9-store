import Link from "next/link";
import Image from "next/image";
import { WhatsAppIcon } from "./icons";

const PAYMENT_BADGES = ["الدفع عند الاستلام", "فودافون كاش", "تحويل بنكي"];

export default function Footer() {
  return (
    <footer className="mt-auto w-full border-t border-line bg-bg-card">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <Image
              src="/brand/yk9-logo.png"
              alt="YK9"
              width={34}
              height={34}
              className="rounded-lg object-contain"
            />
            <span className="text-2xl font-extrabold gold-gradient-text">YK9</span>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            متجر مصري متخصص في السماعات اللاسلكية والشواحن وإكسسوارات الموبايل.
            منتجات أصلية بضمان حقيقي وشحن سريع لكل محافظات مصر.
          </p>
          <div className="mt-4 flex gap-2">
            <a
              href="https://wa.me/201037839725"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="واتساب"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#25d366]/15 text-[#25d366] ring-1 ring-[#25d366]/25 transition hover:bg-[#25d366]/25"
            >
              <WhatsAppIcon className="h-5 w-5" />
            </a>
            <a
              href="tel:01037839725"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-bg-raised text-muted ring-1 ring-line transition hover:text-gold hover:ring-gold"
              aria-label="اتصل بنا"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
            </a>
          </div>
        </div>

        <div>
          <h3 className="mb-4 font-extrabold text-text">تسوق</h3>
          <ul className="space-y-2.5 text-sm text-muted">
            <li><Link href="/products" className="transition hover:text-gold">كل المنتجات</Link></li>
            <li><Link href="/products/?category=wireless-audio" className="transition hover:text-gold">سماعات لاسلكية</Link></li>
            <li><Link href="/products/?category=chargers" className="transition hover:text-gold">شواحن</Link></li>
            <li><Link href="/products/?category=mobile-accessories" className="transition hover:text-gold">إكسسوارات موبايل</Link></li>
            <li><Link href="/products?sort=new" className="transition hover:text-gold">وصل حديثًا</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="mb-4 font-extrabold text-text">خدمة العملاء</h3>
          <ul className="space-y-2.5 text-sm text-muted">
            <li><Link href="/track" className="transition hover:text-gold">تتبع طلبك</Link></li>
            <li><Link href="/cart" className="transition hover:text-gold">سلة المشتريات</Link></li>
            <li><Link href="/wishlist" className="transition hover:text-gold">المفضلة</Link></li>
            <li><Link href="/account" className="transition hover:text-gold">حسابي</Link></li>
            <li><Link href="/login" className="transition hover:text-gold">تسجيل الدخول</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="mb-4 font-extrabold text-text">تواصل معنا</h3>
          <p className="text-sm text-muted">فريقنا جاهز لمساعدتك يوميًا من ١٠ص حتى ١٢م.</p>
          <a
            href="https://wa.me/201037839725"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#25d366]/15 px-4 py-2.5 text-sm font-bold text-[#25d366] transition hover:bg-[#25d366]/25"
          >
            <WhatsAppIcon className="h-5 w-5" />
            تواصل عبر واتساب
          </a>
          <p className="mt-3 text-sm font-bold text-text" dir="ltr">01037839725</p>

          <h4 className="mt-5 mb-2 text-xs font-bold uppercase tracking-wider text-muted">
            وسائل الدفع
          </h4>
          <div className="flex flex-wrap gap-2">
            {PAYMENT_BADGES.map((p) => (
              <span key={p} className="rounded-lg bg-bg-raised px-2.5 py-1 text-[11px] font-bold text-muted ring-1 ring-line">
                {p}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-4 text-center text-xs text-muted sm:flex-row">
          <div>© {new Date().getFullYear()} YK9 — جميع الحقوق محفوظة</div>
          <div className="flex items-center gap-4">
            <Link href="/track" className="transition hover:text-gold">تتبع</Link>
            <Link href="/products" className="transition hover:text-gold">المتجر</Link>
            <Link href="/admin/login" className="transition hover:text-gold">لوحة التحكم</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}