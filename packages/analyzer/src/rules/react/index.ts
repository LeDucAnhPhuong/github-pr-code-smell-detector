import type { Rule } from '../../core/index.js'

import { complexJsx } from './complex-jsx.js'
import { inlineFunctionOveruse } from './inline-function-overuse.js'
import { mixedResponsibility } from './mixed-responsibility.js'
import { noLargeComponent } from './no-large-component.js'
import { tooManyProps } from './too-many-props.js'
import { tooManyStates } from './too-many-states.js'

export const reactRules: Rule[] = [
  noLargeComponent,
  tooManyProps,
  tooManyStates,
  complexJsx,
  inlineFunctionOveruse,
  mixedResponsibility,
]
