import contextTools from './context.js'
import navigationTools from './navigation.js'
import onboardingTools from './onboarding.js'
import planModeTools from './plan-mode.js'
import routesTools from './routes.js'

import type { McpToolDefinition } from '@/types'

const allTools: McpToolDefinition[] = [
    ...contextTools,
    ...routesTools,
    ...navigationTools,
    ...onboardingTools,
    ...planModeTools
]

export default allTools
