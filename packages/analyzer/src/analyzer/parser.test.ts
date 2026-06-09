import { describe, expect, it } from 'vitest'

import { parseFile } from './parser.js'

describe('parseFile', () => {
  it('parses a valid TSX file and returns an AST', () => {
    const source = `
      import React from 'react'
      export function MyComponent() {
        return <div>Hello</div>
      }
    `
    const { ast, diagnostic } = parseFile('MyComponent.tsx', source)
    expect(diagnostic).toBeNull()
    expect(ast).not.toBeNull()
    expect(ast?.type).toBe('Program')
  })

  it('returns a diagnostic (not throws) for a syntax error', () => {
    const source = `export function broken( { return null }`
    const { ast, diagnostic } = parseFile('broken.tsx', source)
    expect(ast).toBeNull()
    expect(diagnostic).not.toBeNull()
    expect(diagnostic?.code).toBe('PARSE_ERROR')
    expect(diagnostic?.file).toBe('broken.tsx')
  })

  it('parses plain TypeScript', () => {
    const source = `const x: number = 42`
    const { ast, diagnostic } = parseFile('file.ts', source)
    expect(diagnostic).toBeNull()
    expect(ast).not.toBeNull()
  })

  it('parses JSX files', () => {
    const source = `export const A = () => <span>hi</span>`
    const { ast, diagnostic } = parseFile('a.jsx', source)
    expect(diagnostic).toBeNull()
    expect(ast).not.toBeNull()
  })
})
