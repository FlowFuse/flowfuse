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
    hasFfUnsClients: state => state.UNS.clients.length > 0
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
    async getBrokers ({ commit, rootState }) {
        const team = rootState.account?.team
        return brokerApi.getBrokers(team.id)
            .then(response => commit('setUnsBrokers', response.brokers))
    }
}

export default {
    namespaced: true,
    state,
    getters,
    actions,
    mutations
}
