"use client";

type Props = {
  imageUrl?: string | null;
  alt?: string;
  className?: string;
};

export default function ProductImage({ imageUrl, alt = "", className = "" }: Props) {
  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={imageUrl} alt={alt} className={`h-full w-full object-cover ${className}`} />
    );
  }
  return (
    <div className={`flex h-full w-full items-center justify-center bg-gradient-to-br from-bg-raised via-bg-card to-[#0f0f13] ${className}`}>
      <div className="flex flex-col items-center gap-2 text-center">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-14 w-14 text-gold/50" aria-hidden="true">
          <path d="M3 14l4-4 3 3 4-5 5 6" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="9" cy="8" r="1.5" fill="currentColor" stroke="none" />
          <rect x="3" y="3" width="18" height="18" rx="3" />
        </svg>
        <span className="text-xs font-bold tracking-widest text-muted">YK9</span>
      </div>
    </div>
  );
}
