import { useContextStore } from '@/stores/context.js'
import type { McpToolDefinition } from '@/types'

const tools: McpToolDefinition[] = [
    {
        name: 'ui_get_context',
        description: 'Get the current UI context: what team, application, instance, or device the user is viewing, the current page, scope (immersive editor vs main app), and editor state when applicable.',
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            type: 'object',
            properties: {}
        },
        handler () {
            const contextStore = useContextStore()
            return contextStore.expert
        }
    }
]

export default tools
