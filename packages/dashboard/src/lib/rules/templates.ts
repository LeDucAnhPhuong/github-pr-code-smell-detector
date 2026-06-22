/** Starter custom-rule templates (plan 03) so the rules area is never empty. */

export interface RuleTemplate {
  name: string;
  markdown: string;
}

export const STARTER_TEMPLATES: RuleTemplate[] = [
  {
    name: "No DB access in UI",
    markdown: `---
title: No direct DB access in UI components
severity: error
appliesTo:
  - "src/ui/**"
  - "**/*.tsx"
---

Components in \`src/ui\` must not call the database / Prisma directly.
All data access must go through the service layer in \`src/services\`.

**Why:** separation of concerns, easier testing, avoids side-effects in render.
**Example violation:** \`await prisma.user.findMany()\` inside a component.
`,
  },
  {
    name: "Require error handling on fetch",
    markdown: `---
title: Network calls must handle errors
severity: warning
appliesTo:
  - "**/*.ts"
  - "**/*.tsx"
---

Every \`fetch\`/HTTP call must handle failure (try/catch or \`.catch\`) and surface
a meaningful error to the caller. No silent swallowing.

**Why:** unhandled network failures cause broken UI states and hard-to-debug bugs.
`,
  },
  {
    name: "No console.log in production code",
    markdown: `---
title: No console.log in committed code
severity: info
appliesTo:
  - "src/**"
---

Remove \`console.log\` before merging. Use the project logger for intentional output.

**Why:** noisy logs leak into production and clutter output.
`,
  },
];
