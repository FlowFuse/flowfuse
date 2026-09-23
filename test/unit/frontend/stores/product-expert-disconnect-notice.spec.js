import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

const mqttService = {
    subscribe: vi.fn(() => Promise.resolve()),
    hasClient: vi.fn(() => false),
    destroyClient: vi.fn(() => Promise.resolve())
}

vi.mock('@/composables/services/MqttExpertTopicHelper', () => ({
    useMqttExpertTopicHelper: () => ({
        buildTopic: () => 'ff/v1/team-1/support/chat/response',
        getEntityTopicPaths: () => ({ entityId: 'team-1', entityType: 'team' })
    })
}))

vi.mock('@/services/app.orchestrator', () => {
    const orchestrator = () => ({ $services: { mqtt: mqttService } })
    return { default: orchestrator, getAppOrchestrator: orchestrator }
})

// imported after mocks so vi.mock hoisting resolves correctly
const { useProductExpertStore } = await import('@/stores/product-expert.js')

// A short drop is invisible to the user: the client reconnects on its own, so telling
// them to "send another message to pick up where we left off" would be wrong, and the
// message would stay in the transcript for good.
describe('product-expert disconnect notice', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        vi.clearAllMocks()
        vi.useFakeTimers()
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    test('stays quiet when the connection comes back before the delay elapses', async () => {
        const store = useProductExpertStore()

        store._onMqttClose()
        await vi.advanceTimersByTimeAsync(14000)
        expect(store.messages).toHaveLength(0)

        await store._onMqttConnect({})
        await vi.advanceTimersByTimeAsync(60000)

        // No disconnect notice, and therefore no "I'm back" either.
        expect(store.messages).toHaveLength(0)
    })

    test('posts the notice once the delay elapses with no reconnect', async () => {
        const store = useProductExpertStore()

        store._onMqttClose()
        await vi.advanceTimersByTimeAsync(14900)
        expect(store.messages).toHaveLength(0)

        await vi.advanceTimersByTimeAsync(100)
        expect(store.messages).toHaveLength(1)
        expect(store.messages[0].errorCode).toBe('con_close')
        expect(store.messages[0].error).toBe(true)
    })

    test('does not stack notices when close fires repeatedly', async () => {
        const store = useProductExpertStore()

        store._onMqttClose()
        store._onMqttClose()
        store._onMqttClose()

        await vi.advanceTimersByTimeAsync(15000)
        expect(store.messages).toHaveLength(1)
    })

    test('still greets on reconnect when the outage lasted long enough to be announced', async () => {
        const store = useProductExpertStore()

        store._onMqttClose()
        await vi.advanceTimersByTimeAsync(15000)
        expect(store.messages).toHaveLength(1)

        await store._onMqttConnect({})
        expect(store.messages).toHaveLength(2)
        expect(store.messages[1].error).toBe(false)
    })

    test('drops a pending notice when the chat is torn down', async () => {
        const store = useProductExpertStore()

        store._onMqttClose()
        store._clearDisconnectNotice()

        await vi.advanceTimersByTimeAsync(60000)
        expect(store.messages).toHaveLength(0)
    })
})
