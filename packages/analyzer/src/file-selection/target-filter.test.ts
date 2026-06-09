import { describe, expect, it } from 'vitest'

import { filterTargetFiles, toPosixPath } from './target-filter.js'

describe('filterTargetFiles', () => {
  it('includes .jsx and .tsx files', () => {
    const { included } = filterTargetFiles(['components/Foo.tsx', 'pages/index.jsx'])
    expect(included).toContain('components/Foo.tsx')
    expect(included).toContain('pages/index.jsx')
  })

  it('includes .ts/.js in React/Next.js paths', () => {
    const { included } = filterTargetFiles([
      'hooks/useFoo.ts',
      'app/layout.ts',
      'components/Button.js',
    ])
    expect(included).toHaveLength(3)
  })

  it('excludes .ts/.js outside React/Next.js paths', () => {
    const { included, skippedCount } = filterTargetFiles(['server/db.ts', 'lib/helper.js'])
    expect(included).toHaveLength(0)
    expect(skippedCount).toBe(2)
  })

  it('excludes node_modules', () => {
    const { included, skippedCount } = filterTargetFiles([
      'node_modules/react/index.js',
      'components/Foo.tsx',
    ])
    expect(included).toEqual(['components/Foo.tsx'])
    expect(skippedCount).toBe(1)
  })

  it('excludes dist/', () => {
    const { included, skippedCount } = filterTargetFiles(['dist/bundle.js', 'src/App.tsx'])
    expect(included).toEqual(['src/App.tsx'])
    expect(skippedCount).toBe(1)
  })

  it('excludes test files', () => {
    const { included, skippedCount } = filterTargetFiles([
      'components/Foo.test.tsx',
      'components/Bar.spec.tsx',
      '__tests__/Baz.tsx',
      'components/Real.tsx',
    ])
    expect(included).toEqual(['components/Real.tsx'])
    expect(skippedCount).toBe(3)
  })

  it('excludes unsupported extensions (.md, .json, .css)', () => {
    const { included, skippedCount } = filterTargetFiles([
      'README.md',
      'package.json',
      'styles.css',
      'components/Foo.tsx',
    ])
    expect(included).toEqual(['components/Foo.tsx'])
    expect(skippedCount).toBe(3)
  })

  it('returns skippedCount for unsupported files silently', () => {
    const result = filterTargetFiles(['foo.png', 'bar.html'])
    expect(result.skippedCount).toBe(2)
    expect(result.included).toHaveLength(0)
  })

  it('uses custom targetPaths from config to include .ts/.js files', () => {
    const { included, skippedCount } = filterTargetFiles(
      ['lib/helper.ts', 'utils/format.ts', 'src/App.ts'],
      { targetPaths: ['lib', 'utils', 'src'] },
    )
    expect(included).toContain('lib/helper.ts')
    expect(included).toContain('utils/format.ts')
    expect(included).toContain('src/App.ts')
    expect(skippedCount).toBe(0)
  })

  it('excludes .ts/.js not matching custom targetPaths', () => {
    const { included, skippedCount } = filterTargetFiles(
      ['server/db.ts', 'lib/helper.ts'],
      { targetPaths: ['lib'] },
    )
    expect(included).toEqual(['lib/helper.ts'])
    expect(skippedCount).toBe(1)
  })

  it('custom excludePaths overrides inclusion', () => {
    const { included, skippedCount } = filterTargetFiles(
      ['src/App.tsx', 'src/generated/types.tsx'],
      { excludePaths: ['generated'] },
    )
    expect(included).toEqual(['src/App.tsx'])
    expect(skippedCount).toBe(1)
  })
})

describe('toPosixPath', () => {
  it('converts backslashes to forward slashes', () => {
    expect(toPosixPath(String.raw`src\components\Foo.tsx`)).toBe('src/components/Foo.tsx')
  })

  it('leaves POSIX paths unchanged', () => {
    expect(toPosixPath('src/components/Foo.tsx')).toBe('src/components/Foo.tsx')
  })
})
