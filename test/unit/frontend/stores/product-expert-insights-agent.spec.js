import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useProductExpertInsightsAgentStore } from '@/stores/product-expert-insights-agent.js'

vi.mock('@/stores/_account_bridge.js', () => ({
    useAccountBridge: vi.fn(() => ({ team: { id: 'team-1' } }))
}))

vi.mock('@/api/expert.js', () => ({
    default: {
        getCapabilities: vi.fn()
    }
}))

// imported after mocks so vi.mock hoisting resolves correctly
const { default: expertApi } = await import('@/api/expert.js')

describe('product-expert-insights-agent store', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        vi.clearAllMocks()
    })

    it('initializes with empty capabilities and messages', () => {
        const store = useProductExpertInsightsAgentStore()
        expect(store.capabilities).toEqual([])
        expect(store.messages).toEqual([])
        expect(store.sessionId).toBeNull()
        expect(store.selectedCapabilities).toEqual([])
        expect(store.abortController).toBeNull()
    })

    it('getCapabilities fetches and stores server list', async () => {
        const store = useProductExpertInsightsAgentStore()
        const server = { id: 'srv-1', resources: [], tools: [], prompts: [] }
        vi.spyOn(expertApi, 'getCapabilities').mockResolvedValue({ servers: [server] })
        await store.getCapabilities()
        // capabilities getter maps capabilityServers and adds toolCount
        expect(store.capabilities).toEqual([{ ...server, toolCount: 0 }])
        expect(store.capabilityServers).toEqual([server])
    })

    it('getCapabilities handles missing servers key', async () => {
        const store = useProductExpertInsightsAgentStore()
        vi.spyOn(expertApi, 'getCapabilities').mockResolvedValue({})
        await store.getCapabilities()
        expect(store.capabilityServers).toEqual([])
    })

    it('capabilities getter computes toolCount correctly', () => {
        const store = useProductExpertInsightsAgentStore()
        store.capabilityServers = [{
            id: 'srv-1',
            resources: ['r1', 'r2'],
            tools: ['t1'],
            prompts: ['p1', 'p2', 'p3']
        }]
        expect(store.capabilities[0].toolCount).toBe(6)
    })

    it('setSelectedCapabilities updates selectedCapabilities', () => {
        const store = useProductExpertInsightsAgentStore()
        store.setSelectedCapabilities(['cap-a', 'cap-b'])
        expect(store.selectedCapabilities).toEqual(['cap-a', 'cap-b'])
    })

    it('setSessionCheckTimer stores the timer reference', () => {
        const store = useProductExpertInsightsAgentStore()
        const fakeTimer = setInterval(() => {}, 9999)
        store.setSessionCheckTimer(fakeTimer)
        expect(store.sessionCheckTimer).toBe(fakeTimer)
        clearInterval(fakeTimer)
    })

    it('reset clears timer and resets all state', () => {
        const store = useProductExpertInsightsAgentStore()
        const fakeTimer = setInterval(() => {}, 9999)
        const clearSpy = vi.spyOn(globalThis, 'clearInterval')
        store.setSessionCheckTimer(fakeTimer)
        store.sessionId = 'sess-abc'
        store.abortController = new AbortController()
        store.capabilityServers = [{ id: 'srv-1' }]
        store.reset()
        expect(clearSpy).toHaveBeenCalledWith(fakeTimer)
        expect(store.sessionId).toBeNull()
        expect(store.abortController).toBeNull()
        expect(store.capabilityServers).toEqual([])
        expect(store.messages).toEqual([])
        clearInterval(fakeTimer)
    })

    it('reset with no timer does not throw', () => {
        const store = useProductExpertInsightsAgentStore()
        expect(() => store.reset()).not.toThrow()
    })
})
