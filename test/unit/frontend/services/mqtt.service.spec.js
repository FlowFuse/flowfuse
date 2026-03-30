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
        end: vi.fn().mockResolvedValue(),
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

        firstClient.end = vi.fn().mockImplementation(() => firstDestroyDeferred.promise)

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
})
