import type { RuleListeners } from '../../core/index.js'

type ASTNode = { [key: string]: unknown; type: string; }

function isASTNode(value: unknown): value is ASTNode {
  return typeof value === 'object' && value !== null && typeof (value as ASTNode).type === 'string'
}

/**
 * Walk an ESTree-compatible AST, calling listeners for each matching node type.
 * Supports `NodeType:exit` keys for post-traversal visitors.
 * Visits every node exactly once (enter + exit).
 */
export function visitAST(node: unknown, listeners: RuleListeners): void {
  if (!isASTNode(node)) return

  const enterVisitor = listeners[node.type]
  if (enterVisitor) enterVisitor(node)

  for (const key of Object.keys(node)) {
    const child = node[key]
    if (Array.isArray(child)) {
      for (const item of child) {
        visitAST(item, listeners)
      }
    } else if (isASTNode(child)) {
      visitAST(child, listeners)
    }
  }

  const exitVisitor = listeners[`${node.type}:exit`]
  if (exitVisitor) exitVisitor(node)
}
