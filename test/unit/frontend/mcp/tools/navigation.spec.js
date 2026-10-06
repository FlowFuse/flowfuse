import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

const contextStore = vi.hoisted(() => ({ expert: { pageName: null } }))
const assistantStore = vi.hoisted(() => ({ version: null, readyGeneration: 0 }))

vi.mock('@/stores/context.js', () => ({
    useContextStore: () => contextStore
}))

vi.mock('@/stores/product-assistant.js', () => ({
    useProductAssistantStore: () => assistantStore
}))

const navigationTools = (await import('../../../../../frontend/src/mcp/tools/navigation.ts')).default

const navigateTool = navigationTools.find((tool) => tool.name === 'ui_navigate')

function signalAssistantReady (version) {
    assistantStore.version = version
    assistantStore.readyGeneration += 1
}

function createRouterError () {
    // vue-router throws an Error with no message for an unknown route name (only
    // extra own properties like `type`/`location`), which is what this reproduces.
    return Object.assign(new Error(), { type: 1, location: { name: 'application-overview' } })
}

// Mirrors the poll interval / hard timeout navigation.ts waits on the editor with.
const POLL_INTERVAL_MS = 100
const READY_TIMEOUT_MS = 8000

function createEditorRouter (routeName, path) {
    return {
        resolve: vi.fn().mockReturnValue({ matched: [{ name: routeName }], fullPath: path }),
        push: vi.fn().mockResolvedValue(undefined)
    }
}

describe('ui_navigate tool', () => {
    beforeEach(() => {
        contextStore.expert = { pageName: 'test-page' }
        assistantStore.version = null
        assistantStore.readyGeneration = 0
    })

    afterEach(() => {
        vi.useRealTimers()
    })

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

        expect(result).toEqual({
            success: true,
            route: 'application-activity',
            path: '/team/t/applications/a/activity',
            context: contextStore.expert
        })
        expect(router.push).toHaveBeenCalledWith({ name: 'application-activity', params: { id: 'a' } })
    })

    test('returns a structured error when push rejects', async () => {
        const router = {
            resolve: vi.fn().mockReturnValue({ matched: [{ name: 'application-activity' }], fullPath: '/x' }),
            push: vi.fn().mockRejectedValue(new Error('navigation aborted'))
        }

        const result = await navigateTool.handler({ route: 'application-activity' }, { router })

        expect(result).toEqual({ success: false, error: 'Navigation to "application-activity" failed: navigation aborted' })
    })

    test('non-editor routes do not wait and carry no editor fields', async () => {
        const router = createEditorRouter('team-home', '/team/t')

        const result = await navigateTool.handler({ route: 'team-home' }, { router })

        expect(result.success).toBe(true)
        expect(result.context).toBe(contextStore.expert)
        expect(result).not.toHaveProperty('editorReady')
        expect(result).not.toHaveProperty('assistantVersion')
        expect(result).not.toHaveProperty('notice')
    })

    describe('editor routes', () => {
        test('resolves editorReady true once the editor reports a sufficient version', async () => {
            vi.useFakeTimers()
            const router = createEditorRouter('instance-editor', '/instance/i1/editor')

            const resultPromise = navigateTool.handler({ route: 'instance-editor', params: { id: 'i1' } }, { router })

            // Flush the router.push / nextTick microtasks so the first poll check runs.
            await vi.advanceTimersByTimeAsync(0)
            signalAssistantReady('0.16.0')
            await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS)

            const result = await resultPromise

            expect(result.success).toBe(true)
            expect(result.context).toBe(contextStore.expert)
            expect(result.editorReady).toBe(true)
            expect(result.assistantVersion).toBe('0.16.0')
            expect(result.notice).toBeUndefined()
        })

        test('resolves editorReady false with a notice when nothing arrives before the timeout', async () => {
            vi.useFakeTimers()
            const router = createEditorRouter('instance-editor', '/instance/i1/editor')

            const resultPromise = navigateTool.handler({ route: 'instance-editor', params: { id: 'i1' } }, { router })

            await vi.advanceTimersByTimeAsync(READY_TIMEOUT_MS)

            const result = await resultPromise

            expect(result.success).toBe(true)
            expect(result.editorReady).toBe(false)
            expect(result.assistantVersion).toBeNull()
            expect(result.notice).toContain('nr-assistant')
        })

        test('resolves editorReady false with an update notice when the reported version is below the minimum', async () => {
            vi.useFakeTimers()
            const router = createEditorRouter('device-editor-overview', '/device/d1/editor/overview')

            const resultPromise = navigateTool.handler({ route: 'device-editor-overview', params: { id: 'd1' } }, { router })

            await vi.advanceTimersByTimeAsync(0)
            signalAssistantReady('0.10.0')
            await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS)

            const result = await resultPromise

            expect(result.editorReady).toBe(false)
            expect(result.assistantVersion).toBe('0.10.0')
            expect(result.notice).toContain('0.10.0')
            expect(result.notice).toContain('too old')
        })

        test('ignores a stale version left over from a previously visited editor', async () => {
            // Simulate a version already reported before this navigation started - e.g. the
            // iframe wrapper was not unmounted when moving from one instance editor to another.
            signalAssistantReady('0.16.0')

            vi.useFakeTimers()
            const router = createEditorRouter('instance-editor', '/instance/i2/editor')

            const resultPromise = navigateTool.handler({ route: 'instance-editor', params: { id: 'i2' } }, { router })

            await vi.advanceTimersByTimeAsync(READY_TIMEOUT_MS)

            const result = await resultPromise

            // The stale version must not be reported as ready for the new editor.
            expect(result.editorReady).toBe(false)
            expect(result.assistantVersion).toBeNull()
        })
    })
})
