import { z } from 'zod'

import type { Rule, RuleContext, RuleListeners } from '../../core/index.js'

const DEFAULT_MAX_PROPS = 7

const optionsSchema = z.object({
  maxProps: z.number().int().positive().default(DEFAULT_MAX_PROPS),
})

type Options = z.infer<typeof optionsSchema>

function getOptions(raw: Record<string, unknown>): Options {
  const result = optionsSchema.safeParse(raw)
  return result.success ? result.data : optionsSchema.parse({})
}

interface JSXOpeningElement {
  attributes: unknown[]
  loc?: { end: { column: number; line: number; }; start: { column: number; line: number; }; }
  name: unknown
  type: 'JSXOpeningElement'
}

function isJSXOpeningElement(node: unknown): node is JSXOpeningElement {
  return (node as { type?: string }).type === 'JSXOpeningElement'
}

export const tooManyProps: Rule = {
  create(ctx: RuleContext): RuleListeners {
    const { maxProps } = getOptions(ctx.options)

    return {
      JSXOpeningElement(node) {
        if (!isJSXOpeningElement(node)) return
        const count = node.attributes.length
        if (count > maxProps && node.loc) {
          ctx.report({
            message: `Component has ${count} props (max: ${maxProps}). Consider grouping related props into an object or breaking the component apart.`,
            range: {
              end: { column: node.loc.end.column, line: node.loc.end.line },
              start: { column: node.loc.start.column, line: node.loc.start.line },
            },
            suggestion: `Group related props into a single object prop (e.g., { config, style, handlers }) to reduce the prop count below ${maxProps}.`,
          })
        }
      },
    }
  },
  meta: {
    category: 'maintainability',
    defaultSeverity: 'warning',
    description: 'React components should not receive more props than the threshold.',
    docsUrl: 'docs/rules/react/too-many-props.md',
    id: 'react/too-many-props',
    title: 'Too Many Props',
  },
  optionsSchema,
}
