import { parse, type TSESTree } from '@typescript-eslint/typescript-estree'

import type { Diagnostic } from '../core/index.js'

export interface ParseResult {
  ast: null | TSESTree.Program
  diagnostic: Diagnostic | null
}

export function parseFile(filePath: string, source: string): ParseResult {
  try {
    const ast = parse(source, {
      comment: false,
      errorOnUnknownASTType: false,
      filePath,
      jsx: true,
      loc: true,
      range: false,
      tokens: false,
    })
    return { ast, diagnostic: null }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    return {
      ast: null,
      diagnostic: {
        code: 'PARSE_ERROR',
        file: filePath,
        message: `Parse error in ${filePath}: ${message}`,
        severity: 'error',
      },
    }
  }
}
