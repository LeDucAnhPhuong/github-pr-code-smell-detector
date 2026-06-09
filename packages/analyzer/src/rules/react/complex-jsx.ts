import { z } from 'zod'

import type { Rule, RuleContext, RuleListeners } from '../../core/index.js'

const DEFAULT_MAX_DEPTH = 5

const optionsSchema = z.object({
  maxDepth: z.number().int().positive().default(DEFAULT_MAX_DEPTH),
})

type Options = z.infer<typeof optionsSchema>

function getOptions(raw: Record<string, unknown>): Options {
  const result = optionsSchema.safeParse(raw)
  return result.success ? result.data : optionsSchema.parse({})
}

interface JSXElement {
  loc?: { end: { column: number; line: number; }; start: { column: number; line: number; }; }
  type: 'JSXElement'
}

function isJSXElement(node: unknown): node is JSXElement {
  return (node as { type?: string }).type === 'JSXElement'
}

function getJSXDepth(node: unknown, maxChecked = 20): number {
  if (!isJSXElement(node)) return 0
  const n = node as { children?: unknown[] }
  let maxChildDepth = 0
  if (maxChecked > 0) {
    for (const child of n.children ?? []) {
      const childDepth = getJSXDepth(child, maxChecked - 1)
      if (childDepth > maxChildDepth) maxChildDepth = childDepth
    }
  }

  return 1 + maxChildDepth
}

export const complexJsx: Rule = {
  create(ctx: RuleContext): RuleListeners {
    const { maxDepth } = getOptions(ctx.options)
    const reported = new WeakSet<object>()

    return {
      JSXElement(node) {
        if (!isJSXElement(node)) return
        const nodeObj = node as object
        if (reported.has(nodeObj)) return

        const depth = getJSXDepth(node)
        if (depth > maxDepth && node.loc) {
          reported.add(nodeObj)
          ctx.report({
            message: `JSX nesting depth is ${depth} (max: ${maxDepth}). Deeply nested JSX is hard to read and maintain.`,
            range: {
              end: { column: node.loc.end.column, line: node.loc.end.line },
              start: { column: node.loc.start.column, line: node.loc.start.line },
            },
            suggestion: `Extract the deeply nested sections into separate components. Each component should ideally render JSX that is no deeper than ${maxDepth} levels.`,
          })
        }
      },
    }
  },
  meta: {
    category: 'maintainability',
    defaultSeverity: 'warning',
    description: 'JSX structures should not be nested too deeply.',
    docsUrl: 'docs/rules/react/complex-jsx.md',
    id: 'react/complex-jsx',
    title: 'Complex JSX',
  },
  optionsSchema,
}
