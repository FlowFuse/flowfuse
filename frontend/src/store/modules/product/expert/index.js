import { v4 as uuidv4 } from 'uuid'
import { markRaw } from 'vue'

import expertApi from '../../../../api/expert.js'
import ExpertDrawer from '../../../../components/drawers/expert/ExpertDrawer.vue'

import { FF_AGENT, OPERATOR_AGENT } from './agents.js'

import FFAgent from './ff-agent/index.js'
import OperatorAgent from './operator-agent/index.js'

const initialState = () => ({
    shouldWakeUpAssistant: false,

    // expert modes
    agentMode: FF_AGENT, // ff-agent or operator-agent

    // Conversation state
    isGenerating: false,
    autoScrollEnabled: true,

    // todo sharing the same abort controller might not be the smartest thing
    abortController: null,

    // streaming words
    streamingWordIndex: -1,
    streamingWords: [],
    streamingTimer: null
})

const meta = {
    persistence: {
        shouldWakeUpAssistant: {
            storage: 'localStorage',
            clearOnLogout: true
        }
    }
}

const state = initialState

const getters = {
    messages: (state) => state[state.agentMode].messages,
    hasMessages: (state) => state[state.agentMode].messages.length > 0,
    lastMessage: (state) =>
        state[state.agentMode].messages.length > 0
            ? state[state.agentMode].messages[state[state.agentMode].messages.length - 1]
            : null,
    isSessionExpired: (state) => state[state.agentMode].sessionExpiredShown,
    isFfAgent: (state) => state.agentMode === FF_AGENT,
    isOperatorAgent: (state) => state.agentMode === OPERATOR_AGENT
}

