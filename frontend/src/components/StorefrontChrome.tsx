"use client";

import { usePathname } from "next/navigation";
import Header from "./Header";
import ChatWidget from "./ChatWidget";

export default function StorefrontChrome() {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return null;
  return (
    <>
      <Header />
      <ChatWidget />
    </>
  );
}
