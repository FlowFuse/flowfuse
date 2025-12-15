// TODO: Uncomment when removing mock capabilities
// import expertApi from '../../../../../api/expert.js'

const initialState = () => ({
    sessionId: null,
    messages: [],

    // Session timing
    sessionStartTime: null,
    sessionWarningShown: false,
    sessionExpiredShown: false,
    sessionCheckTimer: null,

    capabilities: [],
    selectedCapabilities: []
})

const meta = {
    persistence: {
        sessionId: {
            storage: 'localStorage',
            clearOnLogout: true
        }
    }
}

const state = initialState

const getters = {
    capabilities: (state) => {
        return state.capabilities.map(capability => ({
            ...capability,
            toolCount: capability.resources.length + capability.tools.length + capability.prompts.length

        }))
    }
}

const mutations = {
    RESET (state) {
        Object.assign(state, initialState())
    },
    SET_SELECTED_CAPABILITIES (state, selectedCapabilities) {
        state.selectedCapabilities = selectedCapabilities
    },
    SET_CAPABILITIES (state, capabilities) {
        state.capabilities = capabilities
    }
}

const actions = {
    reset ({ commit }) {
        commit('RESET')
    },
    setSelectedCapabilities ({ commit }, selectedCapabilities) {
        commit('SET_SELECTED_CAPABILITIES', selectedCapabilities)
    },
    async getCapabilities ({ commit, rootGetters, state }) {
        // TODO: Remove mock capabilities - for testing ExpertToolCall component
        const mockCapabilities = [
            {
                name: 'Facility 7A - sensor5', // Required for listbox label-key
                instance: 'mock-instance-1',
                instanceType: 'instance',
                instanceName: 'Facility 7A',
                mcpServerName: 'sensor5',
                mcpEndpoint: '/mcp',
                mcpProtocol: 'http',
                prompts: [],
                resources: [{ name: 'sensor-data', description: 'Read sensor data' }],
                tools: [{ name: 'getValue', description: 'Get current sensor value' }],
                resourceTemplates: []
            }
        ]
        console.log('[MOCK] Setting capabilities:', mockCapabilities)
        commit('SET_CAPABILITIES', mockCapabilities)
        return Promise.resolve()
        // END mock capabilities

        /* Original code - uncomment when backend is ready:
        const payload = {
            context: {
                team: rootGetters['account/team'].id
            }
        }
        return expertApi.getCapabilities(payload)
            .then(data => {
                commit('SET_CAPABILITIES', data.servers || [])
            })
        */
    }
}

export default {
    namespaced: true,
    state,
    initialState: initialState(),
    getters,
    mutations,
    actions,
    meta
}
