import { describe, expect, test, vi } from 'vitest'

import navigationTools from '../../../../../frontend/src/mcp/tools/navigation.ts'

const navigateTool = navigationTools.find((tool) => tool.name === 'ui_navigate')

function createRouterError () {
    // vue-router throws an Error with no message for an unknown route name (only
    // extra own properties like `type`/`location`), which is what this reproduces.
    return Object.assign(new Error(), { type: 1, location: { name: 'application-overview' } })
}

describe('ui_navigate tool', () => {
    test('returns a structured error when the route name does not resolve', async () => {
        const router = {
            resolve: vi.fn().mockImplementation(() => { throw createRouterError() }),
            push: vi.fn()
        }

        const result = await navigateTool.handler({ route: 'application-overview', params: { id: 'abc' } }, { router })

        expect(result.success).toBe(false)
        expect(result.error).toContain('application-overview')
        expect(result.error).toContain('ui_list_routes')
        expect(router.push).not.toHaveBeenCalled()
    })

    test('returns a structured error when resolve matches nothing', async () => {
        const router = {
            resolve: vi.fn().mockReturnValue({ matched: [], fullPath: '/x' }),
            push: vi.fn()
        }

        const result = await navigateTool.handler({ route: 'some-path-only-route' }, { router })

        expect(result).toEqual({ success: false, error: 'Route "some-path-only-route" not found - use ui_list_routes to see valid route names' })
    })

    test('navigates and reports success for a valid route', async () => {
        const router = {
            resolve: vi.fn().mockReturnValue({ matched: [{ name: 'application-activity' }], fullPath: '/team/t/applications/a/activity' }),
            push: vi.fn().mockResolvedValue(undefined)
        }

        const result = await navigateTool.handler({ route: 'application-activity', params: { id: 'a' } }, { router })

        expect(result).toEqual({ success: true, route: 'application-activity', path: '/team/t/applications/a/activity' })
        expect(router.push).toHaveBeenCalledWith({ name: 'application-activity', params: { id: 'a' } })
    })

    test('returns a structured error when push rejects', async () => {
        const router = {
            resolve: vi.fn().mockReturnValue({ matched: [{ name: 'application-activity' }], fullPath: '/x' }),
            push: vi.fn().mockRejectedValue(new Error('navigation aborted'))
        }

        const result = await navigateTool.handler({ route: 'application-activity' }, { router })

        expect(result).toEqual({ success: false, error: 'navigation aborted' })
    })
})
