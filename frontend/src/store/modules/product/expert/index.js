import { v4 as uuidv4 } from 'uuid'
import { markRaw } from 'vue'

import expertApi from '../../../../api/expert.js'
import ExpertDrawer from '../../../../components/drawers/expert/ExpertDrawer.vue'

const initialState = () => ({
    // Context from PR #6231 postMessage integration
    context: null,
    sessionId: null,
    shouldWakeUpAssistant: false,

    // expert modes
    agentMode: 'ff-agent', // ff-agent or operator-agent

    // Conversation state
    messages: [],
    isGenerating: false,
    autoScrollEnabled: true,
    currentTransactionId: null,
    abortController: null,

    // Session timing
    sessionStartTime: null,
    sessionWarningShown: false,
    sessionExpiredShown: false,
    sessionCheckTimer: null,

    // streaming words
    streamingWordIndex: -1,
    streamingWords: [],
    streamingTimer: null,

    // Drawer width management
    hasWidenedForFlows: false
})

const meta = {
    persistence: {
        context: {
            storage: 'localStorage',
            clearOnLogout: true
        },
        shouldWakeUpAssistant: {
            storage: 'localStorage',
            clearOnLogout: true
        },
        sessionId: {
            storage: 'localStorage',
            clearOnLogout: true
        }
    }
}

const state = initialState

const getters = {
    hasMessages: (state) => state.messages.length > 0,
    lastMessage: (state) =>
        state.messages.length > 0
            ? state.messages[state.messages.length - 1]
            : null,
    isSessionExpired: (state) => state.sessionExpiredShown
}

