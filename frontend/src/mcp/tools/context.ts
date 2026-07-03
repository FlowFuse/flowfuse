import { useContextStore } from '@/stores/context.js'
import type { McpToolDefinition } from '@/types'

const tools: McpToolDefinition[] = [
    {
        name: 'ui_get_context',
        title: 'Get Context',
        description: `FlowFuse UI automation tool:
            This is your go-to tool whenever a user request is ambiguous or you are not sure what they are referring to.
            It tells you everything about where the user is right now: what page they are on, which team they belong to,
            which application, hosted instance, or remote instance they are looking at (if any), and whether they are
            inside the Node-RED editor (immersive mode) or in the main FlowFuse app.
            Always call this tool first when you need to fill in missing context, like figuring out which instance or
            application the user is talking about without them having to spell it out.
            If there are still things you are not sure about after reading the response, ask the user to clarify.`,
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
