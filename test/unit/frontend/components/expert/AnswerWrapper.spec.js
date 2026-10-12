import { createTestingPinia } from '@pinia/testing'
import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, test, vi } from 'vitest'

vi.mock('../../../../../frontend/src/services/product.js', () => ({
    default: {
        capture: vi.fn()
    }
}))

// The flows list pulls in the CJS flow renderer, which cannot load in the test environment
vi.mock('@flowfuse/flow-renderer', () => ({
    default: class FlowRenderer {}
}))

const AnswerWrapper = (await import('../../../../../frontend/src/components/expert/components/messages/components/AnswerWrapper.vue')).default
const ToolApprovalCard = (await import('../../../../../frontend/src/components/expert/components/messages/components/resources/ToolApprovalCard.vue')).default
const { useProductExpertStore } = await import('../../../../../frontend/src/stores/product-expert.js')

const approvalAnswer = {
    kind: 'tool-approval',
    id: 'call-1',
    toolUseId: 'call-1',
    toolKey: 'flow_building_add_nodes',
    name: 'Adding Nodes',
    toolClass: 'write',
    params: {},
    status: 'pending',
    _uuid: 'answer-1'
}

async function mountApprovalCard ({ messageUuids, isWaitingForResponse = false }) {
    const pinia = createTestingPinia({ createSpy: vi.fn, stubActions: true })
    const expert = useProductExpertStore(pinia)
    expert.messages = messageUuids.map(_uuid => ({ _uuid }))
    expert.isWaitingForResponse = isWaitingForResponse

    const wrapper = mount(AnswerWrapper, {
        props: { answer: approvalAnswer, messageUuid: 'message-1', instant: true },
        global: {
            plugins: [pinia],
            stubs: { 'message-bubble': { template: '<div><slot /></div>' } }
        }
    })
    // the card joins the streaming order on mount and renders on the next tick
    await flushPromises()
    return wrapper.findComponent(ToolApprovalCard)
}

describe('AnswerWrapper approval card', () => {
    test('can be answered while it is the latest message', async () => {
        const card = await mountApprovalCard({ messageUuids: ['message-1'] })
        expect(card.props('disabled')).toBe(false)
    })

    test('goes inactive once a newer message arrives', async () => {
        const card = await mountApprovalCard({ messageUuids: ['message-1', 'instance-ready-event'] })
        expect(card.props('disabled')).toBe(true)
    })

    test('is inactive while a reply is in flight', async () => {
        const card = await mountApprovalCard({ messageUuids: ['message-1'], isWaitingForResponse: true })
        expect(card.props('disabled')).toBe(true)
    })
})
