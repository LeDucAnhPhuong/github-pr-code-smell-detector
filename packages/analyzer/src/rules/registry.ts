import type { Rule } from '../core/index.js'

import { nextjsRules } from './nextjs/index.js'
import { reactRules } from './react/index.js'

export const ALL_RULES: Rule[] = [...reactRules, ...nextjsRules]

export function getRuleById(id: string): Rule | undefined {
  return ALL_RULES.find((r) => r.meta.id === id)
}
