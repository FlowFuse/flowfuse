import { describe, expect, test } from 'vitest'

import routesTools from '../../../../../frontend/src/mcp/tools/routes.ts'

const listRoutesTool = routesTools.find((tool) => tool.name === 'ui_list_routes')

describe('ui_list_routes tool', () => {
    test('includes named redirect-only routes, such as an application landing route', () => {
        const router = {
            getRoutes: () => [
                {
                    name: 'Application',
                    path: '/team/:team_slug/applications/:id',
                    redirect: () => ({ name: 'ApplicationInstances' }),
                    meta: {}
                },
                {
                    name: 'application-activity',
                    path: '/team/:team_slug/applications/:id/activity',
                    meta: {}
                }
            ]
        }

        const { routes } = listRoutesTool.handler({}, { router })

        expect(routes.map((route) => route.name)).toContain('Application')
    })

    test('excludes unnamed routes', () => {
        const router = {
            getRoutes: () => [
                { name: undefined, path: '/some/internal/alias', meta: {} },
                { name: 'application-activity', path: '/activity', meta: {} }
            ]
        }

        const { routes } = listRoutesTool.handler({}, { router })

        expect(routes.map((route) => route.name)).toEqual(['application-activity'])
    })
})
