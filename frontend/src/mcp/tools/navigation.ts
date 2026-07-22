import type { McpToolDefinition } from '@/types'

const tools: McpToolDefinition[] = [
    {
        name: 'ui_navigate',
        title: 'Navigate',
        description: `FlowFuse UI automation tool:
            Navigates the user's browser to a specific page.
            Use ui_list_routes to discover valid route names and the parameters they need.
            Before navigating, call ui_get_context to remember what page the user is currently on, so you can go back if something goes wrong.
            After calling this tool, call ui_get_context again to verify the navigation actually worked and the user ended up on the right page.
            If the navigation failed, it might be because a newly created entity has not finished setting up yet. Wait a few seconds and try the navigation again.
            If it still does not work after retrying, navigate the user back to the page they were on before and let them know what happened.`,
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

            let resolved
            try {
                resolved = router.resolve({ name: routeName, params })
            } catch {
                // router.resolve throws (rather than returning matched: []) for an unknown route name
                resolved = null
            }
            if (!resolved || !resolved.matched.length) {
                return { success: false, error: `Route "${routeName}" not found - use ui_list_routes to see valid route names` }
            }

            try {
                await router.push({ name: routeName, params })
            } catch (err) {
                const message = err instanceof Error && err.message ? err.message : `Navigation to "${routeName}" failed`
                return { success: false, error: message }
            }
            return { success: true, route: routeName, path: resolved.fullPath }
        }
    }
]

export default tools
