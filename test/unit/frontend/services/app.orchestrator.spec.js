import { beforeEach, describe, expect, test, vi } from 'vitest'

const mockCreateBootstrapService = vi.fn()
const mockCreateMessagingService = vi.fn()
const mockCreateMqttService = vi.fn()
const mockCreateTeamChannelSubscriber = vi.fn()
const mockCreateMqttTransport = vi.fn()

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

vi.mock('../../../../frontend/src/transport/mqtt.transport.js', () => {
    return {
        createMqttTransport: mockCreateMqttTransport
    }
})

vi.mock('../../../../frontend/src/subscribers/team-channel.subscriber.js', () => {
    return {
        createTeamChannelSubscriber: mockCreateTeamChannelSubscriber
    }
})

async function loadOrchestratorModule () {
    vi.resetModules()
    return await import('../../../../frontend/src/services/app.orchestrator.ts')
}

function seedServices () {
    const bootstrapService = { name: 'bootstrap', init: vi.fn(), destroy: vi.fn().mockResolvedValue() }
    const postMessageService = { name: 'postMessage', destroy: vi.fn().mockResolvedValue() }
    const mqttService = { name: 'mqtt', destroy: vi.fn().mockResolvedValue() }
    const teamChannelSubscriber = { name: 'teamChannel', destroy: vi.fn().mockResolvedValue() }
    const transport = { name: 'mqtt-transport' }

    mockCreateBootstrapService.mockReturnValue(bootstrapService)
    mockCreateMessagingService.mockReturnValue(postMessageService)
    mockCreateMqttService.mockReturnValue(mqttService)
    mockCreateMqttTransport.mockReturnValue(transport)
    mockCreateTeamChannelSubscriber.mockReturnValue(teamChannelSubscriber)

    return { bootstrapService, postMessageService, mqttService, teamChannelSubscriber, transport }
}

describe('AppOrchestrator', () => {
    beforeEach(() => {
        mockCreateBootstrapService.mockReset()
        mockCreateMessagingService.mockReset()
        mockCreateMqttService.mockReset()
        mockCreateMqttTransport.mockReset()
        mockCreateTeamChannelSubscriber.mockReset()
    })

    test('init boots services + subscribers, injects shared instances, and provides them on the app', async () => {
        const { bootstrapService, postMessageService, mqttService, teamChannelSubscriber, transport } = seedServices()

        const app = { provide: vi.fn(), unmount: vi.fn() }
        const router = {}

        const { getAppOrchestrator } = await loadOrchestratorModule()
        const orchestrator = getAppOrchestrator()

        await orchestrator.init(app, router)

        const bootstrapArgs = mockCreateBootstrapService.mock.calls[0][0]
        const messagingArgs = mockCreateMessagingService.mock.calls[0][0]
        const mqttArgs = mockCreateMqttService.mock.calls[0][0]

        expect(bootstrapArgs).toMatchObject({ app, router })
        expect(messagingArgs).toMatchObject({ app, router })
        expect(mqttArgs).toMatchObject({ app, router })

        // services share one instances bag (no teamChannel — that's a subscriber now)
        expect(messagingArgs.services).toBe(bootstrapArgs.services)
        expect(bootstrapArgs.services).toMatchObject({
            bootstrap: bootstrapService,
            postMessage: postMessageService,
            mqtt: mqttService
        })
        expect(bootstrapArgs.services.teamChannel).toBeUndefined()

        // transport is built over the mqtt service and injected into the subscriber
        expect(mockCreateMqttTransport).toHaveBeenCalledWith(mqttService)
        const subscriberArgs = mockCreateTeamChannelSubscriber.mock.calls[0][0]
        expect(subscriberArgs).toMatchObject({ app, router, transport })
        expect(subscriberArgs.subscribers).toMatchObject({ teamChannel: teamChannelSubscriber })

        expect(bootstrapService.init).toHaveBeenCalledTimes(1)
        expect(app.provide).toHaveBeenCalledWith('$services', orchestrator.$serviceInstances)
        expect(app.provide).toHaveBeenCalledWith('$subscribers', orchestrator.$subscriberInstances)
    })

    test('dispose destroys services + subscribers and resets internal state', async () => {
        const { bootstrapService, postMessageService, mqttService, teamChannelSubscriber } = seedServices()
        mqttService.destroy.mockRejectedValueOnce(new Error('destroy failed'))

        const app = { provide: vi.fn(), unmount: vi.fn() }
        const router = {}

        const { getAppOrchestrator } = await loadOrchestratorModule()
        const orchestrator = getAppOrchestrator()

        await orchestrator.init(app, router)
        bootstrapService.destroy.mockClear()
        postMessageService.destroy.mockClear()
        mqttService.destroy.mockClear()
        teamChannelSubscriber.destroy.mockClear()
        await orchestrator.dispose()

        expect(teamChannelSubscriber.destroy).toHaveBeenCalledTimes(1)
        expect(bootstrapService.destroy).toHaveBeenCalledTimes(1)
        expect(postMessageService.destroy).toHaveBeenCalledTimes(1)
        expect(mqttService.destroy).toHaveBeenCalledTimes(1)
        expect(orchestrator.$serviceInstances).toEqual({
            bootstrap: null,
            postMessage: null,
            mqtt: null
        })
        expect(orchestrator.$subscriberInstances).toEqual({ teamChannel: null })
        expect(orchestrator.$app).toBeNull()
        expect(orchestrator.$router).toBeNull()
        expect(orchestrator.$cleanupRegistered).toBe(false)
    })

    test('registerCleanup wraps unmount once and runs dispose before original unmount', async () => {
        seedServices()

        const app = { provide: vi.fn(), unmount: vi.fn().mockReturnValue('unmounted') }
        const originalUnmount = app.unmount

        const { getAppOrchestrator } = await loadOrchestratorModule()
        const orchestrator = getAppOrchestrator()
        const disposeSpy = vi.spyOn(orchestrator, 'dispose')

        await orchestrator.init(app, {})
        disposeSpy.mockClear()

        await orchestrator.registerCleanup()
        await orchestrator.registerCleanup()

        const result = await app.unmount('arg1')

        expect(disposeSpy).toHaveBeenCalledTimes(1)
        expect(result).toBe('unmounted')
        expect(originalUnmount).toHaveBeenCalledWith('arg1')
    })

    test('getAppOrchestrator returns a singleton instance', async () => {
        const { getAppOrchestrator } = await loadOrchestratorModule()

        const first = getAppOrchestrator()
        const second = getAppOrchestrator()

        expect(first).toBe(second)
    })
})
