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
    return {
        on: vi.fn(),
        off: vi.fn(),
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
            await service.createClient('shared-key', { url: 'mqtt://example.com' })

            secondCreate = service.createClient('shared-key', { url: 'mqtt://example.com' })
            thirdCreate = service.createClient('shared-key', { url: 'mqtt://example.com' })

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

        await service.createClient('publish-key', { url: 'mqtt://example.com' })

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

        await service.createClient('serialize-key', { url: 'mqtt://example.com' })

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

        await service.createClient('circular-key', { url: 'mqtt://example.com' })

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

        await service.createClient('validate-key', { url: 'mqtt://example.com' })

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

        await service.createClient('properties-key', { url: 'mqtt://example.com' })

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
    })
})
