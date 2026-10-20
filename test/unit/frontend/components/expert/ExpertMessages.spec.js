import { createTestingPinia } from '@pinia/testing'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, test, vi } from 'vitest'

vi.mock('../../../../../frontend/src/services/product.js', () => ({
    default: { capture: vi.fn() }
}))

// The flows list pulls in the CJS flow renderer, which cannot load in the test environment
vi.mock('@flowfuse/flow-renderer', () => ({
    default: class FlowRenderer {}
}))

const ExpertMessages = (await import('../../../../../frontend/src/components/expert/components/ExpertMessages.vue')).default
const { useProductExpertSupportAgentStore } = await import('../../../../../frontend/src/stores/product-expert-support-agent.js')
const { useAccountSettingsStore } = await import('../../../../../frontend/src/stores/account-settings.js')

const AiMessageStub = { name: 'AiMessage', props: ['_uuid', 'feedback'], template: '<div data-stub="ai-message" />' }

const ai = (_uuid) => ({ _type: 'ai', _uuid, _transactionId: `tx-${_uuid}`, _timestamp: 1, _streamed: true, answer: [{ kind: 'chat', content: _uuid }] })
const human = (_uuid) => ({ _type: 'human', _uuid, _timestamp: 1, content: _uuid })

function feedbackFlags (options) {
    const pinia = createTestingPinia({ createSpy: vi.fn, stubActions: false })
    useProductExpertSupportAgentStore(pinia).messages = options.messages
    useAccountSettingsStore(pinia).featuresCheck = { isExternalMqttBrokerFeatureEnabled: options.mqtt ?? true, deployment: options.deployment ?? 'cloud' }
    const wrapper = mount(ExpertMessages, {
        global: {
            plugins: [pinia],
            stubs: { AiMessage: AiMessageStub, HumanMessage: true, SystemMessage: true, FlowFuseEventCard: true, ExpertLoadingIndicator: true },
            provide: { 'expert-surface': 'drawer' }
        }
    })
    return wrapper.findAllComponents(AiMessageStub).map(c => c.props('feedback'))
}

describe('ExpertMessages feedback placement', () => {
    beforeEach(() => {
        vi.stubGlobal('ResizeObserver', class { observe () {} disconnect () {} })
    })

    const turns = () => [human('h1'), ai('a1'), ai('a2'), human('h2'), ai('a3')]

    test('flags only the last answer of each turn', () => {
        expect(feedbackFlags({ messages: turns() })).toEqual([false, true, true])
    })

    test('flags nothing outside the cloud deployment', () => {
        expect(feedbackFlags({ messages: turns(), deployment: 'self-hosted' })).toEqual([false, false, false])
    })

    test('flags nothing without the MQTT transport', () => {
        expect(feedbackFlags({ messages: turns(), mqtt: false })).toEqual([false, false, false])
    })
})
