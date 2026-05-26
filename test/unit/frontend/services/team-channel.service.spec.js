/* eslint-env browser */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

const getTeamCommsCreds = vi.fn()
const refreshTeam = vi.fn().mockResolvedValue(undefined)
const refreshTeamMembership = vi.fn().mockResolvedValue(undefined)
const useContextStore = vi.fn(() => ({ refreshTeam, refreshTeamMembership }))
const useAccountAuthStore = vi.fn(() => ({ user: { id: 'user-hashid-1' } }))

vi.mock('@/api/team.js', () => ({
    default: { getTeamCommsCreds: (...args) => getTeamCommsCreds(...args) }
}))
vi.mock('@/stores/context.js', () => ({ useContextStore }))
vi.mock('@/stores/account-auth.js', () => ({ useAccountAuthStore }))

function makeMqttService () {
    return {
        createClient: vi.fn(),
        destroyClient: vi.fn().mockResolvedValue(undefined),
        subscribe: vi.fn().mockResolvedValue(undefined),
        unsubscribe: vi.fn().mockResolvedValue(undefined)
    }
}

function makeRouter (path = '/team/dev/instances') {
    return {
        push: vi.fn(),
        currentRoute: { value: { path } }
    }
}

describe('TeamChannelService', async () => {
    const mod = await import('../../../../frontend/src/services/team-channel.service.ts')
    const { createTeamChannelService, destroyTeamChannelService } = mod

    function createService ({ mqtt = makeMqttService(), router = makeRouter() } = {}) {
        const services = { mqtt, postMessage: null, bootstrap: null, teamChannel: null }
        const service = createTeamChannelService({ app: {}, router, services })
        services.teamChannel = service
        return { service, mqtt, router }
    }

    beforeEach(async () => {
        getTeamCommsCreds.mockReset()
        refreshTeam.mockClear()
        refreshTeamMembership.mockClear()
        useContextStore.mockClear()
        useAccountAuthStore.mockClear().mockReturnValue({ user: { id: 'user-hashid-1' } })
        sessionStorage.clear()
        await destroyTeamChannelService()
    })

    afterEach(async () => {
        await destroyTeamChannelService()
    })

    describe('getSessionId', () => {
        test('mints a uuid sessionId on first call', () => {
            const { service } = createService()
            const id = service.getSessionId()
            expect(id).toMatch(/^[0-9a-f-]{36}$/)
        })

        test('returns the same sessionId on subsequent calls within the same instance', () => {
            const { service } = createService()
            const first = service.getSessionId()
            const second = service.getSessionId()
            expect(second).toBe(first)
        })

        test('does not persist to sessionStorage (so duplicated tabs get distinct ids)', () => {
            const { service } = createService()
            service.getSessionId()
            expect(sessionStorage.getItem('ff-team-channel-session-id')).toBeNull()
        })
    })

    describe('connect', () => {
        test('no-ops without a team', async () => {
            const { service, mqtt } = createService()
            await service.connect(null)
            await service.connect({})
            await service.connect({ id: '' })
            await service.connect({ id: 123 })
            expect(mqtt.createClient).not.toHaveBeenCalled()
            expect(service.isConnected()).toBe(false)
        })

        test('no-ops without a logged-in user', async () => {
            useAccountAuthStore.mockReturnValue({ user: null })
            const { service, mqtt } = createService()
            await service.connect({ id: 'team-1' })
            expect(mqtt.createClient).not.toHaveBeenCalled()
            expect(service.isConnected()).toBe(false)
        })

        test('creates an mqtt client keyed by team id', async () => {
            const { service, mqtt } = createService()
            mqtt.createClient.mockResolvedValue(undefined)
            await service.connect({ id: 'team-1' })
            expect(mqtt.createClient).toHaveBeenCalledTimes(1)
            const [key, opts] = mqtt.createClient.mock.calls[0]
            expect(key).toBe('team:team-1')
            expect(typeof opts.getCredentials).toBe('function')
            expect(typeof opts.onMessage).toBe('function')
            expect(typeof opts.onConnect).toBe('function')
            expect(service.isConnected()).toBe(true)
        })

        test('wires the full mqtt lifecycle handler surface', async () => {
            const { service, mqtt } = createService()
            mqtt.createClient.mockResolvedValue(undefined)
            await service.connect({ id: 'team-1' })
            const opts = mqtt.createClient.mock.calls[0][1]
            expect(typeof opts.onMessage).toBe('function')
            expect(typeof opts.onConnect).toBe('function')
            expect(typeof opts.onClose).toBe('function')
            expect(typeof opts.onOffline).toBe('function')
            expect(typeof opts.onError).toBe('function')
            expect(typeof opts.onDisconnect).toBe('function')
        })

        test('quiet mqtt lifecycle handlers do not throw', async () => {
            const { service, mqtt } = createService()
            mqtt.createClient.mockResolvedValue(undefined)
            await service.connect({ id: 'team-1' })
            const opts = mqtt.createClient.mock.calls[0][1]
            expect(() => opts.onClose()).not.toThrow()
            expect(() => opts.onOffline()).not.toThrow()
            expect(() => opts.onDisconnect()).not.toThrow()
            expect(() => opts.onError(new Error('boom'))).not.toThrow()
        })

        test('credential callback forwards team id + per-tab session id', async () => {
            getTeamCommsCreds.mockResolvedValue({ url: 'wss://broker', username: 'u', password: 'p' })
            const { service, mqtt } = createService()
            mqtt.createClient.mockResolvedValue(undefined)
            await service.connect({ id: 'team-1' })
            const opts = mqtt.createClient.mock.calls[0][1]
            await opts.getCredentials()
            expect(getTeamCommsCreds).toHaveBeenCalledWith('team-1', service.getSessionId())
        })

        test('skips reconnect when already connected to the same team', async () => {
            const { service, mqtt } = createService()
            mqtt.createClient.mockResolvedValue(undefined)
            await service.connect({ id: 'team-1' })
            await service.connect({ id: 'team-1' })
            expect(mqtt.createClient).toHaveBeenCalledTimes(1)
        })

        test('disconnects from the previous team when switching teams', async () => {
            const { service, mqtt } = createService()
            mqtt.createClient.mockResolvedValue(undefined)
            await service.connect({ id: 'team-1' })
            await service.connect({ id: 'team-2' })
            expect(mqtt.destroyClient).toHaveBeenCalledWith('team:team-1')
            expect(mqtt.createClient).toHaveBeenCalledTimes(2)
            expect(mqtt.createClient.mock.calls[1][0]).toBe('team:team-2')
        })

        test('degrades gracefully when createClient rejects (e.g. no broker)', async () => {
            const { service, mqtt } = createService()
            mqtt.createClient.mockRejectedValue(new Error('comms_unavailable'))
            await expect(service.connect({ id: 'team-1' })).resolves.toBeUndefined()
            expect(service.isConnected()).toBe(false)
        })
    })

    describe('subscribe on connect', () => {
        test('subscribes to team/updated and membership topics with qos 1', async () => {
            const { service, mqtt } = createService()
            let onConnect
            mqtt.createClient.mockImplementation(async (_key, opts) => {
                onConnect = opts.onConnect
            })
            await service.connect({ id: 'team-1' })
            await onConnect()
            expect(mqtt.subscribe).toHaveBeenCalledWith(
                'team:team-1',
                ['ff/v1/team-1/team/updated', 'ff/v1/team-1/u/user-hashid-1/membership'],
                { qos: 1 }
            )
        })

        test('swallows subscribe errors (managed reconnect will retry)', async () => {
            const { service, mqtt } = createService()
            mqtt.subscribe.mockRejectedValue(new Error('subscribe failed'))
            let onConnect
            mqtt.createClient.mockImplementation(async (_key, opts) => {
                onConnect = opts.onConnect
            })
            await service.connect({ id: 'team-1' })
            await expect(onConnect()).resolves.toBeUndefined()
        })
    })

    describe('message routing', () => {
        async function connectAndCaptureOnMessage () {
            const { service, mqtt, router } = createService()
            let onMessage
            mqtt.createClient.mockImplementation(async (_key, opts) => {
                onMessage = opts.onMessage
            })
            await service.connect({ id: 'team-1' })
            return { service, mqtt, router, onMessage }
        }

        test('team/updated triggers refreshTeam', async () => {
            const { onMessage } = await connectAndCaptureOnMessage()
            onMessage('ff/v1/team-1/team/updated', Buffer.from(JSON.stringify({})))
            expect(refreshTeam).toHaveBeenCalledTimes(1)
            expect(refreshTeamMembership).not.toHaveBeenCalled()
        })

        test('membership update triggers refreshTeamMembership', async () => {
            const { onMessage, router } = await connectAndCaptureOnMessage()
            onMessage('ff/v1/team-1/u/user-hashid-1/membership', Buffer.from(JSON.stringify({ reason: 'role-changed' })))
            expect(refreshTeamMembership).toHaveBeenCalledTimes(1)
            expect(refreshTeam).not.toHaveBeenCalled()
            expect(router.push).not.toHaveBeenCalled()
        })

        test('membership "removed" hard-reloads to / when on a team route', async () => {
            const assign = vi.fn()
            Object.defineProperty(window, 'location', {
                writable: true,
                value: { ...window.location, assign }
            })
            const { onMessage } = await connectAndCaptureOnMessage()
            onMessage('ff/v1/team-1/u/user-hashid-1/membership', Buffer.from(JSON.stringify({ reason: 'removed' })))
            expect(assign).toHaveBeenCalledWith('/')
            expect(refreshTeamMembership).not.toHaveBeenCalled()
        })

        test('membership "removed" does not reload when on a non-team route', async () => {
            const assign = vi.fn()
            Object.defineProperty(window, 'location', {
                writable: true,
                value: { ...window.location, assign }
            })
            const router = makeRouter('/account')
            const { service, mqtt } = createService({ router })
            let onMessage
            mqtt.createClient.mockImplementation(async (_key, opts) => {
                onMessage = opts.onMessage
            })
            await service.connect({ id: 'team-1' })
            onMessage('ff/v1/team-1/u/user-hashid-1/membership', Buffer.from(JSON.stringify({ reason: 'removed' })))
            expect(assign).not.toHaveBeenCalled()
        })

        test('does not throw on malformed JSON payloads', async () => {
            const { onMessage } = await connectAndCaptureOnMessage()
            expect(() => onMessage('ff/v1/team-1/team/updated', Buffer.from('not json'))).not.toThrow()
            expect(refreshTeam).toHaveBeenCalledTimes(1)
        })

        test('ignores topics outside the team-channel scheme', async () => {
            const { onMessage } = await connectAndCaptureOnMessage()
            onMessage('ff/v1/team-1/some/other/topic', Buffer.from('{}'))
            expect(refreshTeam).not.toHaveBeenCalled()
            expect(refreshTeamMembership).not.toHaveBeenCalled()
        })
    })

    describe('disconnect / destroy', () => {
        test('disconnect destroys the client and clears connected state', async () => {
            const { service, mqtt } = createService()
            mqtt.createClient.mockResolvedValue(undefined)
            await service.connect({ id: 'team-1' })
            await service.disconnect()
            expect(mqtt.destroyClient).toHaveBeenCalledWith('team:team-1')
            expect(service.isConnected()).toBe(false)
        })

        test('disconnect is a no-op when not connected', async () => {
            const { service, mqtt } = createService()
            await service.disconnect()
            expect(mqtt.destroyClient).not.toHaveBeenCalled()
        })

        test('destroy disconnects and clears the in-memory sessionId', async () => {
            const { service, mqtt } = createService()
            mqtt.createClient.mockResolvedValue(undefined)
            await service.connect({ id: 'team-1' })
            const sessionIdBefore = service.getSessionId()
            await service.destroy()
            expect(mqtt.destroyClient).toHaveBeenCalledWith('team:team-1')
            // next caller mints a fresh id rather than reusing the destroyed one
            expect(service.getSessionId()).not.toBe(sessionIdBefore)
        })
    })

    describe('ready', () => {
        test('resolves to true once connect succeeds', async () => {
            const { service, mqtt } = createService()
            mqtt.createClient.mockResolvedValue(undefined)
            await service.connect({ id: 'team-1' })
            await expect(service.ready()).resolves.toBe(true)
        })

        test('resolves to false when no connect has been attempted', async () => {
            const { service } = createService()
            await expect(service.ready()).resolves.toBe(false)
        })

        test('resolves to false when connect failed (graceful degrade)', async () => {
            const { service, mqtt } = createService()
            mqtt.createClient.mockRejectedValue(new Error('comms_unavailable'))
            await service.connect({ id: 'team-1' })
            await expect(service.ready()).resolves.toBe(false)
        })

        test('awaits an in-flight connect before resolving', async () => {
            const { service, mqtt } = createService()
            let resolveCreate
            mqtt.createClient.mockImplementation(() => new Promise(resolve => { resolveCreate = resolve }))
            const connecting = service.connect({ id: 'team-1' })
            const ready = service.ready()
            let readyResolved = false
            ready
                .then(() => {
                    readyResolved = true
                    return undefined
                })
                .catch(() => undefined)
            await new Promise((resolve) => { setTimeout(resolve, 5) })
            expect(readyResolved).toBe(false)
            resolveCreate(undefined)
            await connecting
            await expect(ready).resolves.toBe(true)
        })
    })

    describe('subscribeInstance / subscribeDevice', () => {
        async function connectedService () {
            const { service, mqtt } = createService()
            let onMessage
            mqtt.createClient.mockImplementation(async (_key, opts) => {
                onMessage = opts.onMessage
            })
            await service.connect({ id: 'team-1' })
            mqtt.subscribe.mockClear()
            return { service, mqtt, onMessage }
        }

        test('subscribeInstance returns a no-op when not connected', async () => {
            const { service, mqtt } = createService()
            const cb = vi.fn()
            const unsub = service.subscribeInstance('proj-1', cb)
            expect(typeof unsub).toBe('function')
            expect(() => unsub()).not.toThrow()
            expect(mqtt.subscribe).not.toHaveBeenCalled()
        })

        test('subscribeDevice returns a no-op when not connected', async () => {
            const { service, mqtt } = createService()
            const cb = vi.fn()
            const unsub = service.subscribeDevice('dev-1', cb)
            expect(typeof unsub).toBe('function')
            expect(() => unsub()).not.toThrow()
            expect(mqtt.subscribe).not.toHaveBeenCalled()
        })

        test('first subscribeInstance issues a broker subscribe with the per-resource state topic', async () => {
            const { service, mqtt } = await connectedService()
            service.subscribeInstance('proj-1', vi.fn())
            expect(mqtt.subscribe).toHaveBeenCalledWith(
                'team:team-1',
                'ff/v1/team-1/p/proj-1/state',
                { qos: 1 }
            )
        })

        test('first subscribeDevice issues a broker subscribe with the per-resource state topic', async () => {
            const { service, mqtt } = await connectedService()
            service.subscribeDevice('dev-1', vi.fn())
            expect(mqtt.subscribe).toHaveBeenCalledWith(
                'team:team-1',
                'ff/v1/team-1/d/dev-1/state',
                { qos: 1 }
            )
        })

        test('second subscribe to the same id ref-counts (no extra broker subscribe)', async () => {
            const { service, mqtt } = await connectedService()
            service.subscribeInstance('proj-1', vi.fn())
            service.subscribeInstance('proj-1', vi.fn())
            expect(mqtt.subscribe).toHaveBeenCalledTimes(1)
        })

        test('distinct ids each get their own broker subscribe', async () => {
            const { service, mqtt } = await connectedService()
            service.subscribeInstance('proj-1', vi.fn())
            service.subscribeInstance('proj-2', vi.fn())
            expect(mqtt.subscribe).toHaveBeenCalledTimes(2)
            expect(mqtt.subscribe).toHaveBeenCalledWith('team:team-1', 'ff/v1/team-1/p/proj-1/state', { qos: 1 })
            expect(mqtt.subscribe).toHaveBeenCalledWith('team:team-1', 'ff/v1/team-1/p/proj-2/state', { qos: 1 })
        })

        test('last unsubscribe per id issues a broker unsubscribe', async () => {
            const { service, mqtt } = await connectedService()
            const cb1 = vi.fn()
            const cb2 = vi.fn()
            const unsub1 = service.subscribeInstance('proj-1', cb1)
            const unsub2 = service.subscribeInstance('proj-1', cb2)
            unsub1()
            expect(mqtt.unsubscribe).not.toHaveBeenCalled()
            unsub2()
            expect(mqtt.unsubscribe).toHaveBeenCalledWith('team:team-1', 'ff/v1/team-1/p/proj-1/state')
        })

        test('idempotent unsubscribe (calling twice does nothing on second call)', async () => {
            const { service, mqtt } = await connectedService()
            const unsub = service.subscribeInstance('proj-1', vi.fn())
            unsub()
            unsub()
            expect(mqtt.unsubscribe).toHaveBeenCalledTimes(1)
        })

        test('swallows broker subscribe failures (mqtt.service replays on reconnect)', async () => {
            const { service, mqtt } = await connectedService()
            mqtt.subscribe.mockRejectedValue(new Error('subscribe failed'))
            expect(() => service.subscribeInstance('proj-1', vi.fn())).not.toThrow()
        })

        test('instance and device id namespaces are isolated', async () => {
            const { service, onMessage } = await connectedService()
            const instanceCb = vi.fn()
            const deviceCb = vi.fn()
            service.subscribeInstance('xyz', instanceCb)
            service.subscribeDevice('xyz', deviceCb)
            onMessage('ff/v1/team-1/p/xyz/state', Buffer.from(JSON.stringify({ id: 'xyz', meta: { state: 'running' } })))
            expect(instanceCb).toHaveBeenCalledTimes(1)
            expect(deviceCb).not.toHaveBeenCalled()
        })
    })

    describe('state message routing', () => {
        async function connectedService () {
            const { service, mqtt } = createService()
            let onMessage
            mqtt.createClient.mockImplementation(async (_key, opts) => {
                onMessage = opts.onMessage
            })
            await service.connect({ id: 'team-1' })
            return { service, mqtt, onMessage }
        }

        test('instance-state message reaches the matching listener', async () => {
            const { service, onMessage } = await connectedService()
            const cb = vi.fn()
            service.subscribeInstance('proj-1', cb)
            onMessage(
                'ff/v1/team-1/p/proj-1/state',
                Buffer.from(JSON.stringify({ id: 'proj-1', meta: { state: 'running' }, ts: 1700000000000 }))
            )
            expect(cb).toHaveBeenCalledWith({ id: 'proj-1', meta: { state: 'running' }, ts: 1700000000000 })
        })

        test('device-state message reaches the matching listener', async () => {
            const { service, onMessage } = await connectedService()
            const cb = vi.fn()
            service.subscribeDevice('dev-1', cb)
            onMessage(
                'ff/v1/team-1/d/dev-1/state',
                Buffer.from(JSON.stringify({ id: 'dev-1', meta: { state: 'idle' } }))
            )
            expect(cb).toHaveBeenCalledWith({ id: 'dev-1', meta: { state: 'idle' } })
        })

        test('multiple listeners on the same id all receive the message', async () => {
            const { service, onMessage } = await connectedService()
            const cb1 = vi.fn()
            const cb2 = vi.fn()
            service.subscribeInstance('proj-1', cb1)
            service.subscribeInstance('proj-1', cb2)
            onMessage('ff/v1/team-1/p/proj-1/state', Buffer.from(JSON.stringify({ meta: { state: 'starting' } })))
            expect(cb1).toHaveBeenCalledTimes(1)
            expect(cb2).toHaveBeenCalledTimes(1)
        })

        test('listeners are scoped per id (no cross-talk)', async () => {
            const { service, onMessage } = await connectedService()
            const cb1 = vi.fn()
            const cb2 = vi.fn()
            service.subscribeInstance('proj-1', cb1)
            service.subscribeInstance('proj-2', cb2)
            onMessage('ff/v1/team-1/p/proj-1/state', Buffer.from(JSON.stringify({ meta: { state: 'running' } })))
            expect(cb1).toHaveBeenCalledTimes(1)
            expect(cb2).not.toHaveBeenCalled()
        })

        test('empty payload (retained-clear on resource delete) dispatches an empty object', async () => {
            const { service, onMessage } = await connectedService()
            const cb = vi.fn()
            service.subscribeInstance('proj-1', cb)
            onMessage('ff/v1/team-1/p/proj-1/state', Buffer.from(''))
            expect(cb).toHaveBeenCalledWith({})
        })

        test('a listener that throws does not block dispatch to peers', async () => {
            const { service, onMessage } = await connectedService()
            const throwing = vi.fn(() => { throw new Error('handler boom') })
            const ok = vi.fn()
            service.subscribeInstance('proj-1', throwing)
            service.subscribeInstance('proj-1', ok)
            onMessage('ff/v1/team-1/p/proj-1/state', Buffer.from('{}'))
            expect(throwing).toHaveBeenCalled()
            expect(ok).toHaveBeenCalled()
        })
    })

    describe('disconnect clears listener maps', () => {
        test('disconnect drops all listeners; later messages do not fire stale callbacks', async () => {
            const { service, mqtt } = createService()
            let onMessage
            mqtt.createClient.mockImplementation(async (_key, opts) => {
                onMessage = opts.onMessage
            })
            await service.connect({ id: 'team-1' })
            const cb = vi.fn()
            service.subscribeInstance('proj-1', cb)
            await service.disconnect()
            onMessage('ff/v1/team-1/p/proj-1/state', Buffer.from(JSON.stringify({ meta: { state: 'x' } })))
            expect(cb).not.toHaveBeenCalled()
        })
    })
})
