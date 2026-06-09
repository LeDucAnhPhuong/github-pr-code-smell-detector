import { z } from 'zod'

const SeveritySchema = z.enum(['error', 'warning', 'info'])

const RuleConfigSchema = z.object({
  blocking: z.boolean().optional(),
  enabled: z.boolean().optional(),
  severity: SeveritySchema.optional(),
  threshold: z.number().int().positive().optional(),
})

export const AnalyzerConfigSchema = z.object({
  blocking: z.boolean().optional().default(false),
  excludePaths: z
    .array(z.string())
    .optional()
    .default(['node_modules', 'dist', '.next', 'out', 'build', 'coverage']),
  rules: z.record(z.string(), RuleConfigSchema).optional().default({}),
  targetPaths: z.array(z.string()).optional().default(['app', 'pages', 'components', 'hooks', 'features', 'src']),
})

export type RuleConfig = z.infer<typeof RuleConfigSchema>
export type AnalyzerConfig = z.infer<typeof AnalyzerConfigSchema>
