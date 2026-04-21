import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useContextStore } from '@/stores/context.js'
import { useProductBrokersStore } from '@/stores/product-brokers.js'

vi.mock('@/stores/context.js', () => ({
    useContextStore: vi.fn(() => ({ team: { id: 'team-1', slug: 'my-team' } }))
}))

describe('product-brokers store', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        vi.mocked(useContextStore).mockReturnValue({ team: { id: 'team-1', slug: 'my-team' } })
    })

    describe('initial state', () => {
        it('initializes with null flags and interview', () => {
            const store = useProductBrokersStore()
            expect(store.flags).toBeNull()
            expect(store.interview).toBeNull()
        })

        it('initializes with empty UNS clients and brokers', () => {
            const store = useProductBrokersStore()
            expect(store.UNS.clients).toEqual([])
            expect(store.UNS.brokers).toEqual([])
        })

        it('initializes with empty expandedTopics', () => {
            const store = useProductBrokersStore()
            expect(store.brokers.expandedTopics).toEqual({})
        })
    })

    describe('getters', () => {
        it('hasFfUnsClients returns false when no clients', () => {
            const store = useProductBrokersStore()
            expect(store.hasFfUnsClients).toBe(false)
        })

        it('hasFfUnsClients returns true when clients exist', () => {
            const store = useProductBrokersStore()
            store.UNS.clients = [{ id: 'client-1' }]
            expect(store.hasFfUnsClients).toBe(true)
        })

        it('hasBrokers returns false when no brokers', () => {
            const store = useProductBrokersStore()
            expect(store.hasBrokers).toBe(false)
        })

        it('hasBrokers returns true when brokers exist', () => {
            const store = useProductBrokersStore()
            store.UNS.brokers = [{ id: 'broker-1' }]
            expect(store.hasBrokers).toBe(true)
        })

        it('brokerExpandedTopics returns empty object when no team', () => {
            vi.mocked(useContextStore).mockReturnValue({ team: null })
            const store = useProductBrokersStore()
            expect(store.brokerExpandedTopics('broker-1')).toEqual({})
        })

        it('brokerExpandedTopics returns empty object when no brokerId', () => {
            const store = useProductBrokersStore()
            expect(store.brokerExpandedTopics(null)).toEqual({})
        })

        it('brokerExpandedTopics returns empty object when path not initialized', () => {
            const store = useProductBrokersStore()
            expect(store.brokerExpandedTopics('broker-1')).toEqual({})
        })

        it('brokerExpandedTopics returns topics for the given broker', () => {
            const store = useProductBrokersStore()
            store.brokers.expandedTopics['my-team'] = { 'broker-1': { 'sensors/#': '' } }
            expect(store.brokerExpandedTopics('broker-1')).toEqual({ 'sensors/#': '' })
        })
    })

    describe('addFfBroker', () => {
        it('does not add FF broker when no clients exist', () => {
            const store = useProductBrokersStore()
            store.addFfBroker()
            expect(store.UNS.brokers).toEqual([])
        })

        it('adds FF broker when clients exist and no local broker present', () => {
            const store = useProductBrokersStore()
            store.UNS.clients = [{ id: 'client-1' }]
            store.addFfBroker()
            expect(store.UNS.brokers).toHaveLength(1)
            expect(store.UNS.brokers[0]).toMatchObject({ id: 'team-broker', local: true, name: 'FlowFuse Broker' })
        })

        it('does not add FF broker when one already exists', () => {
            const store = useProductBrokersStore()
            store.UNS.clients = [{ id: 'client-1' }]
            store.UNS.brokers = [{ id: 'team-broker', local: true }]
            store.addFfBroker()
            expect(store.UNS.brokers).toHaveLength(1)
        })
    })

    describe('removeFfBroker', () => {
        it('removes the local FF broker', () => {
            const store = useProductBrokersStore()
            store.UNS.brokers = [{ id: 'team-broker', local: true }, { id: 'external-1' }]
            store.removeFfBroker()
            expect(store.UNS.brokers).toEqual([{ id: 'external-1' }])
        })
    })

    describe('clearUns', () => {
        it('clears UNS brokers and clients', () => {
            const store = useProductBrokersStore()
            store.UNS.brokers = [{ id: 'b1' }]
            store.UNS.clients = [{ id: 'c1' }]
            store.clearUns()
            expect(store.UNS.brokers).toEqual([])
            expect(store.UNS.clients).toEqual([])
        })
    })

    describe('handleBrokerTopicState', () => {
        it('creates team/broker path and adds topic on first call', () => {
            const store = useProductBrokersStore()
            store.handleBrokerTopicState({ topic: 'sensors/#', brokerId: 'broker-1' })
            expect(store.brokers.expandedTopics['my-team']['broker-1']).toHaveProperty('sensors/#')
        })

        it('removes topic on second call (toggle off)', () => {
            const store = useProductBrokersStore()
            store.handleBrokerTopicState({ topic: 'sensors/#', brokerId: 'broker-1' })
            store.handleBrokerTopicState({ topic: 'sensors/#', brokerId: 'broker-1' })
            expect(store.brokers.expandedTopics['my-team']['broker-1']).not.toHaveProperty('sensors/#')
        })

        it('adds a second topic without removing the first', () => {
            const store = useProductBrokersStore()
            store.handleBrokerTopicState({ topic: 'sensors/#', brokerId: 'broker-1' })
            store.handleBrokerTopicState({ topic: 'actuators/#', brokerId: 'broker-1' })
            expect(store.brokers.expandedTopics['my-team']['broker-1']).toHaveProperty('sensors/#')
            expect(store.brokers.expandedTopics['my-team']['broker-1']).toHaveProperty('actuators/#')
        })

        it('scopes topics per broker', () => {
            const store = useProductBrokersStore()
            store.handleBrokerTopicState({ topic: 'sensors/#', brokerId: 'broker-1' })
            store.handleBrokerTopicState({ topic: 'sensors/#', brokerId: 'broker-2' })
            expect(store.brokers.expandedTopics['my-team']['broker-1']).toHaveProperty('sensors/#')
            expect(store.brokers.expandedTopics['my-team']['broker-2']).toHaveProperty('sensors/#')
        })
    })

    describe('fetchUnsClients', () => {
        it('sets UNS.clients from API response', async () => {
            const store = useProductBrokersStore()
            const mockClients = [{ id: 'c1' }, { id: 'c2' }]
            const brokerApi = await import('@/api/broker.js')
            vi.spyOn(brokerApi.default, 'getClients').mockResolvedValue({ clients: mockClients })
            await store.fetchUnsClients()
            expect(store.UNS.clients).toEqual(mockClients)
        })
    })

    describe('getBrokers', () => {
        it('sets UNS.brokers and calls addFfBroker', async () => {
            const store = useProductBrokersStore()
            store.UNS.clients = [{ id: 'c1' }]
            const mockBrokers = [{ id: 'b1' }]
            const brokerApi = await import('@/api/broker.js')
            vi.spyOn(brokerApi.default, 'getBrokers').mockResolvedValue({ brokers: mockBrokers })
            await store.getBrokers()
            expect(store.UNS.brokers).toHaveLength(2) // b1 + FF broker
        })
    })
})
