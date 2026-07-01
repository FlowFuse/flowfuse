import contextTools from './context.js'
import navigationTools from './navigation.js'
import routesTools from './routes.js'

import type { McpToolDefinition } from '@/types'

const allTools: McpToolDefinition[] = [
    ...contextTools,
    ...routesTools,
    ...navigationTools
]

export default allTools
