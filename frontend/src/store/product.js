import brokerApi from '../api/broker.js'

// initial state
const state = () => ({
    flags: null,
    interview: null,
    UNS: {
        clients: [],
        brokers: []
    }
})

// getters
const getters = {
    settings (state) {
        return state.settings
    },
    hasFfUnsClients: state => state.UNS.clients.length > 0,
    hasBrokers: state => state.UNS.brokers.length > 0
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
                id: 'flowfuse',
                name: 'FlowFuse Broker',
                clientId: 'some-id',
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
        const index = state.UNS.brokers.indexOf(br => br.id === payload)
        if (index) {
            state.UNS.brokers.splice(index)
        }
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
    }
}

export default {
    namespaced: true,
    state,
    getters,
    actions,
    mutations
}
