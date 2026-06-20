---
name: Code Smell Detector — Web
system: Mono-ink · Hairline
references: [Vercel Geist, Linear, shadcn/ui, Tremor]
mode: light
colors:
  bg: '#FFFFFF'
  bg-subtle: '#FAFAFA'
  bg-hover: '#F5F5F5'
  border: '#EAEAEA'
  border-strong: '#DCDCDC'
  ink: '#171717'
  ink-2: '#525252'
  ink-3: '#8F8F8F'
  accent: '#171717'      # mono-black primary
  link: '#0067D6'        # used sparingly
  sev-high: '#B42318'
  sev-med: '#B54708'
  sev-low: '#1D4ED8'
  ok: '#067647'
  code-bg: '#F7F7F7'
typography:
  font-sans: Inter (Geist fallback)
  font-mono: Geist Mono / JetBrains Mono
  base:    { size: 13px, line: 1.55 }
  h1:      { size: 20px, weight: 600, tracking: -0.01em }
  h2:      { size: 13px, weight: 600 }
  eyebrow: { size: 11px, weight: 600, tracking: 0.05em, transform: uppercase }
  helper:  { size: 12px, weight: 400 }
radius: { sm: 4px, base: 6px, lg: 8px }
elevation:
  cards: border-only (no shadow)
  popovers/menus: 0 4px 24px rgba(0,0,0,.10)
layout: { sidebar: 240px, topbar: 48px, max-content: 1200px }
---

## The decision (read before touching Claude Design)

We are **replacing** the old GitHub-Primer look (blue, thick borders, card
shadows) with **"Mono-ink · Hairline"** — a thin, low-chrome system in the spirit
of **Vercel Geist + Linear**, with **shadcn/ui** table patterns and **Tremor**
data-display density.

Why: the brief was "thinner, sleeker, more taste, less AI-slop." That points away
from coloured gradients and soft drop-shadows toward:

- **Mono-ink primary.** The primary action is near-black `#171717`, not a brand
  blue. Blue (`#0067D6`) appears *only* on links and focus rings. This reads
  intentional and timeless instead of generic-SaaS.
- **Hairlines over shadows.** 1px `#EAEAEA` borders do the structural work; cards
  carry **no** shadow. Only floating things (menus, popovers) get one soft shadow.
- **Smaller everything.** 13px base, 20px page titles, 6px/4px radii, 32px control
  height, 28–40px row height. Sleek and dense without feeling cramped — pages
  breathe, tables stay tight.
- **Muted, semantic severity.** Severity washes are desaturated (rose/amber/blue)
  and always bordered. Status uses a Linear-style coloured dot + neutral text.

## Hard constraint — no invented data or features

Every column, filter, metric, and badge must map to a real field returned by the
API / Prisma schema. See **`data-contract.md`** for the exact field list per view.
The table toolbars (search / sort / faceted filter / pagination) operate
**client-side on already-fetched rows** — they add no new endpoints or logic.
Do not add "trend %", charts, dates, or columns that the response doesn't contain.

## Components (live previews in /components and /screens)

- **Buttons** — primary (black), secondary (white+hairline), ghost, danger; sm + icon.
- **Severity badges** — High/Med/Low muted washes (the only place severity colour lives).
- **Status** — dot + neutral text (Completed/Running/Failed/Pending; Connected).
- **Cards** — hairline border, no shadow; optional sunken header strip.
- **Inputs** — 32px, hairline, blue focus ring; switch, checkbox, select.
- **Data table (TanStack pattern)** — toolbar with global search, dashed
  faceted-filter buttons → removable chips, sortable sticky headers, column
  visibility ("View"), and a footer with row count + rows-per-page + pager.
- **Sidebar** — 240px, grouped nav (Overview / Configuration), quiet active state.

## Layout & UX

- App shell: 240px sidebar (subtle bg) + 48px topbar (breadcrumb + page actions +
  avatar) + scrolling content centred at max 1200px.
- One clear primary action per page, top-right of the page head.
- Tables own their controls in a toolbar; empty states are centred and quiet.
- Mobile: sidebar collapses, content single-column, tables can become list rows.
