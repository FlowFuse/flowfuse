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
        description: `FlowFuse UI automation tool:
            Lists all the pages the user can visit in the FlowFuse app, along with their route names, path patterns, and what parameters they need.
            Use this to find the right route name and params before calling ui_navigate.
            Each route has a name (like "device-overview" or "instance-overview"), a path pattern showing what parameters it expects
            (like "/device/:id/overview" means you need to pass { id: "..." }), and metadata like the page title.
            You do not need to call this every time. If you already know the route name from a tool description (e.g. platform_create_hosted_instance tells you to use "instance-overview"), just use it directly.`,
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