const mutations = {
    /**
     * @param state
     * @param {'ff-agent' | 'operator-agent'} mode
     */
    SET_AGENT_MODE (state, mode) {
        if (![OPERATOR_AGENT, FF_AGENT].includes(mode)) return

        state.agentMode = mode
    },

    SET_CONTEXT (state, context) {
        state[state.agentMode].context = context
    },
    SET_SESSION_ID (state, sessionId) {
        state[state.agentMode].sessionId = sessionId
    },

    // Conversation mutations
    ADD_MESSAGE (state, message) {
        state[state.agentMode].messages.push(message)
    },
    UPDATE_LAST_MESSAGE (state, content) {
        if (state[state.agentMode].messages.length > 0) {
            const lastMessage = state[state.agentMode].messages[state[state.agentMode].messages.length - 1]
            lastMessage.content = content
        }
    },
    CLEAR_MESSAGES (state) {
        state[state.agentMode].messages = []
    },
    SET_GENERATING (state, isGenerating) {
        state.isGenerating = isGenerating
    },
    SET_AUTO_SCROLL (state, enabled) {
        state.autoScrollEnabled = enabled
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
        state[state.agentMode].sessionStartTime = time
    },
    SET_SESSION_WARNING_SHOWN (state, shown) {
        state[state.agentMode].sessionWarningShown = shown
    },
    SET_SESSION_EXPIRED_SHOWN (state, shown) {
        state[state.agentMode].sessionExpiredShown = shown
    },
    SET_SESSION_CHECK_TIMER (state, timer) {
        state[state.agentMode].sessionCheckTimer = timer
    },
    RESET (state) {
        Object.assign(state, initialState())
    },
    HYDRATE_MESSAGES (state, messages) {
        messages.forEach((message) => {
            if (message.answer && Array.isArray(message.answer)) {
                // Handle tool calls if present - add before answer processing
                if (message.tool_calls && message.tool_calls.length > 0) {
                    state[state.agentMode].messages.push({
                        type: 'ai',
                        kind: 'tool_calls',
                        toolCalls: message.tool_calls,
                        duration: message.duration,
                        content: `${message.tool_calls.length} tool call(s)`,
                        timestamp: Date.now()
                    })
                }

                // AI response with answer array - process each item
                message.answer.forEach((item) => {
                    if (item.kind === 'guide') {
                        // Transform guide response
                        state[state.agentMode].messages.push({
                            type: 'ai',
                            kind: 'guide',
                            guide: item,
                            content: item.title || 'Setup Guide',
                            timestamp: Date.now()
                        })
                    } else if (item.kind === 'resources') {
                        // Transform resources response
                        state[state.agentMode].messages.push({
                            type: 'ai',
                            kind: 'resources',
                            resources: item,
                            content: item.title || 'Resources',
                            timestamp: Date.now()
                        })
                    } else if (item.kind === 'chat') {
                        // Transform chat response
                        state[state.agentMode].messages.push({
                            type: 'ai',
                            content: item.content,
                            timestamp: Date.now()
                        })
                    }
                })
            } else if (message.query) {
                // Transform user message
                state[state.agentMode].messages.push({
                    type: 'human',
                    content: message.query,
                    timestamp: Date.now()
                })
            }
            // Else: ignore messages that don't match either format
        })
    },
    REMOVE_MESSAGE_BY_INDEX (state, index) {
        state[state.agentMode].messages.splice(index, 1)
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
                history: state[state.agentMode].context,
                context: {},
                sessionId: state[state.agentMode].sessionId
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
                commit('HYDRATE_MESSAGES', state[state.agentMode].context)
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
        if (!state[state.agentMode].sessionId) {
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
            dispatch('removeLoadingIndicator')

            if (error.name === 'AbortError' || error.name === 'CanceledError') {
                // Request was canceled by user
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

    async handleMessageResponse ({ commit, dispatch, state, rootState }, response) {
        // DEBUG logging - remove after testing
        console.log('[DEBUG handleMessageResponse] response:', response)
        console.log('[DEBUG handleMessageResponse] state.agentMode:', state.agentMode)
        console.log('[DEBUG handleMessageResponse] selectedCapabilities:', rootState.product.expert[OPERATOR_AGENT].selectedCapabilities)

        // Handle UI-specific processing if successful
        if (
            response.success &&
            response.answer &&
            Array.isArray(response.answer)
        ) {
            // TODO: Remove this mock data - for testing ExpertToolCall component
            const mockToolCalls = [
                {
                    name: 'mcp__facility7a__sensor5__getValue',
                    args: { query: 'read modbus data from PLC and store in database table' },
                    type: 'tool_call',
                    id: 'call_mock123'
                }
            ]
            const mockDuration = 3
            // END mock data

            // Only show tool calls in Research mode with capabilities selected
            const isOperatorWithCapabilities =
                state.agentMode === OPERATOR_AGENT &&
                rootState.product.expert[OPERATOR_AGENT].selectedCapabilities?.length > 0

            console.log('[DEBUG handleMessageResponse] isOperatorWithCapabilities:', isOperatorWithCapabilities)

            // Handle tool calls if present - add before answer processing
            // Using mock data for testing: replace mockToolCalls with response.tool_calls
            if (isOperatorWithCapabilities && mockToolCalls && mockToolCalls.length > 0) {
                console.log('[DEBUG handleMessageResponse] Adding tool call message!')
                commit('ADD_MESSAGE', {
                    type: 'ai',
                    kind: 'tool_calls',
                    toolCalls: mockToolCalls,
                    duration: mockDuration,
                    content: `${mockToolCalls.length} tool call(s)`,
                    timestamp: Date.now()
                })
            }

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

    setAbortController ({ commit }, controller) {
        commit('SET_ABORT_CONTROLLER', controller)
    },

    reset ({ commit, dispatch, state }) {
        // order matters
        dispatch(`product/expert/${state.agentMode}/reset`, null, { root: true })
        commit('RESET')
    },

    sendQuery ({ commit, state, getters, rootGetters, rootState }, { query }) {
        const payload = {
            query,
            context: {
                ...rootGetters['context/expert'],
                agent: state.agentMode
            },
            sessionId: state[state.agentMode].sessionId,
            abortController: state.abortController
        }

        if (getters.isOperatorAgent) {
            payload.context.selectedCapabilities = rootState.product.expert[OPERATOR_AGENT].selectedCapabilities
            payload.context.selectedCapabilities = rootState.product.expert[OPERATOR_AGENT].selectedCapabilities
        }

        return expertApi.chat(payload)
    },

    openAssistantDrawer ({ dispatch, rootGetters }) {
        if (
            rootGetters['account/featuresCheck']
                .isExpertAssistantFeatureEnabled === false
        ) {
            return
        }

        dispatch(`product/expert/${OPERATOR_AGENT}/getCapabilities`, null, { root: true })

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
        const loadingIndex = state[state.agentMode].messages.findIndex(
            (m) => m.type === 'loading'
        )

        if (loadingIndex !== -1) {
            commit('REMOVE_MESSAGE_BY_INDEX', loadingIndex)
        }
    },

    // Session timing actions
    startSessionTimer ({ commit, state }) {
        // Clear any existing timer
        if (state[state.agentMode].sessionCheckTimer) {
            clearInterval(state[state.agentMode].sessionCheckTimer)
        }

        // Set session start time
        commit('SET_SESSION_START_TIME', Date.now())
        commit('SET_SESSION_WARNING_SHOWN', false)
        commit('SET_SESSION_EXPIRED_SHOWN', false)

        // Check every 30 seconds if we've reached the warning/expiration threshold
        const timer = setInterval(() => {
            const elapsed = Date.now() - state[state.agentMode].sessionStartTime
            const warningThreshold = 25 * 60 * 1000 // 25 minutes
            const expirationThreshold = 28 * 60 * 1000 // 28 minutes

            // Show 25-minute warning
            if (elapsed >= warningThreshold && !state[state.agentMode].sessionWarningShown) {
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
            if (elapsed >= expirationThreshold && !state[state.agentMode].sessionExpiredShown) {
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
        if (state[state.agentMode].sessionCheckTimer) {
            clearInterval(state[state.agentMode].sessionCheckTimer)
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
    modules: {
        [FF_AGENT]: FFAgent,
        [OPERATOR_AGENT]: OperatorAgent
    },
    meta,
    initialState: initialState(),
    state,
    getters,
    mutations,
    actions
}
