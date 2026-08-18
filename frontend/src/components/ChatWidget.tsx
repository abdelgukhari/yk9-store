"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { ChatMessageType } from "@/lib/types";
import { AiChatIcon, CloseIcon } from "./icons";

const QUICK = ["محتاج توصية سماعة", "أرخص شاحن متوفر", "ما هو الضمان؟"];

type ProductSource = {
  type?: "product";
  slug?: string;
  title?: string;
  price?: string;
};

function formatEGP(value?: string | number) {
  if (value === undefined || value === null || value === "") return "";
  return `${Number(value).toLocaleString("ar-EG")} ج.م`;
}

function stripMd(text: string) {
  return text.replace(/^\s{0,3}#{1,6}\s+/gm, "").replace(/\*\*/g, "");
}

function formatContent(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const linkRe = /\[([^\]]+)\]\((\/[^)\s]+)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = linkRe.exec(text))) {
    if (m.index > last)
      parts.push(<span key={key++}>{stripMd(text.slice(last, m.index))}</span>);
    parts.push(
      <Link key={key++} href={m[2]} className="font-bold text-gold underline">
        {m[1]}
      </Link>,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length)
    parts.push(<span key={key++}>{stripMd(text.slice(last))}</span>);
  return parts;
}

function SuggestionChips({ sources }: { sources: ProductSource[] }) {
  const products = sources.filter((s) => s.type === "product");
  if (products.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {products.slice(0, 3).map((p) => (
        <Link
          key={p.slug}
          href={`/products/${p.slug}`}
          className="rounded-full bg-gold/10 px-2.5 py-1 text-[11px] font-bold text-gold ring-1 ring-gold/25 transition hover:bg-gold/20"
        >
          {p.title}
          {p.price ? ` · ${formatEGP(p.price)}` : ""}
        </Link>
      ))}
    </div>
  );
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("yk9-open-chat", handler);
    return () => window.removeEventListener("yk9-open-chat", handler);
  }, []);

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || busy) return;
    setInput("");
    setMessages((m) => [
      ...m,
      { id: Date.now(), role: "user", content, sources: [], created_at: "" },
    ]);
    setBusy(true);
    try {
      const res = await api<{
        session_id: number;
        message: ChatMessageType;
        history: ChatMessageType[];
      }>("/api/ai/chat/", {
        method: "POST",
        body: JSON.stringify({ message: content, session_id: sessionId }),
      });
      setSessionId(res.session_id);
      setMessages(res.history);
    } catch (e) {
      setMessages((m) => [
        ...m,
        {
          id: Date.now(),
          role: "assistant",
          content: e instanceof Error ? e.message : "حدث خطأ، حاول مرة أخرى",
          sources: [],
          created_at: "",
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed bottom-5 left-5 z-50">
      {open && (
        <div className="card-premium mb-3 flex h-[26rem] w-[20rem] flex-col overflow-hidden sm:w-[22rem]">
          <div className="flex items-center justify-between border-b border-line bg-bg-raised px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-success" />
              <span className="font-bold">مساعد YK9</span>
            </div>
            <button onClick={() => setOpen(false)} aria-label="إغلاق">
              <CloseIcon className="h-5 w-5 text-muted" />
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-bg-raised px-3 py-2 text-sm">
              أهلًا بك في YK9 👋 اسألني عن المنتجات، الأسعار، الشحن، الدفع أو الضمان.
            </div>
            {messages.map((m) => (
              <div
                key={m.id}
                className={
                  m.role === "user"
                    ? "ml-auto max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-tl-sm bg-gold px-3 py-2 text-sm font-medium text-black"
                    : "max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-tr-sm bg-bg-raised px-3 py-2 text-sm"
                }
              >
                {m.role === "assistant" ? formatContent(m.content) : m.content}
                {m.role === "assistant" && <SuggestionChips sources={m.sources || []} />}
              </div>
            ))}
            {busy && <div className="text-xs text-muted">يكتب...</div>}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-line p-2">
            <div className="mb-2 flex flex-wrap gap-1.5">
              {QUICK.map((q) => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  className="rounded-full border border-line px-2.5 py-1 text-[11px] text-muted transition hover:border-gold hover:text-gold"
                >
                  {q}
                </button>
              ))}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="flex gap-2"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="اكتب سؤالك..."
                className="w-full rounded-lg border border-line bg-bg-card px-3 py-2 text-sm outline-none focus:border-gold"
              />
              <button
                type="submit"
                disabled={busy}
                className="rounded-lg bg-gold px-3 py-2 text-sm font-bold text-black disabled:opacity-50"
              >
                إرسال
              </button>
            </form>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-gold text-black shadow-lg transition hover:scale-105"
        aria-label="مساعدة"
      >
        {open ? (
          <CloseIcon className="h-6 w-6" />
        ) : (
          <AiChatIcon className="h-7 w-7" />
        )}
      </button>
    </div>
  );
}
