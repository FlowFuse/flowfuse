import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

const mockConnect = vi.fn()

vi.mock('mqtt', () => {
    return {
        default: {
            connect: mockConnect
        }
    }
})

function createDeferred () {
    let deferredResolve
    const promise = new Promise((resolve) => {
        deferredResolve = resolve
    })
    return { promise, resolve: deferredResolve }
}

function createMockClient () {
    const handlers = new Map()
    return {
        on: vi.fn((eventName, handler) => {
            if (!handlers.has(eventName)) {
                handlers.set(eventName, new Set())
            }
            handlers.get(eventName).add(handler)
        }),
        off: vi.fn((eventName, handler) => {
            handlers.get(eventName)?.delete(handler)
        }),
        emit: (eventName, ...args) => {
            handlers.get(eventName)?.forEach(handler => handler(...args))
        },
        end: vi.fn((force, options, callback) => {
            if (typeof options === 'function') {
                options()
                return
            }
            if (typeof callback === 'function') {
                callback()
            }
        }),
        publish: vi.fn((topic, payload, options, callback) => {
            callback()
        }),
        subscribe: vi.fn((topic, options, callback) => {
            callback()
        }),
        unsubscribe: vi.fn((topic, callback) => {
            callback()
        }),
        connected: true
    }
}

