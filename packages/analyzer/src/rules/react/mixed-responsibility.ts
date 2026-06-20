import { z } from 'zod'

import type { Rule, RuleContext, RuleListeners } from '../../core/index.js'

const optionsSchema = z.object({})

function isIdentifier(node: unknown, name: string): boolean {
  const n = node as { name?: string; type?: string; }
  return n.type === 'Identifier' && n.name === name
}

function isMemberExpression(node: unknown, obj: string, prop: string): boolean {
  const n = node as { object?: unknown; property?: unknown; type?: string; }
  return (
    n.type === 'MemberExpression' &&
    isIdentifier(n.object, obj) &&
    isIdentifier(n.property, prop)
  )
}

interface CallExpression {
  callee: unknown
  loc?: { end: { column: number; line: number; }; start: { column: number; line: number; }; }
  type: 'CallExpression'
}

function isApiCall(node: unknown): node is CallExpression {
  const n = node as CallExpression
  if (n.type !== 'CallExpression') return false
  const {callee} = n
  if (isIdentifier(callee, 'fetch')) return true
  if (
    isMemberExpression(callee, 'axios', 'get') ||
    isMemberExpression(callee, 'axios', 'post') ||
    isMemberExpression(callee, 'axios', 'put') ||
    isMemberExpression(callee, 'axios', 'delete') ||
    isMemberExpression(callee, 'axios', 'patch')
  )
    return true
  return false
}

interface JSXElement {
  type: 'JSXElement'
}

function isJSXElement(node: unknown): node is JSXElement {
  return (node as { type?: string }).type === 'JSXElement'
}

interface FunctionLike {
  loc?: { end: { column: number; line: number; }; start: { column: number; line: number; }; }
  type: string
}

export const mixedResponsibility: Rule = {
  create(ctx: RuleContext): RuleListeners {
    interface ScopeState {
      hasApiCall: boolean
      hasJSX: boolean
      node: unknown
    }

    const scopeStack: ScopeState[] = []
    const reported = new WeakSet<object>()

    function enterScope(node: unknown) {
      scopeStack.push({ hasApiCall: false, hasJSX: false, node })
    }

    function exitScope(node: unknown) {
      const current = scopeStack.pop()
      if (!current) return

      // Bubble up API calls and JSX to parent scope
      if (scopeStack.length > 0) {
        const parent = scopeStack.at(-1)!
        if (current.hasApiCall) parent.hasApiCall = true
        if (current.hasJSX) parent.hasJSX = true
      }

      const fn = node as FunctionLike
      if (current.hasApiCall && current.hasJSX && fn.loc && !reported.has(node as object)) {
        reported.add(node as object)
        ctx.report({
          message: `Component mixes API calls with JSX rendering. This makes the component hard to test and reuse.`,
          range: {
            end: { column: fn.loc.end.column, line: fn.loc.end.line },
            start: { column: fn.loc.start.column, line: fn.loc.start.line },
          },
          suggestion: `Extract the data-fetching logic into a custom hook (e.g., useMyData()) or a service function, and keep the component focused on rendering.`,
        })
      }
    }

    return {
      ArrowFunctionExpression: enterScope,
      'ArrowFunctionExpression:exit': exitScope,
      CallExpression(node) {
        if (isApiCall(node) && scopeStack.length > 0) {
          scopeStack.at(-1)!.hasApiCall = true
        }
      },
      FunctionDeclaration: enterScope,
      'FunctionDeclaration:exit': exitScope,
      FunctionExpression: enterScope,

      'FunctionExpression:exit': exitScope,

      JSXElement(node) {
        if (isJSXElement(node) && scopeStack.length > 0) {
          scopeStack.at(-1)!.hasJSX = true
        }
      },
    }
  },
  meta: {
    category: 'maintainability',
    defaultSeverity: 'warning',
    description: 'React components should not mix UI rendering with API calls and business logic.',
    docsUrl: 'docs/rules/react/mixed-responsibility.md',
    id: 'react/mixed-responsibility',
    title: 'Mixed Responsibility',
  },
  optionsSchema,
}
