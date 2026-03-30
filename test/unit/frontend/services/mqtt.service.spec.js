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
})