describe('MqttService', async () => {
    const mqttServiceModule = await import('../../../../frontend/src/services/mqtt.service.js')
    const { createMqttService, destroyMqttService } = mqttServiceModule

    beforeEach(async () => {
        mockConnect.mockReset()
        await destroyMqttService()
    })

    afterEach(async () => {
        await destroyMqttService()
    })

    test('serializes createClient operations for the same key', async () => {
        const service = createMqttService({
            app: {},
            store: {},
            router: {}
        })

        const firstClient = createMockClient()
        const secondClient = createMockClient()
        const thirdClient = createMockClient()
        const firstDestroyDeferred = createDeferred()

        firstClient.end = vi.fn().mockImplementation(async (force, options, callback) => {
            await firstDestroyDeferred.promise
            if (typeof options === 'function') {
                options()
                return
            }
            if (typeof callback === 'function') {
                callback()
            }
        })

        mockConnect
            .mockReturnValueOnce(firstClient)
            .mockReturnValueOnce(secondClient)
            .mockReturnValueOnce(thirdClient)

        let secondCreate
        let thirdCreate

        try {
            await service.createClient('shared-key', { getCredentials: async () => ({ url: 'mqtt://example.com', username: 'user', password: 'pass' }) })

            secondCreate = service.createClient('shared-key', { getCredentials: async () => ({ url: 'mqtt://example.com', username: 'user', password: 'pass' }) })
            thirdCreate = service.createClient('shared-key', { getCredentials: async () => ({ url: 'mqtt://example.com', username: 'user', password: 'pass' }) })

            await vi.waitFor(() => {
                expect(firstClient.end).toHaveBeenCalledTimes(1)
            })

            firstDestroyDeferred.resolve()
            await Promise.all([secondCreate, thirdCreate])

            const managed = service.getManagedClient('shared-key')
            expect(managed.client).toBe(thirdClient)
            expect(firstClient.end).toHaveBeenCalledTimes(1)
            expect(secondClient.end).toHaveBeenCalledTimes(1)
        } finally {
            firstDestroyDeferred.resolve()
            await Promise.allSettled([
                secondCreate,
                thirdCreate
            ])
        }
    })

    test('publishMessage auto mode keeps binary payloads and stringifies plain objects', async () => {
        const service = createMqttService({
            app: {},
            store: {},
            router: {}
        })

        const client = createMockClient()
        mockConnect.mockReturnValueOnce(client)

        await service.createClient('publish-key', { getCredentials: async () => ({ url: 'mqtt://example.com', username: 'user', password: 'pass' }) })

        const bytes = new Uint8Array([1, 2, 3])
        await service.publishMessage('publish-key', {
            topic: 'binary/topic',
            payload: bytes
        })

        await service.publishMessage('publish-key', {
            topic: 'json/topic',
            payload: { enabled: true }
        })

        expect(client.publish).toHaveBeenNthCalledWith(
            1,
            'binary/topic',
            Buffer.from(bytes),
            expect.any(Object),
            expect.any(Function)
        )

        expect(client.publish).toHaveBeenNthCalledWith(
            2,
            'json/topic',
            JSON.stringify({ enabled: true }),
            expect.any(Object),
            expect.any(Function)
        )
    })

    test('publishMessage supports explicit serialization modes', async () => {
        const service = createMqttService({
            app: {},
            store: {},
            router: {}
        })

        const client = createMockClient()
        mockConnect.mockReturnValueOnce(client)

        await service.createClient('serialize-key', { getCredentials: async () => ({ url: 'mqtt://example.com', username: 'user', password: 'pass' }) })

        await service.publishMessage('serialize-key', {
            topic: 'json/topic',
            payload: { a: 1 },
            serialize: 'json'
        })

        await service.publishMessage('serialize-key', {
            topic: 'string/topic',
            payload: { b: 2 },
            serialize: 'string'
        })

        await service.publishMessage('serialize-key', {
            topic: 'raw/topic',
            payload: 'raw',
            serialize: 'raw'
        })

        await expect(service.publishMessage('serialize-key', {
            topic: 'raw/error',
            payload: { invalid: true },
            serialize: 'raw'
        })).rejects.toThrow('MQTT raw payload must be a string or binary value')

        expect(client.publish).toHaveBeenNthCalledWith(
            1,
            'json/topic',
            JSON.stringify({ a: 1 }),
            expect.any(Object),
            expect.any(Function)
        )

        expect(client.publish).toHaveBeenNthCalledWith(
            2,
            'string/topic',
            '[object Object]',
            expect.any(Object),
            expect.any(Function)
        )

        expect(client.publish).toHaveBeenNthCalledWith(
            3,
            'raw/topic',
            'raw',
            expect.any(Object),
            expect.any(Function)
        )
    })

    test('publishMessage rejects circular payloads with clear serialization error', async () => {
        const service = createMqttService({
            app: {},
            store: {},
            router: {}
        })

        const client = createMockClient()
        mockConnect.mockReturnValueOnce(client)

        await service.createClient('circular-key', { getCredentials: async () => ({ url: 'mqtt://example.com', username: 'user', password: 'pass' }) })

        const circularPayload = { state: 'bad' }
        circularPayload.self = circularPayload

        await expect(service.publishMessage('circular-key', {
            topic: 'circular/auto',
            payload: circularPayload
        })).rejects.toThrow('Failed to serialize MQTT payload in "auto" mode')

        await expect(service.publishMessage('circular-key', {
            topic: 'circular/json',
            payload: circularPayload,
            serialize: 'json'
        })).rejects.toThrow('Failed to serialize MQTT payload in "json" mode')
    })

    test('publishMessage validates topic, qos, retain and onError', async () => {
        const service = createMqttService({
            app: {},
            store: {},
            router: {}
        })

        const client = createMockClient()
        mockConnect.mockReturnValueOnce(client)

        await service.createClient('validate-key', { getCredentials: async () => ({ url: 'mqtt://example.com', username: 'user', password: 'pass' }) })

        await expect(service.publishMessage('validate-key', {
            topic: ' ',
            payload: 'ok'
        })).rejects.toThrow('MQTT publish topic is required')

        await expect(service.publishMessage('validate-key', {
            topic: 'bad/+',
            payload: 'ok'
        })).rejects.toThrow('MQTT publish topic must not contain wildcard characters')

        await expect(service.publishMessage('validate-key', {
            topic: 'test/topic',
            payload: 'ok',
            qos: 3
        })).rejects.toThrow('MQTT publish qos must be one of: 0, 1, 2')

        await expect(service.publishMessage('validate-key', {
            topic: 'test/topic',
            payload: 'ok',
            retain: 'yes'
        })).rejects.toThrow('MQTT publish retain must be a boolean')

        await expect(service.publishMessage('validate-key', {
            topic: 'test/topic',
            payload: 'ok',
            onError: 'not-a-function'
        })).rejects.toThrow('MQTT publish onError must be a function')
    })

    test('publishMessage validates and normalizes correlationData and userProperties', async () => {
        const service = createMqttService({
            app: {},
            store: {},
            router: {}
        })

        const client = createMockClient()
        mockConnect.mockReturnValueOnce(client)

        await service.createClient('properties-key', { getCredentials: async () => ({ url: 'mqtt://example.com', username: 'user', password: 'pass' }) })

        await service.publishMessage('properties-key', {
            topic: 'valid/topic',
            payload: 'ok',
            correlationData: 'request-123',
            userProperties: {
                source: 'ui',
                tags: ['alpha', 'beta']
            }
        })

        const validOptions = client.publish.mock.calls[0][2]
        expect(validOptions.properties.correlationData).toBeInstanceOf(Buffer)
        expect(validOptions.properties.userProperties).toEqual({
            source: 'ui',
            tags: ['alpha', 'beta']
        })

        await service.publishMessage('properties-key', {
            topic: 'no/properties',
            payload: 'ok',
            correlationData: null,
            userProperties: null
        })
        expect(client.publish.mock.calls[1][2].properties).toBeUndefined()

        await expect(service.publishMessage('properties-key', {
            topic: 'bad/properties',
            payload: 'ok',
            correlationData: 123
        })).rejects.toThrow('MQTT publish correlationData must be a string or binary value')

        await expect(service.publishMessage('properties-key', {
            topic: 'bad/properties',
            payload: 'ok',
            userProperties: []
        })).rejects.toThrow('MQTT publish userProperties must be a plain object')

        await expect(service.publishMessage('properties-key', {
            topic: 'bad/properties',
            payload: 'ok',
            userProperties: { trace: 1 }
        })).rejects.toThrow('MQTT publish userProperties["trace"] must be a string or string[]')

        const normalizedBinaryCorrelationData = service._normalizeCorrelationData(new Uint8Array([1, 2, 3]))
        expect(normalizedBinaryCorrelationData).toBeInstanceOf(Buffer)
    })

    test('validates URL formats and createClient input guards', async () => {
        const service = createMqttService({
            app: {},
            store: {},
            router: {}
        })

        expect(service._isValidUrl('mqtt://broker.local')).toBe(true)
        expect(service._isValidUrl('mqtts://broker.local')).toBe(true)
        expect(service._isValidUrl('ws://broker.local')).toBe(true)
        expect(service._isValidUrl('wss://broker.local')).toBe(true)
        expect(service._isValidUrl('')).toBe(false)
        expect(service._isValidUrl('ftp://broker.local')).toBe(false)
        expect(service._isValidUrl('://broken')).toBe(false)
        expect(service._isValidUrl(null)).toBe(false)

        await expect(service.createClient('', { getCredentials: async () => ({ url: 'mqtt://example.com', username: 'user', password: 'pass' }) })).rejects.toThrow('MQTT connection key is required')
        await expect(service.createClient('bad-url', { getCredentials: async () => ({ url: 'http://example.com', username: 'user', password: 'pass' }) })).rejects.toThrow('MQTT credential provider for connection "bad-url" must return a valid url')
        await expect(service.createClient('missing-provider')).rejects.toThrow('MQTT connection "missing-provider" requires a getCredentials callback')
        await expect(service.createClient('missing-username', { getCredentials: async () => ({ url: 'mqtt://example.com', password: 'pass' }) })).rejects.toThrow('MQTT credential provider for connection "missing-username" must return a non-empty username')
        await expect(service.createClient('missing-password', { getCredentials: async () => ({ url: 'mqtt://example.com', username: 'user' }) })).rejects.toThrow('MQTT credential provider for connection "missing-password" must return a non-empty password')
        await expect(service.createClient('blank-client-id', { getCredentials: async () => ({ url: 'mqtt://example.com', username: 'user', password: 'pass', clientId: '   ' }) })).rejects.toThrow('MQTT credential provider for connection "blank-client-id" must return a non-empty clientId when provided')

        service.$destroyed = true
        await expect(service.createClient('destroyed-create', { getCredentials: async () => ({ url: 'mqtt://example.com', username: 'user', password: 'pass' }) })).rejects.toThrow('MqttService has been destroyed')
    })

    test('registers event handlers and skips invocation when destroyed', async () => {
        const service = createMqttService({
            app: {},
            store: {},
            router: {}
        })
        service.$destroyed = false

        const client = createMockClient()
        mockConnect.mockReturnValueOnce(client)

        const onConnect = vi.fn()
        const onClose = vi.fn()
        const onOffline = vi.fn()
        const onError = vi.fn()
        const onMessage = vi.fn()

        await service.createClient('events-key', {
            getCredentials: async () => ({ url: 'mqtt://example.com', username: 'user', password: 'pass' }),
            reconnect: { enabled: false },
            onConnect,
            onClose,
            onOffline,
            onError,
            onMessage
        })

        client.emit('connect', { ok: true })
        client.emit('close')
        client.emit('offline')
        client.emit('error', new Error('boom'))
        client.emit('message', 'topic/a', Buffer.from('x'), { qos: 1 })

        await vi.waitFor(() => {
            expect(onConnect).toHaveBeenCalledTimes(1)
        })
        expect(onClose).toHaveBeenCalledTimes(1)
        expect(onOffline).toHaveBeenCalledTimes(1)
        expect(onError).toHaveBeenCalledTimes(1)
        expect(onMessage).toHaveBeenCalledTimes(1)

        const managed = service.getManagedClient('events-key')
        managed.destroyed = true
        service.$destroyed = true
        client.emit('connect', { ok: false })
        expect(onConnect).toHaveBeenCalledTimes(1)
    })

    test('createClient replaces existing client and performs listener cleanup', async () => {
        const service = createMqttService({
            app: {},
            store: {},
            router: {}
        })

        const first = createMockClient()
        const second = createMockClient()
        mockConnect.mockReturnValueOnce(first).mockReturnValueOnce(second)

        await service.createClient('replace-key', {
            getCredentials: async () => ({ url: 'mqtt://example.com', username: 'user', password: 'pass' }),
            onConnect: true
        })
        await service.createClient('replace-key', { getCredentials: async () => ({ url: 'mqtt://example.com', username: 'user', password: 'pass' }) })

        expect(first.end).toHaveBeenCalledTimes(1)
        expect(first.off).toHaveBeenCalled()
        expect(service.getManagedClient('replace-key').client).toBe(second)
    })

    test('reconnects with fresh credentials and replays remembered subscriptions', async () => {
        vi.useFakeTimers()

        const service = createMqttService({
            app: {},
            store: {},
            router: {}
        })

        const firstClient = createMockClient()
        const secondClient = createMockClient()
        firstClient.connected = true
        secondClient.connected = true

        mockConnect
            .mockReturnValueOnce(firstClient)
            .mockReturnValueOnce(secondClient)

        const getCredentials = vi.fn()
            .mockResolvedValueOnce({
                url: 'mqtt://example.com',
                username: 'first',
                password: 'one'
            })
            .mockResolvedValueOnce({
                url: 'mqtt://example.com',
                username: 'second',
                password: 'two'
            })

        try {
            await service.createClient('reconnect-key', {
                getCredentials,
                reconnect: {
                    enabled: true,
                    initialDelay: 1000,
                    maxDelay: 5000,
                    factor: 2
                }
            })

            await service.subscribe('reconnect-key', 'topic/a', { qos: 1 })

            firstClient.emit('connect')
            firstClient.emit('offline')

            await vi.advanceTimersByTimeAsync(1000)

            expect(getCredentials).toHaveBeenCalledTimes(2)
            expect(firstClient.end).toHaveBeenCalledTimes(1)
            expect(service.getManagedClient('reconnect-key').client).toBe(secondClient)

            secondClient.emit('connect')

            expect(secondClient.subscribe).toHaveBeenCalledWith(
                'topic/a',
                { qos: 1 },
                expect.any(Function)
            )
        } finally {
            vi.useRealTimers()
        }
    })

    test('publishMessage can wait for a connection before publishing', async () => {
        vi.useFakeTimers()

        const service = createMqttService({
            app: {},
            store: {},
            router: {}
        })

        const client = createMockClient()
        client.connected = false
        mockConnect.mockReturnValueOnce(client)

        try {
            await service.createClient('wait-publish', {
                getCredentials: async () => ({
                    url: 'mqtt://example.com',
                    username: 'user',
                    password: 'pass'
                }),
                reconnect: { enabled: false }
            })

            const publishPromise = service.publishMessage('wait-publish', {
                topic: 'topic/a',
                payload: 'x',
                waitForConnection: true,
                connectionTimeout: 5000
            })

            await vi.advanceTimersByTimeAsync(1000)
            expect(client.publish).not.toHaveBeenCalled()

            client.connected = true
            client.emit('connect')

            await publishPromise

            expect(client.publish).toHaveBeenCalledTimes(1)
        } finally {
            vi.useRealTimers()
        }
    })

    test('publishMessage waitForConnection times out cleanly', async () => {
        vi.useFakeTimers()

        const service = createMqttService({
            app: {},
            store: {},
            router: {}
        })

        const client = createMockClient()
        client.connected = false
        mockConnect.mockReturnValueOnce(client)

        try {
            await service.createClient('wait-timeout', {
                getCredentials: async () => ({
                    url: 'mqtt://example.com',
                    username: 'user',
                    password: 'pass'
                }),
                reconnect: { enabled: false }
            })

            const onPublishError = vi.fn()
            const publishPromise = service.publishMessage('wait-timeout', {
                topic: 'topic/a',
                payload: 'x',
                waitForConnection: true,
                connectionTimeout: 1000,
                onError: onPublishError
            })
            const publishExpectation = expect(publishPromise).rejects.toThrow('MQTT connection "wait-timeout" did not connect before the timeout elapsed')

            await vi.advanceTimersByTimeAsync(1000)

            await publishExpectation
            expect(onPublishError).toHaveBeenCalledTimes(1)
            expect(client.publish).not.toHaveBeenCalled()
        } finally {
            vi.useRealTimers()
        }
    })

    test('endConnection prevents reconnect attempts for managed clients', async () => {
        vi.useFakeTimers()

        const service = createMqttService({
            app: {},
            store: {},
            router: {}
        })

        const client = createMockClient()
        mockConnect.mockReturnValueOnce(client)

        try {
            await service.createClient('intentional-close', {
                getCredentials: async () => ({
                    url: 'mqtt://example.com',
                    username: 'user',
                    password: 'pass'
                }),
                reconnect: {
                    enabled: true,
                    initialDelay: 1000
                }
            })

            await service.endConnection('intentional-close')
            client.emit('offline')

            await vi.advanceTimersByTimeAsync(2000)

            expect(mockConnect).toHaveBeenCalledTimes(1)
            expect(service.getManagedClient('intentional-close')).toBeNull()
        } finally {
            vi.useRealTimers()
        }
    })

    test('destroyClient handles missing client, throwing listeners and end callback error', async () => {
        const service = createMqttService({
            app: {},
            store: {},
            router: {}
        })

        await service.destroyClient('unknown-key')

        const client = createMockClient()
        client.end = vi.fn((force, options, callback) => callback(new Error('end-fail')))
        service.$clients.set('destroy-key', {
            key: 'destroy-key',
            client,
            listeners: new Set([
                () => { throw new Error('listener fail') },
                () => {}
            ]),
            destroyed: false
        })

        await service.destroyClient('destroy-key')
        expect(service.hasClient('destroy-key')).toBe(false)
    })

    test('runClientOperation recovers from previous rejection and cleans tracked entry', async () => {
        const service = createMqttService({
            app: {},
            store: {},
            router: {}
        })

        service.$clientOperations.set('ops-key', Promise.reject(new Error('previous')))
        const result = await service.runClientOperation('ops-key', async () => 'ok')
        expect(result).toBe('ok')
        expect(service.$clientOperations.has('ops-key')).toBe(false)

        const deferred = createDeferred()
        const opPromise = service.runClientOperation('ops-key-2', async () => {
            await deferred.promise
            return 'late'
        })
        service.$clientOperations.set('ops-key-2', Promise.resolve('newer'))
        deferred.resolve()
        await opPromise
        expect(service.$clientOperations.has('ops-key-2')).toBe(true)
    })

    test('publishMessage handles missing client, disconnected client without waiting, and publish callback error path', async () => {
        const service = createMqttService({
            app: {},
            store: {},
            router: {}
        })

        await expect(service.publishMessage('missing-key', {
            topic: 'topic/a',
            payload: 'x'
        })).rejects.toThrow('MQTT connection "missing-key" does not exist')

        const disconnected = createMockClient()
        disconnected.connected = false
        service.$clients.set('disconnected-key', {
            key: 'disconnected-key',
            client: disconnected,
            listeners: new Set(),
            destroyed: false
        })
        await expect(service.publishMessage('disconnected-key', {
            topic: 'topic/a',
            payload: 'x',
            waitForConnection: false
        })).rejects.toThrow('MQTT connection "disconnected-key" is not connected')

        const failing = createMockClient()
        const publishError = new Error('publish failed')
        failing.publish = vi.fn((topic, payload, options, callback) => callback(publishError))
        mockConnect.mockReturnValueOnce(failing)
        await service.createClient('publish-error-key', { getCredentials: async () => ({ url: 'mqtt://example.com', username: 'user', password: 'pass' }) })

        const onPublishError = vi.fn()
        await expect(service.publishMessage('publish-error-key', {
            topic: 'topic/a',
            payload: 'x',
            onError: onPublishError
        })).rejects.toThrow('publish failed')
        expect(onPublishError).toHaveBeenCalledWith(publishError)

        await expect(service.publishMessage('publish-error-key', {
            topic: 'topic/a',
            payload: 'x'
        })).rejects.toThrow('publish failed')
    })

    test('subscribe and unsubscribe handle all branches', async () => {
        const service = createMqttService({
            app: {},
            store: {},
            router: {}
        })

        await expect(service.subscribe('missing-sub', 'topic/a')).rejects.toThrow('MQTT connection "missing-sub" does not exist')

        const disconnected = createMockClient()
        disconnected.connected = false
        service.$clients.set('sub-disconnected', {
            key: 'sub-disconnected',
            client: disconnected,
            listeners: new Set(),
            destroyed: false
        })
        await expect(service.subscribe('sub-disconnected', 'topic/a')).rejects.toThrow('MQTT connection "sub-disconnected" is not connected')

        const subErrorClient = createMockClient()
        subErrorClient.subscribe = vi.fn((topic, options, callback) => callback(new Error('sub fail')))
        service.$clients.set('sub-error', {
            key: 'sub-error',
            client: subErrorClient,
            listeners: new Set(),
            destroyed: false
        })
        await expect(service.subscribe('sub-error', 'topic/a')).rejects.toThrow('sub fail')

        const subOkClient = createMockClient()
        service.$clients.set('sub-ok', {
            key: 'sub-ok',
            client: subOkClient,
            listeners: new Set(),
            destroyed: false
        })
        await service.subscribe('sub-ok', 'topic/a')

        await expect(service.unsubscribe('missing-unsub', 'topic/a')).resolves.toBeUndefined()

        service.$clients.set('unsub-disconnected', {
            key: 'unsub-disconnected',
            client: disconnected,
            listeners: new Set(),
            destroyed: false
        })
        await expect(service.unsubscribe('unsub-disconnected', 'topic/a')).rejects.toThrow('MQTT connection "unsub-disconnected" is not connected')

        const unsubErrorClient = createMockClient()
        unsubErrorClient.unsubscribe = vi.fn((topic, callback) => callback(new Error('unsub fail')))
        service.$clients.set('unsub-error', {
            key: 'unsub-error',
            client: unsubErrorClient,
            listeners: new Set(),
            destroyed: false
        })
        await expect(service.unsubscribe('unsub-error', 'topic/a')).rejects.toThrow('unsub fail')

        const unsubOkClient = createMockClient()
        service.$clients.set('unsub-ok', {
            key: 'unsub-ok',
            client: unsubOkClient,
            listeners: new Set(),
            destroyed: false
        })
        await service.unsubscribe('unsub-ok', 'topic/a')
    })

    test('helper methods cover normalization branches including Buffer fallback', async () => {
        const service = createMqttService({
            app: {},
            store: {},
            router: {}
        })

        expect(service._isPlainObject({ a: 1 })).toBe(true)
        expect(service._isPlainObject(Object.create(null))).toBe(true)
        expect(service._isPlainObject([])).toBe(false)
        expect(service._isPlainObject(null)).toBe(false)
        expect(service._isBinaryPayload(new Uint8Array([1]))).toBe(true)
        expect(service._isBinaryPayload(new ArrayBuffer(2))).toBe(true)
        expect(service._isBinaryPayload('nope')).toBe(false)

        const buf = Buffer.from([1, 2])
        expect(service._normalizeBinaryPayload(buf)).toBe(buf)
        expect(service._normalizeBinaryPayload(new Uint8Array([1, 2]))).toBeInstanceOf(Buffer)
        expect(service._normalizeBinaryPayload(new ArrayBuffer(2))).toBeInstanceOf(Buffer)
        expect(service._normalizePublishPayload(new Uint8Array([1, 2]), 'raw')).toBeInstanceOf(Buffer)

        await expect(service.publishMessage('missing', {
            topic: 'a',
            payload: 123,
            serialize: 'invalid'
        })).rejects.toThrow('MQTT connection "missing" does not exist')

        expect(() => service._normalizePublishPayload(Symbol('s'))).toThrow('Unsupported MQTT payload type for auto serialization')
        expect(() => service._normalizePublishPayload('x', 'unknown')).toThrow('Invalid MQTT payload serialization mode: "unknown"')
        expect(() => service._normalizeCorrelationData(123)).toThrow('MQTT publish correlationData must be a string or binary value')
        expect(service._normalizeUserProperties({})).toBeUndefined()
        expect(() => service._normalizeUserProperties({ '': 'x' })).toThrow('MQTT publish userProperties keys must be non-empty strings')
        expect(service._normalizePublishProperties({ correlationData: null, userProperties: null })).toBeUndefined()

        const originalBuffer = global.Buffer
        // Exercise browser fallback branches by temporarily hiding Buffer.
        global.Buffer = undefined
        try {
            const typed = service._normalizeBinaryPayload(new Uint8Array([9, 8]))
            expect(typed).toBeInstanceOf(Uint8Array)

            const fromArrayBuffer = service._normalizeBinaryPayload(new ArrayBuffer(3))
            expect(fromArrayBuffer).toBeInstanceOf(Uint8Array)

            const correlationFallback = service._normalizeCorrelationData('abc')
            expect(correlationFallback.constructor.name).toBe('Uint8Array')
        } finally {
            global.Buffer = originalBuffer
        }
    })

    test('service lifecycle exports: singleton, endConnection, reset, destroy and destroyMqttService', async () => {
        const mqttServiceModule = await import('../../../../frontend/src/services/mqtt.service.js')
        const { createMqttService, destroyMqttService } = mqttServiceModule

        await destroyMqttService()

        const implicit = createMqttService()
        expect(implicit).toBeTruthy()
        await destroyMqttService()

        const first = createMqttService({ app: { a: 1 }, store: {}, router: {} })
        const second = createMqttService({ app: { a: 2 }, store: {}, router: {} })
        expect(first).toBe(second)

        const fresh = new first.constructor({ app: {}, store: {}, router: {} })
        expect(fresh.$services).toEqual({})
        await expect(fresh.createClient('missing-options', { getCredentials: async () => ({ url: 'mqtt://example.com', username: '', password: 'pass' }) })).rejects.toThrow('MQTT credential provider for connection "missing-options" must return a non-empty username')
        await expect(fresh.publishMessage('missing-key')).rejects.toThrow('MQTT connection "missing-key" does not exist')

        const client = createMockClient()
        mockConnect.mockReturnValueOnce(client)
        await first.createClient('lifecycle-key', { getCredentials: async () => ({ url: 'mqtt://example.com', username: 'user', password: 'pass' }) })

        await first.endConnection('lifecycle-key')
        expect(first.getManagedClient('lifecycle-key')).toBeNull()

        await first.reset()
        expect(first.$destroyed).toBe(false)
        expect(first.$mqtt).toBeTruthy()

        await first.destroy()
        expect(first.$destroyed).toBe(true)
        expect(first.$mqtt).toBeNull()
        expect(first.$clients.size).toBe(0)

        await destroyMqttService()
        await destroyMqttService()
    })
})
