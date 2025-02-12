import brokerApi from '../api/broker.js'

// initial state
const state = () => ({
    flags: null,
    interview: null,
    UNS: {
        clients: [],
        brokers: []
    },
    brokers: {
        expandedTopics: {}
    }
})

// getters
const getters = {
    hasFfUnsClients: state => state.UNS.clients.length > 0,
    hasBrokers: state => state.UNS.brokers.length > 0,
    brokerExpandedTopics: (state, getters, rootState) => (brokerId) => {
        const team = rootState.account.team

        if (
            !team ||
            !brokerId ||
            !Object.prototype.hasOwnProperty.call(state.brokers.expandedTopics, team.slug) ||
            !Object.prototype.hasOwnProperty.call(state.brokers.expandedTopics[team.slug], brokerId)
        ) {
            return {}
        }

        return state.brokers.expandedTopics[team.slug][brokerId]
    }
}

const mutations = {
    setFlags (state, flags) {
        state.flags = flags
    },
    setInterview (state, payload) {
        state.interview = payload
    },
    setUnsClients (state, payload) {
        state.UNS.clients = payload
    },
    setUnsBrokers (state, payload) {
        state.UNS.brokers = payload
    },
    pushBroker (state, payload) {
        state.UNS.brokers.push(payload)
    },
    pushFfBroker (state, payload) {
        if (!state.UNS.brokers.find(b => b.local) && state.UNS.clients.length > 0) {
            // Artificially adding the flowfuse broker in the list
            state.UNS.brokers.push({
                local: true,
                id: 'team-broker',
                name: 'FlowFuse Broker',
                clientId: 'team-broker',
                host: '??',
                port: 0,
                protocol: '',
                ssl: false,
                verifySSL: true
            })
        }
    },
    removeFfBroker (state, payload) {
        state.UNS.brokers = state.UNS.brokers.filter(b => !b.local)
    },
    updateBroker (state, payload) {
        for (let i = 0; i < state.UNS.brokers.length; i++) {
            if (state.UNS.brokers[i].id === payload.id) {
                state.UNS.brokers[i] = { ...state.UNS.brokers[i], ...payload }
            }
        }
    },
    removeBroker (state, payload) {
        const index = state.UNS.brokers.findIndex(br => br.id === payload)
        if (index !== -1) {
            state.UNS.brokers.splice(index, 1)
        }
    },
    clearUns (state, payload) {
        state.UNS.brokers = []
        state.UNS.clients = []
    },
    toggleOpenTopic (state, { topic, team, brokerId }) {
        if (!Object.prototype.hasOwnProperty.call(state.brokers.expandedTopics, team.slug)) {
            // console.log('no team slug, creating empty team object')
            state.brokers.expandedTopics[team.slug] = {}
        }

        if (!Object.prototype.hasOwnProperty.call(state.brokers.expandedTopics[team.slug], brokerId)) {
            state.brokers.expandedTopics[team.slug][brokerId] = {}
            state.brokers.expandedTopics[team.slug][brokerId][topic] = ''
            return
        }

        if (Object.prototype.hasOwnProperty.call(state.brokers.expandedTopics[team.slug][brokerId], topic)) {
            delete state.brokers.expandedTopics[team.slug][brokerId][topic]
            return
        }

        state.brokers.expandedTopics[team.slug][brokerId][topic] = ''
    }
}

// actions
const actions = {
    async checkFlags (state) {
        try {
            window.posthog?.onFeatureFlags((flags, values) => {
                const storeFlags = {}
                for (const flagName of flags) {
                    const payload = window.posthog?.getFeatureFlagPayload(flagName)
                    storeFlags[flagName] = {
                        value: values[flagName],
                        payload
                    }

                    /*
                        Check if an interview flag
                    */

                    const flagStartsWithKeyword = flagName.startsWith('interview-')
                    const flagEnabled = window.posthog?.isFeatureEnabled(flagName, { send_event: false })
                    const flagNotShownBefore = !localStorage.getItem('ph-$interview-popup-seen')

                    if (flagStartsWithKeyword && flagEnabled && flagNotShownBefore) {
                        const interview = {
                            flag: flagName,
                            enabled: flagEnabled,
                            payload
                        }
                        state.commit('setInterview', interview)
                    }
                }
                state.commit('setFlags', storeFlags)
            })
        } catch (err) {
            console.error('posthog error logging feature flags')
        }
    },
    async fetchUnsClients ({ commit, rootState }) {
        const team = rootState.account?.team
        return brokerApi.getClients(team.id)
            .then(response => commit('setUnsClients', response.clients))
    },
    async getBrokers ({ commit, rootState, getters }) {
        const team = rootState.account?.team
        return brokerApi.getBrokers(team.id)
            .then(response => response.brokers)
            .then(brokers => commit('setUnsBrokers', brokers))
            .then(() => commit('pushFfBroker'))
    },
    async createBroker ({ commit, rootState }, payload) {
        const team = rootState.account?.team
        return brokerApi.createBroker(team.id, payload)
            .then(broker => {
                commit('pushBroker', broker)
                return broker
            })
            .catch(e => e)
    },
    async updateBroker ({ commit, rootState }, { payload, brokerId }) {
        const team = rootState.account?.team
        return brokerApi.updateBroker(team.id, brokerId, payload)
            .then(broker => {
                commit('updateBroker', broker)
                return broker
            })
            .catch(e => e)
    },
    deleteBroker ({ commit, rootState }, brokerId) {
        const team = rootState.account?.team
        return brokerApi.deleteBroker(team.id, brokerId)
            .then(commit('removeBroker', brokerId))
    },
    addFfBroker ({ commit }) {
        commit('pushFfBroker')
    },
    removeFfBroker ({ commit }) {
        commit('removeFfBroker')
    },
    clearUns ({ commit }) {
        commit('clearUns')
    },
    handleBrokerTopicState ({ commit, rootState }, { topic, brokerId }) {
        commit('toggleOpenTopic', {
            topic,
            brokerId,
            team: rootState.account.team
        })
    }
}

export default {
    namespaced: true,
    state,
    getters,
    actions,
    mutations,
    meta: {
        persistence: {
            brokers: {
                storage: 'localStorage'
            }
        }
    }
}
