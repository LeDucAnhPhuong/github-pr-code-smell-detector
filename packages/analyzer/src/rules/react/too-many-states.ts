import { z } from 'zod'

import type { Rule, RuleContext, RuleListeners } from '../../core/index.js'

const DEFAULT_MAX_STATES = 5

const optionsSchema = z.object({
  maxStates: z.number().int().positive().default(DEFAULT_MAX_STATES),
})

type Options = z.infer<typeof optionsSchema>

function getOptions(raw: Record<string, unknown>): Options {
  const result = optionsSchema.safeParse(raw)
  return result.success ? result.data : optionsSchema.parse({})
}

interface CallExpression {
  callee: {
    name?: string
    object?: { name?: string }
    property?: { name?: string }
    type: string
  }
  loc?: { end: { column: number; line: number; }; start: { column: number; line: number; }; }
  type: 'CallExpression'
}

interface FunctionLike {
  body?: unknown
  loc?: { end: { column: number; line: number; }; start: { column: number; line: number; }; }
  type: string
}

function isUseStateCall(node: unknown): node is CallExpression {
  const n = node as CallExpression
  if (n.type !== 'CallExpression') return false
  const {callee} = n
  if (callee.type === 'Identifier' && callee.name === 'useState') return true
  if (
    callee.type === 'MemberExpression' &&
    callee.property?.name === 'useState' &&
    callee.object?.name === 'React'
  )
    return true
  return false
}

export const tooManyStates: Rule = {
  create(ctx: RuleContext): RuleListeners {
    const { maxStates } = getOptions(ctx.options)

    // Track useState calls per function scope
    const stateCallsByScope: Map<unknown, CallExpression[]> = new Map()
    const scopeStack: unknown[] = []

    function enterScope(node: unknown) {
      scopeStack.push(node)
      stateCallsByScope.set(node, [])
    }

    function exitScope(node: unknown) {
      const calls = stateCallsByScope.get(node) ?? []
      if (calls.length > maxStates) {
        const fn = node as FunctionLike
        const {loc} = fn
        if (loc) {
          ctx.report({
            message: `Component uses ${calls.length} useState hooks (max: ${maxStates}). Consider consolidating state with useReducer or a custom hook.`,
            range: {
              end: { column: loc.end.column, line: loc.end.line },
              start: { column: loc.start.column, line: loc.start.line },
            },
            suggestion: `Move related state into a single useReducer call or extract state logic into a custom hook to reduce the number of useState calls below ${maxStates}.`,
          })
        }
      }

      stateCallsByScope.delete(node)
      scopeStack.pop()
    }

    return {
      ArrowFunctionExpression: enterScope,
      'ArrowFunctionExpression:exit': exitScope,
      CallExpression(node) {
        if (isUseStateCall(node) && scopeStack.length > 0) {
          const currentScope = scopeStack.at(-1)
          const calls = stateCallsByScope.get(currentScope)
          if (calls) calls.push(node as CallExpression)
        }
      },
      FunctionDeclaration: enterScope,
      'FunctionDeclaration:exit': exitScope,
      FunctionExpression: enterScope,
      'FunctionExpression:exit': exitScope,
    }
  },
  meta: {
    category: 'maintainability',
    defaultSeverity: 'warning',
    description: 'React components should not use too many useState hooks.',
    docsUrl: 'docs/rules/react/too-many-states.md',
    id: 'react/too-many-states',
    title: 'Too Many States',
  },
  optionsSchema,
}
