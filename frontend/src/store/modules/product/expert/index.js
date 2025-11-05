const initialState = () => ({
    // Context from PR #6231 postMessage integration
    context: null,
    sessionId: null,

    // Conversation state
    messages: [],
    isGenerating: false,
    autoScrollEnabled: true,
    currentTransactionId: null,
    abortController: null
})

const meta = {
    persistence: {}
}

const state = initialState

const getters = {
    hasMessages: (state) => state.messages.length > 0,
    lastMessage: (state) => state.messages.length > 0 ? state.messages[state.messages.length - 1] : null
}

const mutations = {
    // Context mutations (for PR #6231 integration)
    SET_CONTEXT (state, context) {
        state.context = context
    },
    SET_SESSION_ID (state, sessionId) {
        state.sessionId = sessionId
    },

    // Conversation mutations
    ADD_MESSAGE (state, message) {
        state.messages.push(message)
    },
    UPDATE_LAST_MESSAGE (state, content) {
        if (state.messages.length > 0) {
            const lastMessage = state.messages[state.messages.length - 1]
            lastMessage.content = content
        }
    },
    CLEAR_MESSAGES (state) {
        state.messages = []
        state.currentTransactionId = null
    },
    SET_GENERATING (state, isGenerating) {
        state.isGenerating = isGenerating
    },
    SET_AUTO_SCROLL (state, enabled) {
        state.autoScrollEnabled = enabled
    },
    SET_TRANSACTION_ID (state, transactionId) {
        state.currentTransactionId = transactionId
    },
    SET_ABORT_CONTROLLER (state, controller) {
        state.abortController = controller
    },
    RESET (state) {
        Object.assign(state, initialState())
    }
}

const actions = {
    // Context actions (for PR #6231 integration)
    setContext ({ commit }, { data, sessionId }) {
        commit('SET_CONTEXT', data)
        if (sessionId) {
            commit('SET_SESSION_ID', sessionId)
        }
    },

    // Conversation actions
    addMessage ({ commit }, message) {
        commit('ADD_MESSAGE', message)
    },

    updateLastMessage ({ commit }, content) {
        commit('UPDATE_LAST_MESSAGE', content)
    },

    clearConversation ({ commit }) {
        commit('CLEAR_MESSAGES')
    },

    setGenerating ({ commit }, isGenerating) {
        commit('SET_GENERATING', isGenerating)
    },

    setAutoScroll ({ commit }, enabled) {
        commit('SET_AUTO_SCROLL', enabled)
    },

    setTransactionId ({ commit }, transactionId) {
        commit('SET_TRANSACTION_ID', transactionId)
    },

    setAbortController ({ commit }, controller) {
        commit('SET_ABORT_CONTROLLER', controller)
    },

    reset ({ commit }) {
        commit('RESET')
    }
}

export default {
    namespaced: true,
    meta,
    state,
    getters,
    mutations,
    actions
}
