import { defineStore } from 'pinia'

import brokerApi from '../api/broker.js'

import { useAccountTeamStore } from './account-team.js'

export const useProductBrokersStore = defineStore('product-brokers', {
    state: () => ({
        flags: null,
        interview: null,
        UNS: { clients: [], brokers: [] },
        brokers: { expandedTopics: {} }
    }),
    getters: {
        hasFfUnsClients: (state) => state.UNS.clients.length > 0,
        hasBrokers: (state) => state.UNS.brokers.length > 0,
        brokerExpandedTopics: (state) => (brokerId) => {
            const { team } = useAccountTeamStore()
            if (!team || !brokerId) return {}
            return state.brokers.expandedTopics?.[team.slug]?.[brokerId] ?? {}
        }
    },
    actions: {
        checkFlags () {
            try {
                window.posthog?.onFeatureFlags((flags, values) => {
                    const storeFlags = {}
                    for (const flagName of flags) {
                        const payload = window.posthog?.getFeatureFlagPayload(flagName)
                        storeFlags[flagName] = { value: values[flagName], payload }
                        const flagStartsWithKeyword = flagName.startsWith('interview-')
                        const flagEnabled = window.posthog?.isFeatureEnabled(flagName, { send_event: false })
                        const flagNotShownBefore = !localStorage.getItem('ph-$interview-popup-seen')
                        if (flagStartsWithKeyword && flagEnabled && flagNotShownBefore) {
                            this.interview = { flag: flagName, enabled: flagEnabled, payload }
                        }
                    }
                    this.flags = storeFlags
                })
            } catch (err) {
                console.error('posthog error logging feature flags')
            }
        },
        async fetchUnsClients () {
            const { team } = useAccountTeamStore()
            const response = await brokerApi.getClients(team.id)
            this.UNS.clients = response.clients
        },
        async getBrokers () {
            const { team } = useAccountTeamStore()
            const response = await brokerApi.getBrokers(team.id)
            this.UNS.brokers = response.brokers
            this.addFfBroker()
        },
        async createBroker (payload) {
            const { team } = useAccountTeamStore()
            const broker = await brokerApi.createBroker(team.id, payload).catch(e => e)
            this.UNS.brokers.push(broker)
            return broker
        },
        async updateBroker ({ payload, brokerId }) {
            const { team } = useAccountTeamStore()
            const broker = await brokerApi.updateBroker(team.id, brokerId, payload).catch(e => e)
            const i = this.UNS.brokers.findIndex(b => b.id === broker.id)
            if (i !== -1) this.UNS.brokers[i] = { ...this.UNS.brokers[i], ...broker }
            return broker
        },
        deleteBroker (brokerId) {
            const { team } = useAccountTeamStore()
            return brokerApi.deleteBroker(team.id, brokerId).then(() => {
                const i = this.UNS.brokers.findIndex(b => b.id === brokerId)
                if (i !== -1) this.UNS.brokers.splice(i, 1)
            })
        },
        addFfBroker () {
            if (!this.UNS.brokers.find(b => b.local) && this.UNS.clients.length > 0) {
                this.UNS.brokers.push({ local: true, id: 'team-broker', name: 'FlowFuse Broker', clientId: 'team-broker', host: '??', port: 0, protocol: '', ssl: false, verifySSL: true })
            }
        },
        removeFfBroker () { this.UNS.brokers = this.UNS.brokers.filter(b => !b.local) },
        clearUns () { this.UNS.brokers = []; this.UNS.clients = [] },
        handleBrokerTopicState ({ topic, brokerId }) {
            const { team } = useAccountTeamStore()
            if (!this.brokers.expandedTopics[team.slug]) this.brokers.expandedTopics[team.slug] = {}
            if (!this.brokers.expandedTopics[team.slug][brokerId]) {
                this.brokers.expandedTopics[team.slug][brokerId] = {}
                this.brokers.expandedTopics[team.slug][brokerId][topic] = ''
                return
            }
            if (Object.prototype.hasOwnProperty.call(this.brokers.expandedTopics[team.slug][brokerId], topic)) {
                delete this.brokers.expandedTopics[team.slug][brokerId][topic]
            } else {
                this.brokers.expandedTopics[team.slug][brokerId][topic] = ''
            }
        }
    },
    persist: {
        pick: ['brokers'],
        storage: localStorage
    }
})
