import { v4 as uuidv4 } from 'uuid'
import { markRaw } from 'vue'

import expertApi from '../../../../api/expert.js'
import ExpertDrawer from '../../../../components/drawers/expert/ExpertDrawer.vue'

const initialState = () => ({
    // Context from PR #6231 postMessage integration
    context: null,
    sessionId: null,
    shouldPromptAssistant: false,

    // Conversation state
    messages: [],
    isGenerating: false,
    autoScrollEnabled: true,
    currentTransactionId: null,
    abortController: null,

    // streaming words
    streamingWordIndex: -1,
    streamingWords: [],
    streamingTimer: null,

    // todo this should be moved into a dedicated context store
    route: null
})

const meta = {
    persistence: {}
}

const state = initialState

const getters = {
    hasMessages: (state) => state.messages.length > 0,
    lastMessage: (state) => state.messages.length > 0 ? state.messages[state.messages.length - 1] : null,
    context: (state, getters, rootState, rootGetters) => {
        // todo this should be moved into a dedicated context store
        const instanceId = state.route.fullPath.includes('/instance/') ? state.route.params?.id : null
        const applicationId = state.route.fullPath.includes('/applications/') ? state.route.params?.id : null
        const deviceId = state.route.fullPath.includes('/device/') ? state.route.params?.id : null
        const scope = state.route.fullPath.includes('/instance/') && state.route.fullPath.includes('editor')
            ? 'immersive'
            : 'ff-app'

        const { matched, redirectedFrom, ...rawRoute } = state.route ?? {}

        return {
            userId: rootState.account?.user?.id || null,
            teamId: rootState.account?.team?.id || null,
            teamSlug: rootState.account?.team?.slug || null,
            instanceId: instanceId ?? null,
            deviceId: deviceId ?? null,
            applicationId: applicationId ?? null,
            isTrialAccount: rootGetters['account/isTrialAccount'] || false,
            pageName: state.route.name,
            rawRoute,
            scope
        }
    }
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
    SET_SHOULD_PROMPT_ASSISTANT (state, shouldPromptAssistant) {
        state.shouldPromptAssistant = shouldPromptAssistant
    },
    SET_STREAMING_WORDS (state, words) {
        state.streamingWords = words
    },
    SET_STREAMING_WORDS_INDEX (state, index) {
        state.streamingWordIndex = index
    },
    SET_STREAMING_TIMER (state, timer) {
        state.streamingTimer = timer
    },
    RESET (state) {
        Object.assign(state, initialState())
    },
    UPDATE_CONTEXT (state, message) {
        state.context.push(message)
    },
    HYDRATE_MESSAGES (state, messages) {
        messages.forEach(message => {
            if (message.answer && Array.isArray(message.answer)) {
                // AI response with answer array - process each item
                message.answer.forEach(item => {
                    if (item.kind === 'guide') {
                        // Transform guide response
                        state.messages.push({
                            type: 'ai',
                            kind: 'guide',
                            guide: item,
                            content: item.title || 'Setup Guide',
                            timestamp: Date.now()
                        })
                    } else if (item.kind === 'resources') {
                        // Transform resources response
                        state.messages.push({
                            type: 'ai',
                            kind: 'resources',
                            resources: item,
                            content: item.title || 'Resources',
                            timestamp: Date.now()
                        })
                    } else if (item.kind === 'chat') {
                        // Transform chat response
                        state.messages.push({
                            type: 'ai',
                            content: item.content,
                            timestamp: Date.now()
                        })
                    }
                })
            } else if (message.query) {
                // Transform user message
                state.messages.push({
                    type: 'human',
                    content: message.query,
                    timestamp: Date.now()
                })
            }
            // Else: ignore messages that don't match either format
        })
    },
    REMOVE_MESSAGE_BY_INDEX (state, index) {
        state.messages.splice(index, 1)
    },
    // todo this should be moved into a dedicated context store
    UPDATE_ROUTE (state, route) {
        state.route = route
    }
}

