import { afterEach, describe, expect, test, vi } from 'vitest'

const mockTool = {
    name: 'mock_tool',
    title: 'Mock Tool',
    description: 'A mock tool',
    inputSchema: { type: 'object', properties: {} },
    handler: vi.fn()
}

vi.mock('../../../../frontend/src/mcp/tools/index.js', () => {
    return { default: [mockTool] }
})

async function loadAutomationsService () {
    vi.resetModules()
    return await import('../../../../frontend/src/services/automations.service.ts')
}

describe('automations.service', () => {
    afterEach(() => {
        mockTool.handler.mockReset()
    })

    test('dispatch returns an error for an unknown tool name', async () => {
        const { createAutomationsService } = await loadAutomationsService()
        const service = createAutomationsService({ app: {}, router: {}, services: {} })

        const result = await service.dispatch('does_not_exist', {})

        expect(result).toEqual({ error: 'Unknown UI tool: does_not_exist' })
    })

    test('dispatch surfaces a thrown Error message', async () => {
        mockTool.handler.mockRejectedValue(new Error('boom'))
        const { createAutomationsService } = await loadAutomationsService()
        const service = createAutomationsService({ app: {}, router: {}, services: {} })

        const result = await service.dispatch('mock_tool', {})

        expect(result).toEqual({ error: 'Tool "mock_tool" failed: boom' })
    })

    test('dispatch never returns an empty reason when the thrown Error has no message', async () => {
        const err = Object.assign(new Error(), { type: 1, location: { name: 'application-overview' } })
        mockTool.handler.mockRejectedValue(err)
        const { createAutomationsService } = await loadAutomationsService()
        const service = createAutomationsService({ app: {}, router: {}, services: {} })

        const result = await service.dispatch('mock_tool', {})

        expect(result.error).not.toBe('Tool "mock_tool" failed: ')
        expect(result.error).toContain('application-overview')
    })

    test('dispatch handles a thrown non-Error value', async () => {
        mockTool.handler.mockRejectedValue('a plain string failure')
        const { createAutomationsService } = await loadAutomationsService()
        const service = createAutomationsService({ app: {}, router: {}, services: {} })

        const result = await service.dispatch('mock_tool', {})

        expect(result).toEqual({ error: 'Tool "mock_tool" failed: a plain string failure' })
    })
})
