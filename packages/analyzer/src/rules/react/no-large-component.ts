import { z } from 'zod'

import type { Rule, RuleContext, RuleListeners } from '../../core/index.js'

const DEFAULT_MAX_LINES = 150

const optionsSchema = z.object({
  maxLines: z.number().int().positive().default(DEFAULT_MAX_LINES),
})

type Options = z.infer<typeof optionsSchema>

function getOptions(raw: Record<string, unknown>): Options {
  const result = optionsSchema.safeParse(raw)
  return result.success ? result.data : optionsSchema.parse({})
}

export const noLargeComponent: Rule = {
  create(ctx: RuleContext): RuleListeners {
    const { maxLines } = getOptions(ctx.options)

    function checkComponent(node: unknown): void {
      const n = node as {
        loc?: { end: { column: number; line: number; }; start: { column: number; line: number; }; }
      }
      if (!n.loc) return

      const lineCount = n.loc.end.line - n.loc.start.line + 1
      if (lineCount > maxLines) {
        ctx.report({
          message: `Component has ${lineCount} lines (max: ${maxLines}). Consider splitting it into smaller components.`,
          range: {
            end: { column: n.loc.end.column, line: n.loc.end.line },
            start: { column: n.loc.start.column, line: n.loc.start.line },
          },
          suggestion: `Extract logical sections into separate components or custom hooks to keep each component under ${maxLines} lines.`,
        })
      }
    }

    return {
      ArrowFunctionExpression: checkComponent,
      FunctionDeclaration: checkComponent,
      FunctionExpression: checkComponent,
    }
  },
  meta: {
    category: 'maintainability',
    defaultSeverity: 'warning',
    description: 'React components should not exceed the maximum line threshold.',
    docsUrl: 'docs/rules/react/no-large-component.md',
    id: 'react/no-large-component',
    title: 'No Large Component',
  },
  optionsSchema,
}
