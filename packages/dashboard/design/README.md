# Design library → Claude Design

A self-contained **component library** for the web app, built to push to
**claude.ai/design**, iterate visually with Claude, then port back to the Next.js
code.

Design system: **Mono-ink · Hairline** (Geist / Linear inspired). Full rationale
and the token spec are in **`DESIGN.md`**. The exact data each view may render —
**do not invent fields or features** — is in **`data-contract.md`**.

## Structure

```
design/
├── DESIGN.md          # the design-system decision + token spec
├── data-contract.md   # real API/Prisma fields per view  ← grounding rules
├── tokens.css         # single source of truth: CSS vars + the component CSS
├── components/        # one preview per primitive (= one Design card)
│   ├── buttons.html
│   ├── badges.html
│   ├── cards.html
│   ├── inputs.html
│   ├── table.html     # TanStack pattern: search · facets · sort · pager
│   └── sidebar.html
└── screens/
    ├── dashboard.html
    ├── repositories.html   # table with toolbar
    ├── findings.html       # toolbar table + detail
    └── login.html
```

Every preview's **first line** is a `<!-- @dsCard group="…" name="…" -->` marker —
that becomes a card in the Design System pane on claude.ai/design.

## Preview locally

Open any `.html` in a browser (they load `../tokens.css` relatively). No build.

## Two hard rules (carry these into Claude Design)

1. **No invented data or features.** Every column / filter / metric / badge must
   map to a field in `data-contract.md`. No trend %, charts, dates, assignees,
   labels, or columns the API doesn't return.
2. **Table toolbars are client-side.** Search / sort / faceted filter /
   pagination operate on rows already fetched by the existing query functions —
   they introduce no new endpoints or logic. (`getFindings` already accepts
   `severity` / `ruleId` / `filePath`-contains, so those facets are real.)

## Push to Claude Design

These previews feed the **`/design-sync`** skill (DesignSync tool → your
claude.ai login). From this `design/` folder:

1. Run **`/design-sync`** in Claude Code.
2. Pick or create a **design-system** project.
3. Review the plan (uploads `tokens.css`, `DESIGN.md`, `data-contract.md`,
   `components/*`, `screens/*`; registers a card per `@dsCard`). Approve.
4. Iterate on claude.ai/design ("tighten the findings table", "try dot status in
   the repo list"…). Pull refined versions back with `/design-sync`, one
   component at a time.

> First sync may prompt to add design-system access to your claude.ai login.

## Map back to the real app

`tokens.css` is the contract with `src/app/globals.css`. Port tokens first, then
per-component markup:

| Design file               | Real app file                                              |
|---------------------------|------------------------------------------------------------|
| `tokens.css`              | `src/app/globals.css`                                      |
| `components/badges.html`  | `src/components/findings/SeverityBadge.tsx` (+ status dots)|
| `components/cards.html`   | `MetricCard` in `src/app/(dashboard)/page.tsx`            |
| `components/inputs.html`  | `src/components/repositories/RepoConfigForm.tsx`         |
| `components/table.html`   | shared table + toolbar (new component) used by lists       |
| `components/sidebar.html` | `src/components/layout/Sidebar.tsx`                       |
| `screens/dashboard.html`  | `src/app/(dashboard)/page.tsx`                            |
| `screens/repositories.html`| `src/app/(dashboard)/repositories/page.tsx`             |
| `screens/findings.html`   | `.../pulls/[prId]/findings/page.tsx` + `[findingId]`     |
| `screens/login.html`      | `src/app/(auth)/login/page.tsx`                           |

**Note on tables:** the redesign introduces a reusable client table component
(toolbar + sortable header + pager). Recommended impl: **@tanstack/react-table**
for state (sorting / column filters / pagination / visibility) over the rows the
server already returns — no API change. Severity colours stay only in
`SeverityBadge.tsx`.
