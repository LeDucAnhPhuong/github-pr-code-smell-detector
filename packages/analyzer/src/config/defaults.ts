import type { AnalyzerConfig } from './schema.js'

export const DEFAULT_CONFIG: AnalyzerConfig = {
  blocking: false,
  excludePaths: ['node_modules', 'dist', '.next', 'out', 'build', 'coverage'],
  rules: {},
  targetPaths: ['app', 'pages', 'components', 'hooks', 'features', 'src'],
}
