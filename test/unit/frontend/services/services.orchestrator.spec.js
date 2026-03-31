import { beforeEach, describe, expect, test, vi } from 'vitest'

const mockCreateBootstrapService = vi.fn()
const mockCreateMessagingService = vi.fn()
const mockCreateMqttService = vi.fn()

vi.mock('../../../../frontend/src/services/bootstrap.service.js', () => {
    return {
        createBootstrapService: mockCreateBootstrapService
    }
})

vi.mock('../../../../frontend/src/services/post-message.service.js', () => {
    return {
        createMessagingService: mockCreateMessagingService
    }
})

vi.mock('../../../../frontend/src/services/mqtt.service.js', () => {
    return {
        createMqttService: mockCreateMqttService
    }
})

async function loadOrchestratorModule () {
    vi.resetModules()
    return await import('../../../../frontend/src/services/services.orchestrator.js')
}

describe('ServicesOrchestrator', () => {
    beforeEach(() => {
        mockCreateBootstrapService.mockReset()
        mockCreateMessagingService.mockReset()
        mockCreateMqttService.mockReset()
    })

    test('init boots services, injects shared instances, and provides them on the app', async () => {
        const bootstrapService = { name: 'bootstrap', init: vi.fn(), destroy: vi.fn().mockResolvedValue() }
        const postMessageService = { name: 'post-message', destroy: vi.fn().mockResolvedValue() }
        const mqttService = { name: 'mqtt', destroy: vi.fn().mockResolvedValue() }

        mockCreateBootstrapService.mockReturnValue(bootstrapService)
        mockCreateMessagingService.mockReturnValue(postMessageService)
        mockCreateMqttService.mockReturnValue(mqttService)

        const app = {
            provide: vi.fn(),
            unmount: vi.fn()
        }
        const store = {}
        const router = {}

        const { getServicesOrchestrator } = await loadOrchestratorModule()
        const orchestrator = getServicesOrchestrator()

        await orchestrator.init(app, store, router)

        const bootstrapArgs = mockCreateBootstrapService.mock.calls[0][0]
        const messagingArgs = mockCreateMessagingService.mock.calls[0][0]
        const mqttArgs = mockCreateMqttService.mock.calls[0][0]

        expect(bootstrapArgs).toMatchObject({ app, store, router })
        expect(messagingArgs).toMatchObject({ app, store, router })
        expect(mqttArgs).toMatchObject({ app, store, router })

        expect(messagingArgs.services).toBe(bootstrapArgs.services)
        expect(mqttArgs.services).toBe(bootstrapArgs.services)
        expect(bootstrapArgs.services).toMatchObject({
            bootstrap: bootstrapService,
            'post-message': postMessageService,
            mqtt: mqttService
        })

        expect(bootstrapService.init).toHaveBeenCalledTimes(1)
        expect(app.provide).toHaveBeenCalledWith('$services', bootstrapArgs.services)
    })

    test('dispose calls destroy on all services and resets internal state', async () => {
        const bootstrapService = { name: 'bootstrap', init: vi.fn(), destroy: vi.fn().mockResolvedValue() }
        const postMessageService = { name: 'post-message', destroy: vi.fn().mockResolvedValue() }
        const mqttService = { name: 'mqtt', destroy: vi.fn().mockRejectedValue(new Error('destroy failed')) }

        mockCreateBootstrapService.mockReturnValue(bootstrapService)
        mockCreateMessagingService.mockReturnValue(postMessageService)
        mockCreateMqttService.mockReturnValue(mqttService)

        const app = {
            provide: vi.fn(),
            unmount: vi.fn()
        }
        const store = {}
        const router = {}

        const { getServicesOrchestrator } = await loadOrchestratorModule()
        const orchestrator = getServicesOrchestrator()

        await orchestrator.init(app, store, router)
        bootstrapService.destroy.mockClear()
        postMessageService.destroy.mockClear()
        mqttService.destroy.mockClear()
        await orchestrator.dispose()

        expect(bootstrapService.destroy).toHaveBeenCalledTimes(1)
        expect(postMessageService.destroy).toHaveBeenCalledTimes(1)
        expect(mqttService.destroy).toHaveBeenCalledTimes(1)
        expect(orchestrator.$serviceInstances).toEqual({
            bootstrap: null,
            messaging: null,
            mqtt: null,
            'post-message': null
        })
        expect(orchestrator.$app).toBeNull()
        expect(orchestrator.$router).toBeNull()
        expect(orchestrator.$store).toBeNull()
        expect(orchestrator.$cleanupRegistered).toBe(false)
    })

    test('registerCleanup wraps unmount once and runs dispose before original unmount', async () => {
        const bootstrapService = { name: 'bootstrap', init: vi.fn(), destroy: vi.fn().mockResolvedValue() }
        const postMessageService = { name: 'post-message', destroy: vi.fn().mockResolvedValue() }
        const mqttService = { name: 'mqtt', destroy: vi.fn().mockResolvedValue() }

        mockCreateBootstrapService.mockReturnValue(bootstrapService)
        mockCreateMessagingService.mockReturnValue(postMessageService)
        mockCreateMqttService.mockReturnValue(mqttService)

        const app = {
            provide: vi.fn(),
            unmount: vi.fn().mockReturnValue('unmounted')
        }
        const originalUnmount = app.unmount

        const { getServicesOrchestrator } = await loadOrchestratorModule()
        const orchestrator = getServicesOrchestrator()
        const disposeSpy = vi.spyOn(orchestrator, 'dispose')

        await orchestrator.init(app, {}, {})
        disposeSpy.mockClear()

        await orchestrator.registerCleanup()
        await orchestrator.registerCleanup()

        const result = await app.unmount('arg1')

        expect(disposeSpy).toHaveBeenCalledTimes(1)
        expect(result).toBe('unmounted')
        expect(originalUnmount).toHaveBeenCalledWith('arg1')
    })

    test('getServicesOrchestrator returns a singleton instance', async () => {
        const { getServicesOrchestrator } = await loadOrchestratorModule()

        const first = getServicesOrchestrator()
        const second = getServicesOrchestrator()

        expect(first).toBe(second)
    })

    test('init rejects when a service does not respect the runtime contract', async () => {
        mockCreateBootstrapService.mockReturnValue({ name: 'bootstrap', init: vi.fn(), destroy: vi.fn() })
        mockCreateMessagingService.mockReturnValue({ name: 'post-message' })
        mockCreateMqttService.mockReturnValue({ name: 'mqtt', destroy: vi.fn() })

        const app = {
            provide: vi.fn(),
            unmount: vi.fn()
        }

        const { getServicesOrchestrator } = await loadOrchestratorModule()
        const orchestrator = getServicesOrchestrator()

        await expect(orchestrator.init(app, {}, {}))
            .rejects
            .toThrow('Service "post-message" is missing lifecycle method "destroy"')
    })
})
