import type { Router } from 'vue-router'

import type { McpToolDefinition } from '@/types'

function getRouteList (router: Router) {
    return router.getRoutes()
        .filter(route => route.name && !route.redirect)
        .map(route => ({
            name: route.name as string,
            path: route.path,
            meta: {
                title: route.meta?.title || null,
                adminOnly: route.meta?.adminOnly || false,
                requiresLogin: route.meta?.requiresLogin ?? true
            }
        }))
        .sort((a, b) => a.name.localeCompare(b.name))
}

const tools: McpToolDefinition[] = [
    {
        name: 'ui_list_routes',
        description: 'FlowFuse UI automation tool: List all available UI routes with their names, path patterns, and metadata. Use this to discover valid route names for the ui_navigate tool.',
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            type: 'object',
            properties: {}
        },
        handler (_args, { router }) {
            return { routes: getRouteList(router) }
        }
    }
]

export default tools
