import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

const getTeamCommsCreds = vi.fn()
const setClients = vi.fn()
const announceTabPresence = vi.fn()

const authStore = { user: { id: 'user-hashid-1' }, getSessionId: () => 'browser-session-1' }
const mcpStore = { setClients }

const useAccountAuthStore = vi.fn(() => authStore)
const useProductMcpStore = vi.fn(() => mcpStore)

vi.mock('@/api/team.js', () => ({
    default: { getTeamCommsCreds: (...args) => getTeamCommsCreds(...args) }
}))
vi.mock('@/stores/account-auth.js', () => ({ useAccountAuthStore }))
vi.mock('@/stores/product-mcp.js', () => ({ useProductMcpStore }))
vi.mock('@/publishers/tab-presence.publisher', () => ({
    announceTabPresence: (...args) => announceTabPresence(...args)
}))
vi.mock('@/services/app.orchestrator', () => ({ default: () => ({ $app: {}, $router: {}, $services: { mqtt: {} } }) }))

function makeTransport () {
    return {
        attach: vi.fn().mockImplementation(async (key) => ({ key, id: 1 })),
        subscribe: vi.fn().mockResolvedValue(undefined),
        detach: vi.fn().mockResolvedValue(undefined)
    }
}

const CLIENTS_TOPIC = 'ff/v1/team-1/u/user-hashid-1/s/browser-session-1/mcp/clients'

describe('McpSessionSubscriber', async () => {
    const mod = await import('../../../../frontend/src/subscribers/mcp-session.subscriber.ts')
    const { createMcpSessionSubscriber, destroyMcpSessionSubscriber } = mod

    async function connected () {
        const transport = makeTransport()
        const subscriber = createMcpSessionSubscriber({ app: {}, router: { push: vi.fn() }, transport })
        await subscriber.connect({ id: 'team-1' })
        // the transport invokes onConnect once the client is up
        await transport.attach.mock.calls[0][1].onConnect()
        return { subscriber, transport }
    }

    function deliver (transport, topic, payload) {
        const { onMessage } = transport.attach.mock.calls[0][1]
        return onMessage(topic, JSON.stringify(payload))
    }

    beforeEach(async () => {
        getTeamCommsCreds.mockReset()
        setClients.mockReset()
        announceTabPresence.mockReset()
        await destroyMcpSessionSubscriber()
    })

    afterEach(async () => {
        await destroyMcpSessionSubscriber()
    })

    describe('subscription', () => {
        test('rides the team connection', async () => {
            const { transport } = await connected()
            expect(transport.attach.mock.calls[0][0]).toBe('team:team-1')
            expect(transport.subscribe.mock.calls[0][0]).toBe('team:team-1')
        })

        test('names the event rather than wildcarding it, so the ACL can be exact', async () => {
            const { transport } = await connected()
            const [, topics] = transport.subscribe.mock.calls[0]
            expect(topics).toEqual([CLIENTS_TOPIC])
            expect(topics[0]).not.toContain('+')
        })

        test('asks for a fresh heartbeat once subscribed, so no answer is missed', async () => {
            await connected()
            expect(announceTabPresence).toHaveBeenCalled()
        })

        test('detaches on destroy', async () => {
            const { transport } = await connected()
            await destroyMcpSessionSubscriber()
            expect(transport.detach).toHaveBeenCalledWith(expect.objectContaining({ key: 'team:team-1' }))
        })
    })

    describe('clients events', () => {
        test('passes the reported set to the store', async () => {
            const { transport } = await connected()
            deliver(transport, CLIENTS_TOPIC, { count: 2, clients: ['aaa', 'bbb'] })
            expect(setClients).toHaveBeenCalledWith(['aaa', 'bbb'])
        })

        test('treats an empty set as nothing targeting the tab', async () => {
            const { transport } = await connected()
            deliver(transport, CLIENTS_TOPIC, { count: 0, clients: [] })
            expect(setClients).toHaveBeenCalledWith([])
        })

        test('reports nothing rather than throwing when the field is missing', async () => {
            const { transport } = await connected()
            deliver(transport, CLIENTS_TOPIC, { count: 3 })
            expect(setClients).toHaveBeenCalledWith([])
        })

        test('reports nothing when the field is not an array', async () => {
            const { transport } = await connected()
            deliver(transport, CLIENTS_TOPIC, { clients: 'aaa' })
            expect(setClients).toHaveBeenCalledWith([])
        })

        test('drops entries that are not strings', async () => {
            const { transport } = await connected()
            deliver(transport, CLIENTS_TOPIC, { clients: ['aaa', 42, null, 'bbb'] })
            expect(setClients).toHaveBeenCalledWith(['aaa', 'bbb'])
        })

        test('survives a malformed body', async () => {
            const { transport } = await connected()
            const { onMessage } = transport.attach.mock.calls[0][1]
            expect(() => onMessage(CLIENTS_TOPIC, 'not json')).not.toThrow()
            expect(setClients).toHaveBeenCalledWith([])
        })

        test('ignores an event addressed to another tab', async () => {
            const { transport } = await connected()
            deliver(transport, 'ff/v1/team-1/u/user-hashid-1/s/another-tab/mcp/clients', { clients: ['aaa'] })
            expect(setClients).not.toHaveBeenCalled()
        })

        test('ignores an event addressed to another user', async () => {
            const { transport } = await connected()
            deliver(transport, 'ff/v1/team-1/u/someone-else/s/browser-session-1/mcp/clients', { clients: ['aaa'] })
            expect(setClients).not.toHaveBeenCalled()
        })

        test('ignores an unrelated mcp event', async () => {
            const { transport } = await connected()
            deliver(transport, 'ff/v1/team-1/u/user-hashid-1/s/browser-session-1/mcp/something', { clients: ['aaa'] })
            expect(setClients).not.toHaveBeenCalled()
        })
    })
})
