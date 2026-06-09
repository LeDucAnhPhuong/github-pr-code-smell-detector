import { describe, expect, it, vi } from 'vitest'

import { visitAST } from './visit.js'

const mockProgram = {
  body: [
    {
      expression: {
        name: 'foo',
        type: 'Identifier',
      },
      type: 'ExpressionStatement',
    },
    {
      expression: {
        name: 'bar',
        type: 'Identifier',
      },
      type: 'ExpressionStatement',
    },
  ],
  type: 'Program',
}

describe('visitAST', () => {
  it('visits every Identifier node exactly once', () => {
    const visited: string[] = []
    visitAST(mockProgram, {
      Identifier(node) {
        visited.push((node as { name: string }).name)
      },
    })
    expect(visited).toEqual(['foo', 'bar'])
  })

  it('visits the Program node', () => {
    const types: string[] = []
    visitAST(mockProgram, {
      ExpressionStatement() {
        types.push('Stmt')
      },
      Program(node) {
        types.push('Program')
      },
    })
    expect(types).toContain('Program')
    expect(types.filter((t) => t === 'Stmt')).toHaveLength(2)
  })

  it('handles non-node values gracefully', () => {
    expect(() => visitAST(null, {})).not.toThrow()
    expect(() => visitAST(42, {})).not.toThrow()
    expect(() => visitAST(undefined, {})).not.toThrow()
  })

  it('handles arrays of nodes', () => {
    const count = vi.fn()
    visitAST(mockProgram, { ExpressionStatement: count })
    expect(count).toHaveBeenCalledTimes(2)
  })
})
