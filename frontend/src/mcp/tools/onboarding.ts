import Product from '@/services/product.js'
import { useContextStore } from '@/stores/context.js'
import { useUxStore } from '@/stores/ux.js'

import type { McpToolDefinition } from '@/types'

const tools: McpToolDefinition[] = [
    {
        name: 'ui_set_onboarding_phase',
        title: 'Set onboarding phase',
        description: 'FlowFuse UI automation tool: Moves the AI-led onboarding phase. Call it to enter build, return to intake, or finish onboarding.',
        annotations: { readOnlyHint: true, destructiveHint: false },
        _meta: { requiresBrowserSession: true, audience: 'expert' },
        inputSchema: {
            type: 'object',
            properties: {
                phase: {
                    type: 'string',
                    enum: ['intake', 'building', 'done'],
                    description: 'The onboarding phase to move to.'
                }
            },
            required: ['phase']
        },
        handler (args) {
            const { phase } = args as { phase: string }

            const store = useUxStore()
            switch (phase) {
            case 'building':
                store.startOnboardingBuild()
                break
            case 'done':
                Product.capture('ff-onboarding-build-complete', {}, { team: useContextStore().team?.id })
                store.endOnboarding()
                break
            case 'intake':
                store.resumeOnboardingIntake()
                break
            default:
                return { success: false, error: `Unknown onboarding phase "${phase}" - must be one of "intake", "building", "done"` }
            }

            return { success: true, phase }
        }
    }
]

export default tools