const mutations = {
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
    SET_SHOULD_WAKE_UP_ASSISTANT (state, shouldWakeUpAssistant) {
        state.shouldWakeUpAssistant = shouldWakeUpAssistant
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
    SET_SESSION_START_TIME (state, time) {
        state.sessionStartTime = time
    },
    SET_SESSION_WARNING_SHOWN (state, shown) {
        state.sessionWarningShown = shown
    },
    SET_SESSION_EXPIRED_SHOWN (state, shown) {
        state.sessionExpiredShown = shown
    },
    SET_SESSION_CHECK_TIMER (state, timer) {
        state.sessionCheckTimer = timer
    },
    SET_HAS_WIDENED_FOR_FLOWS (state, value) {
        state.hasWidenedForFlows = value
    },
    RESET (state) {
        Object.assign(state, initialState())
    },
    HYDRATE_MESSAGES (state, messages) {
        messages.forEach((message) => {
            if (message.answer && Array.isArray(message.answer)) {
                // AI response with answer array - process each item
                message.answer.forEach((item) => {
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

    /**
     * @param state
     * @param {'ff-agent' | 'operator-agent'} mode
     */
    SET_AGENT_MODE (state, mode) {
        if (!['ff-agent', 'operator-agent'].includes(mode)) return

        state.agentMode = mode
    }
}

const actions = {
    // Context actions and lifecycle
    async setContext (
        {
            commit,
            dispatch,
            state,
            rootState,
            rootGetters
        },
        {
            data,
            sessionId
        }
    ) {
        if (rootGetters['account/featuresCheck'].isExpertAssistantFeatureEnabled === false) {
            return
        }

        commit('SET_CONTEXT', data)

        if (sessionId) {
            commit('SET_SESSION_ID', sessionId)
            // Start session timer when context is set
            dispatch('startSessionTimer')
        }

        commit('SET_SHOULD_WAKE_UP_ASSISTANT', true)

        if (rootState.account?.user) {
            await dispatch('wakeUpAssistant', {
                shouldHydrateMessages: true,
                shouldAddTransferLoadingIndicator: true
            })
        }
    },
    hydrateClient ({
        dispatch,
        state,
        rootGetters
    }) {
        if (
            rootGetters['account/featuresCheck']
                .isExpertAssistantFeatureEnabled === false
        ) {
            return Promise.resolve()
        }

        return expertApi
            .chat({
                history: state.context,
                context: {},
                sessionId: state.sessionId
            })
            .then((response) => {
                return dispatch('removeLoadingIndicator').then(() =>
                    dispatch('handleMessageResponse', {
                        success: true,
                        answer: response.answer || []
                    })
                )
            })
    },
    wakeUpAssistant ({
        dispatch,
        commit,
        state
    }, {
        shouldHydrateMessages = false
    }) {
        if (state.shouldWakeUpAssistant) {
            dispatch('setAssistantWakeUp', false)

            if (shouldHydrateMessages) {
                commit('HYDRATE_MESSAGES', state.context)
            }

            // Add loading message with transfer variant to indicate syncing from website
            commit('ADD_MESSAGE', {
                type: 'loading',
                variant: 'transfer',
                timestamp: Date.now()
            })

            return dispatch('openAssistantDrawer')
                .then(() => dispatch('hydrateClient'))
        }
    },

    // Main message sending action
    async handleMessage ({
        commit,
        state,
        dispatch
    }, { query }) {
        // Auto-initialize session ID if not set
        if (!state.sessionId) {
            commit('SET_SESSION_ID', uuidv4())

            // Start session timing
            dispatch('startSessionTimer')
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
            const loadingIndex = state.messages.findIndex(
                (m) => m.type === 'loading'
            )
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

    async handleMessageResponse ({ commit, dispatch, state }, response) {
        // Handle UI-specific processing if successful
        if (
            response.success &&
            response.answer &&
            Array.isArray(response.answer)
        ) {
            // Check if any item has non-empty flows
            const hasFlows = response.answer.some(item =>
                item.flows && Array.isArray(item.flows) && item.flows.length > 0
            )

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

            // Auto-widen drawer if flows detected
            if (hasFlows) {
                await dispatch('ux/drawers/setRightDrawerWider', true, { root: true })
            }
        } else if (
            response.success &&
            (!response.answer || !Array.isArray(response.answer))
        ) {
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

    async startOver ({ commit, dispatch }) {
        commit('SET_SESSION_ID', uuidv4())
        commit('CLEAR_MESSAGES')
        commit('SET_GENERATING', false) // Re-enable input

        // Reset session timing
        dispatch('resetSessionTimer')
        dispatch('startSessionTimer')
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

    sendQuery ({ commit, state, getters, rootGetters }, { query }) {
        return expertApi.chat({
            query,
            context: rootGetters['context/expert'],
            sessionId: state.sessionId,
            abortController: state.abortController
        })
    },

    openAssistantDrawer ({ dispatch, rootGetters }) {
        if (
            rootGetters['account/featuresCheck']
                .isExpertAssistantFeatureEnabled === false
        ) {
            return
        }

        return dispatch(
            'ux/drawers/openRightDrawer',
            { component: markRaw(ExpertDrawer) },
            { root: true }
        )
    },

    setAssistantWakeUp ({ commit }, shouldWakeUp) {
        commit('SET_SHOULD_WAKE_UP_ASSISTANT', shouldWakeUp)
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
                const newContent =
                    currentContent + (currentContent ? ' ' : '') + word

                commit('UPDATE_LAST_MESSAGE', newContent)

                commit(
                    'SET_STREAMING_WORDS_INDEX',
                    state.streamingWordIndex + 1
                )

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
        const loadingIndex = state.messages.findIndex(
            (m) => m.type === 'loading'
        )

        if (loadingIndex !== -1) {
            commit('REMOVE_MESSAGE_BY_INDEX', loadingIndex)
        }
    },

    // Session timing actions
    startSessionTimer ({ commit, state }) {
        // Clear any existing timer
        if (state.sessionCheckTimer) {
            clearInterval(state.sessionCheckTimer)
        }

        // Set session start time
        commit('SET_SESSION_START_TIME', Date.now())
        commit('SET_SESSION_WARNING_SHOWN', false)
        commit('SET_SESSION_EXPIRED_SHOWN', false)

        // Check every 30 seconds if we've reached the warning/expiration threshold
        const timer = setInterval(() => {
            const elapsed = Date.now() - state.sessionStartTime
            const warningThreshold = 25 * 60 * 1000 // 25 minutes
            const expirationThreshold = 28 * 60 * 1000 // 28 minutes

            // Show 25-minute warning
            if (elapsed >= warningThreshold && !state.sessionWarningShown) {
                commit('SET_SESSION_WARNING_SHOWN', true)
                commit('ADD_MESSAGE', {
                    type: 'system',
                    variant: 'warning',
                    content:
                        'Your conversation history will expire soon. You can start a new conversation when this one expires.',
                    timestamp: Date.now()
                })
            }

            // Show 30-minute expiration
            if (elapsed >= expirationThreshold && !state.sessionExpiredShown) {
                commit('SET_SESSION_EXPIRED_SHOWN', true)
                commit('SET_GENERATING', true) // Disable input
                commit('ADD_MESSAGE', {
                    type: 'system',
                    variant: 'expired',
                    content:
                        'Your conversation history has expired. Chat is now disabled. Click "Start Over" to begin a new conversation.',
                    timestamp: Date.now()
                })
            }
        }, 30000) // Check every 30 seconds

        commit('SET_SESSION_CHECK_TIMER', timer)
    },

    resetSessionTimer ({ commit, state }) {
        if (state.sessionCheckTimer) {
            clearInterval(state.sessionCheckTimer)
            commit('SET_SESSION_CHECK_TIMER', null)
        }
        commit('SET_SESSION_START_TIME', null)
        commit('SET_SESSION_WARNING_SHOWN', false)
        commit('SET_SESSION_EXPIRED_SHOWN', false)
    },

    /**
     *
     * @param commit
     * @param {'ff-agent' | 'operator-agent'} mode
     */
    setAgentMode ({ commit }, mode) {
        commit('SET_AGENT_MODE', mode)
    }
}

export default {
    namespaced: true,
    meta,
    initialState: initialState(),
    state,
    getters,
    mutations,
    actions
}
