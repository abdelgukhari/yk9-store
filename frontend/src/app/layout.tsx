import type { Metadata } from "next";
import { Cairo, Space_Grotesk } from "next/font/google";
import { AppProvider, Toast } from "@/lib/app-context";
import StorefrontChrome from "@/components/StorefrontChrome";
import StorefrontFooter from "@/components/StorefrontFooter";
import "./globals.css";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "YK9 | صوت بلا حدود",
    template: "%s | YK9",
  },
  description:
    "YK9 - متجر متخصص في السماعات اللاسلكية، الشواحن، وإكسسوارات الموبايل في مصر. شحن لجميع المحافظات والدفع عند الاستلام.",
  keywords: [
    "سماعات",
    "wireless audio",
    "شواحن",
    "إكسسوارات موبايل",
    "Egypt",
    "مصر",
  ],
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    locale: "ar_EG",
    siteName: "YK9",
    title: "YK9 | صوت بلا حدود",
    description:
      "سماعات وشواحن وإكسسوارات موبايل أصلية في مصر. Powering What Moves You.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${cairo.variable} ${spaceGrotesk.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AppProvider>
          <Toast />
          <StorefrontChrome />
          <main className="flex-1">{children}</main>
          <StorefrontFooter />
        </AppProvider>
      </body>
    </html>
  );
}