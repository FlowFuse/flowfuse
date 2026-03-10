import expertApi from '../../../../../api/expert.js'
import useTimerHelper from '../../../../../composables/TimersHelper.js'

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
        // TODO: this need to be removed when we have https://github.com/FlowFuse/flowfuse/issues/6520 part of
        //  https://github.com/FlowFuse/flowfuse/issues/6519 as it's a hacky workaround to the expert drawer opening up
        //  before we have a team loaded
        const { waitWhile } = useTimerHelper()
        await waitWhile(() => !rootGetters['account/team'], { cutoffTries: 60 })

        const payload = {
            context: {
                teamId: rootGetters['account/team'].id
            }
        }

        return expertApi.getCapabilities(payload)
            .then(data => {
                commit('SET_CAPABILITIES', data.servers || [])
            })
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
