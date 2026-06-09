import { z } from 'zod'

import type { Rule, RuleContext, RuleListeners } from '../../core/index.js'

const DEFAULT_MAX_INLINE = 3

const optionsSchema = z.object({
  maxInline: z.number().int().positive().default(DEFAULT_MAX_INLINE),
})

type Options = z.infer<typeof optionsSchema>

function getOptions(raw: Record<string, unknown>): Options {
  const result = optionsSchema.safeParse(raw)
  return result.success ? result.data : optionsSchema.parse({})
}

interface JSXOpeningElement {
  attributes: unknown[]
  loc?: { end: { column: number; line: number; }; start: { column: number; line: number; }; }
  type: 'JSXOpeningElement'
}

interface JSXAttribute {
  type: 'JSXAttribute'
  value?: { expression?: { type?: string }; type?: string; }
}

function isJSXOpeningElement(node: unknown): node is JSXOpeningElement {
  return (node as { type?: string }).type === 'JSXOpeningElement'
}

function isJSXAttribute(node: unknown): node is JSXAttribute {
  return (node as { type?: string }).type === 'JSXAttribute'
}

function isInlineArrow(attr: unknown): boolean {
  if (!isJSXAttribute(attr)) return false
  const val = attr.value
  if (!val) return false
  // { () => ... } or { function() { ... } }
  if (val.type === 'JSXExpressionContainer') {
    const expr = val.expression
    if (
      expr?.type === 'ArrowFunctionExpression' ||
      expr?.type === 'FunctionExpression'
    ) {
      return true
    }
  }

  return false
}

export const inlineFunctionOveruse: Rule = {
  create(ctx: RuleContext): RuleListeners {
    const { maxInline } = getOptions(ctx.options)

    return {
      JSXOpeningElement(node) {
        if (!isJSXOpeningElement(node)) return
        const inlineCount = node.attributes.filter((a) => isInlineArrow(a)).length
        if (inlineCount > maxInline && node.loc) {
          ctx.report({
            message: `JSX element has ${inlineCount} inline function props (max: ${maxInline}). Inline functions re-create on every render and hurt readability.`,
            range: {
              end: { column: node.loc.end.column, line: node.loc.end.line },
              start: { column: node.loc.start.column, line: node.loc.start.line },
            },
            suggestion: `Extract inline functions to named handler variables (e.g., const handleClick = () => ...) defined outside the JSX. This improves readability and avoids unnecessary re-renders.`,
          })
        }
      },
    }
  },
  meta: {
    category: 'maintainability',
    defaultSeverity: 'warning',
    description: 'JSX elements should not have too many inline arrow functions in props.',
    docsUrl: 'docs/rules/react/inline-function-overuse.md',
    id: 'react/inline-function-overuse',
    title: 'Inline Function Overuse',
  },
  optionsSchema,
}
