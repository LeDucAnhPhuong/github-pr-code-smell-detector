import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

export type ProjectType = 'nextjs-app-router' | 'nextjs-pages-router' | 'react' | 'unknown'

export interface ProjectDetectionResult {
  hasAppDir: boolean
  hasPagesDir: boolean
  hasReact: boolean
  type: ProjectType
}

export function detectReactNext(repoPath: string): ProjectDetectionResult {
  const hasAppDir = existsSync(join(repoPath, 'app')) || existsSync(join(repoPath, 'src', 'app'))
  const hasPagesDir =
    existsSync(join(repoPath, 'pages')) || existsSync(join(repoPath, 'src', 'pages'))

  let hasReact = false
  const pkgPath = join(repoPath, 'package.json')
  if (existsSync(pkgPath)) {
    try {
      const text = readFileSync(pkgPath, 'utf-8')
      hasReact = text.includes('"react"') || text.includes("'react'")
    } catch {
      // ignore read errors
    }
  }

  let type: ProjectType = 'unknown'
  if (hasAppDir) type = 'nextjs-app-router'
  else if (hasPagesDir) type = 'nextjs-pages-router'
  else if (hasReact) type = 'react'

  return { hasAppDir, hasPagesDir, hasReact, type }
}
