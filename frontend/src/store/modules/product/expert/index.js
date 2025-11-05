import expertApi from '../../../../api/expert.js'

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
    },
    UPDATE_CONTEXT (state, message) {
        state.context.push(message)
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

    // Main message sending action
    async sendMessage ({ commit, state }, { query, instanceId = null, abortController }) {
        // Auto-initialize session ID if not set
        if (!state.sessionId) {
            const { default: ExpertAPI } = await import('../../../../api/expert.js')
            const newSessionId = ExpertAPI.initSession()
            commit('SET_SESSION_ID', newSessionId)
        }

        // Add user message
        commit('ADD_MESSAGE', {
            type: 'human',
            content: query,
            timestamp: Date.now()
        })

        // Add loading indicator
        commit('ADD_MESSAGE', {
            type: 'loading',
            timestamp: Date.now()
        })

        commit('SET_GENERATING', true)
        commit('SET_ABORT_CONTROLLER', abortController)

        try {
            // Call the API
            const { default: ExpertAPI } = await import('../../../../api/expert.js')
            const response = await ExpertAPI.sendQuery(
                query,
                state.sessionId,
                instanceId,
                abortController?.signal
            )

            // Remove loading indicator
            const loadingIndex = state.messages.findIndex(m => m.type === 'loading')
            if (loadingIndex !== -1) {
                state.messages.splice(loadingIndex, 1)
            }

            // Process and return the response for UI handling
            return {
                success: true,
                answer: response.answer || []
            }
        } catch (error) {
            // Remove loading indicator
            const loadingIndex = state.messages.findIndex(m => m.type === 'loading')
            if (loadingIndex !== -1) {
                state.messages.splice(loadingIndex, 1)
            }

            if (error.name === 'AbortError' || error.name === 'CanceledError') {
                // Request was cancelled by user
                commit('ADD_MESSAGE', {
                    type: 'ai',
                    content: 'Generation stopped.',
                    timestamp: Date.now()
                })
            } else {
                // API error
                console.error('Expert API error:', error)
                commit('ADD_MESSAGE', {
                    type: 'ai',
                    content: 'Sorry, I encountered an error. Please try again.',
                    timestamp: Date.now()
                })
            }

            return {
                success: false,
                error
            }
        } finally {
            commit('SET_GENERATING', false)
            commit('SET_ABORT_CONTROLLER', null)
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

    async startOver ({ commit }) {
        // Generate new session ID for fresh conversation
        const { default: ExpertAPI } = await import('../../../../api/expert.js')
        const newSessionId = ExpertAPI.initSession()
        commit('SET_SESSION_ID', newSessionId)
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
    },

    hydrateClient ({ commit }, { message, history, context, sessionId }) {
        return expertApi.hydrate({ message, history, context, sessionId })
            .then(response => {
                commit('ADD_MESSAGE', response)
            })
    },

    sendMessage ({ commit, state }, { message, context }) {
        return expertApi.sendMessage({ message, context, state: state.sessionId })
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
