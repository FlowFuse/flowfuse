import { useProductExpertStore } from '@/stores/product-expert.js'

import type { McpToolDefinition } from '@/types'

const tools: McpToolDefinition[] = [
    {
        name: 'ui_set_plan_mode',
        title: 'Set plan mode',
        description: 'FlowFuse UI automation tool: Turns the Expert\'s plan mode on or off, flipping the visible toggle in the chat input. In plan mode the Expert plans instead of running write actions.',
        annotations: { readOnlyHint: true, destructiveHint: false },
        _meta: { requiresBrowserSession: true, audience: 'expert' },
        inputSchema: {
            type: 'object',
            properties: {
                enabled: {
                    type: 'boolean',
                    description: 'true to enable plan mode, false to disable it.'
                }
            },
            required: ['enabled']
        },
        handler (args) {
            const { enabled } = args as { enabled: boolean }

            useProductExpertStore().setPlanMode(enabled)

            return { success: true, planMode: enabled }
        }
    }
]

export default tools