const actions = {
    // Context actions (for PR #6231 integration)
    setContext ({
        commit,
        dispatch,
        state,
        rootState,
        rootGetters
    }, {
        data,
        sessionId
    }) {
        if (rootGetters['account/featuresCheck'].isExpertAssistantFeatureEnabled === false) {
            return
        }

        commit('SET_CONTEXT', data)

        if (sessionId) {
            commit('SET_SESSION_ID', sessionId)
        }

        commit('SET_SHOULD_PROMPT_ASSISTANT', true)
        commit('HYDRATE_MESSAGES', data)
        // Add loading message with transfer variant to indicate syncing from website
        commit('ADD_MESSAGE', {
            type: 'loading',
            variant: 'transfer',
            timestamp: Date.now()
        })

        if (rootState.account?.user) {
            dispatch('openAssistantDrawer')
                .then(() => dispatch('hydrateClient'))
                .then(() => commit('SET_SHOULD_PROMPT_ASSISTANT', false))
                .catch(error => error)
        }
    },

    // Main message sending action
    async handleMessage ({ commit, state, dispatch }, { query }) {
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
        commit('SET_ABORT_CONTROLLER', new AbortController())

        try {
            const response = await dispatch('sendQuery', { query })

            dispatch('removeLoadingIndicator')

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
            dispatch('removeLoadingIndicator')
        }
    },

    async handleMessageResponse ({ commit, dispatch }, response) {
        // Handle UI-specific processing if successful
        if (response.success && response.answer && Array.isArray(response.answer)) {
            for (const item of response.answer) {
                if (item.kind === 'guide') {
                    // Add rich guide message
                    commit('ADD_MESSAGE', {
                        type: 'ai',
                        kind: 'guide',
                        guide: item,
                        content: item.title || 'Setup Guide',
                        timestamp: Date.now()
                    })
                } else if (item.kind === 'resources') {
                    // Add rich resources message
                    commit('ADD_MESSAGE', {
                        type: 'ai',
                        kind: 'resources',
                        resources: item,
                        content: item.title || 'Resources',
                        timestamp: Date.now()
                    })
                } else if (item.kind === 'chat') {
                    // Add chat message with streaming effect
                    await dispatch('streamMessage', item.content)
                }
            }
        } else if (response.success && (!response.answer || !Array.isArray(response.answer))) {
            // Fallback for unexpected response format
            commit('ADD_MESSAGE', {
                type: 'ai',
                content: 'Sorry, I received an unexpected response format.',
                timestamp: Date.now()
            })
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
        commit('SET_SESSION_ID', uuidv4())
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

    hydrateClient ({
        dispatch,
        state,
        rootGetters
    }) {
        if (rootGetters['account/featuresCheck'].isExpertAssistantFeatureEnabled === false) {
            return Promise.resolve()
        }

        return expertApi.chat({
            history: state.context,
            context: {},
            sessionId: state.sessionId
        })
            .then(response => {
                return dispatch('removeLoadingIndicator')
                    .then(() => dispatch('handleMessageResponse', {
                        success: true,
                        answer: response.answer || []
                    }))
            })
    },

    sendQuery ({ commit, state, getters }, { query }) {
        return expertApi.chat({ query, context: getters.context, state: state.sessionId })
    },

    openAssistantDrawer ({ dispatch, rootGetters }) {
        if (rootGetters['account/featuresCheck'].isExpertAssistantFeatureEnabled === false) {
            return
        }

        return dispatch('ux/drawers/openRightDrawer', { component: markRaw(ExpertDrawer) }, { root: true })
    },

    disableAssistantPrompt ({ commit }) {
        commit('SET_SHOULD_PROMPT_ASSISTANT', false)
    },

    async streamMessage ({ commit, state, getters }, content) {
        // Split content into words for streaming effect
        const words = content.split(' ')

        commit('SET_STREAMING_WORDS', words)
        commit('SET_STREAMING_WORDS_INDEX', 0)

        // Add empty AI message
        commit('ADD_MESSAGE', {
            type: 'ai',
            content: '',
            isStreaming: true,
            timestamp: Date.now()
        })

        // Stream words one by one
        return new Promise((resolve) => {
            const streamNextWord = () => {
                if (state.streamingWordIndex >= state.streamingWords.length) {
                    // Streaming complete
                    const lastMsg = getters.lastMessage
                    if (lastMsg) {
                        lastMsg.isStreaming = false
                    }
                    commit('SET_STREAMING_WORDS_INDEX', -1)
                    commit('SET_STREAMING_WORDS', [])
                    resolve()
                    return
                }

                // Append next word
                const word = state.streamingWords[state.streamingWordIndex]
                const currentContent = getters.lastMessage?.content || ''
                const newContent = currentContent + (currentContent ? ' ' : '') + word

                commit('UPDATE_LAST_MESSAGE', newContent)

                commit('SET_STREAMING_WORDS_INDEX', state.streamingWordIndex + 1)

                // Schedule next word
                commit('SET_STREAMING_TIMER', setTimeout(streamNextWord, 30))
            }

            streamNextWord()
        })
    },

    clearStreamingTimer ({ commit, state }) {
        clearTimeout(state.streamingTimer)
        commit('SET_STREAMING_TIMER', null)
    },

    setStreamingWordIndex ({ commit }, index) {
        commit('SET_STREAMING_WORDS_INDEX', index)
    },

    setStreamingWords ({ commit }, words) {
        commit('SET_STREAMING_WORDS', words)
    },

    removeLoadingIndicator ({ commit, state }) {
        const loadingIndex = state.messages.findIndex(m => m.type === 'loading')

        if (loadingIndex !== -1) {
            commit('REMOVE_MESSAGE_BY_INDEX', loadingIndex)
        }
    },

    // todo this should be moved into a dedicated context store
    updateRoute ({ commit }, route) {
        commit('UPDATE_ROUTE', route)
    },

    handleLogin ({ dispatch, state }) {
        if (state.shouldPromptAssistant) {
            return dispatch('openAssistantDrawer')
                .then(() => dispatch('disableAssistantPrompt'))
                .then(() => dispatch('hydrateClient'))
        }
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
