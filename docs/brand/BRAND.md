# YK9 Brand & Design System

## Identity
- Slogan: **Powering What Moves You**
- Style: technical, premium, youthful, dark.
- Language: Arabic (RTL) primary; English accents for technical terms.

## Colors (Tailwind tokens in `frontend/src/app/globals.css`)
| Token | Value | Usage |
|---|---|---|
| `bg-base` | `#0A0A0B` | page background |
| `bg-card` | `#121214` | product cards / panels |
| `bg-raised` | `#1A1A1E` | hover/raised surfaces |
| `gold` | `#D4AF37` | primary CTAs, prices, offers, important elements |
| `gold-light` | `#F2D98D` | glow highlights, gradient text |
| `electric` | `#1E90FF` | technical accents, Soundcore-related elements |
| `text` | `#FFFFFF` | primary text |
| `muted` | `#9CA3AF` | secondary text |
| `line` | `#2A2A30` | borders |

## Typography
- Arabic: **Cairo** (400–900), loaded via `next/font/google`.
- Technical English: **Space Grotesk** (`font-space`).

## Logo — IMPORTANT RULE
- Use the original image `frontend/public/brand/yk9-logo.png` (supplied by the owner).
- Never recreate the logo in CSS or text.
- Keep original aspect ratio; the header renders the image at natural ratio.
- The current file is a **temporary neutral placeholder** (dark background + gold accent, no text) to be replaced by the real logo.

## Components
- `.card-premium` — product card with subtle illuminated border on hover.
- `.glow-gold` / `.glow-blue` — restrained brand glow.
- `.gold-gradient-text` — gold gradient for headings/offers.

## Principles
- Mobile-first (most Egyptian customers).
- Readability: never place large text over busy backgrounds.
- Consistent glow, no visual noise; gold reserved for conversion elements.