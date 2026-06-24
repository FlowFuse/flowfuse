import type { McpToolDefinition } from '@/types'

const tools: McpToolDefinition[] = [
    {
        name: 'ui.navigate',
        description: 'Navigate the user\'s browser to a specific page. Takes a route name and optional params. Use ui.list-routes to discover valid route names and their required parameters.',
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            type: 'object',
            properties: {
                route: {
                    type: 'string',
                    description: 'The route name to navigate to (e.g. "instance-overview", "team-home")'
                },
                params: {
                    type: 'object',
                    description: 'Route parameters (e.g. { id: "abc123" } or { team_slug: "my-team" })',
                    additionalProperties: { type: 'string' }
                }
            },
            required: ['route']
        },
        async handler (args, { router }) {
            const { route: routeName, params } = args as { route: string, params?: Record<string, string> }

            const resolved = router.resolve({ name: routeName, params })
            if (!resolved || !resolved.matched.length) {
                return { success: false, error: `Route "${routeName}" not found` }
            }

            await router.push({ name: routeName, params })
            return { success: true, route: routeName, path: resolved.fullPath }
        }
    }
]

export default tools
