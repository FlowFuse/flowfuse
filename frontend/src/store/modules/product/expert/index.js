import { v4 as uuidv4 } from 'uuid'
import { markRaw } from 'vue'

import expertApi from '../../../../api/expert.js'
import userApi from '../../../../api/user.js'
import ExpertDrawer from '../../../../components/drawers/expert/ExpertDrawer.vue'
import useTimerHelper from '../../../../composables/TimerHelper.js'
import { useUxDrawersStore } from '../../../../stores/ux-drawers.js'

import { FF_AGENT, OPERATOR_AGENT } from './agents.js'

import FFAgent from './ff-agent/index.js'
import OperatorAgent from './operator-agent/index.js'

import createMqttService from '@/services/mqtt.service2.js'

const initialState = () => ({
    shouldWakeUpAssistant: false,
    agentMode: FF_AGENT, // ff-agent or operator-agent
    loadingVariant: FF_AGENT
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
    abortController: (state) => state[state.agentMode].abortController,
    isWaitingForResponse: (state) => !!state[state.agentMode].abortController,
    messages: (state) => state[state.agentMode].messages,
    hasMessages: (state) => state[state.agentMode].messages.length > 0,
    isSessionExpired: (state) => state[state.agentMode].sessionExpiredShown,
    isFfAgent: (state) => state.agentMode === FF_AGENT,
    isOperatorAgent: (state) => state.agentMode === OPERATOR_AGENT,
    hasSelectedCapabilities: (state) => state[OPERATOR_AGENT].selectedCapabilities?.length > 0,
    canImportFlows: (state, getters, rootState, rootGetters) => {
        return !!rootGetters['product/assistant/immersiveInstance'] && !!rootState.product.assistant.supportedActions['custom:import-flow']
    },
    canManagePalette: (state, getters, rootState, rootGetters) => {
        return !!rootGetters['product/assistant/immersiveInstance'] && !!rootState.product.assistant.supportedActions['core:manage-palette']
    },
    sessionId: (state) => state[state.agentMode].sessionId,
    mqttConnectionKey: (state, getters, rootState, rootGetters) => {
        return rootGetters[`product/expert/${state.agentMode}/mqttConnectionKey`]
    }
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
        state[state.agentMode].messages.push({
            ...message,
            _uuid: uuidv4()
        })
    },
    CLEAR_MESSAGES (state) {
        state[state.agentMode].messages = []
    },
    SET_ABORT_CONTROLLER (state, controller) {
        state[state.agentMode].abortController = controller
    },
    SET_SHOULD_WAKE_UP_ASSISTANT (state, shouldWakeUpAssistant) {
        state.shouldWakeUpAssistant = shouldWakeUpAssistant
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
    SET_LOADING_VARIANT (state, variant) {
        state.loadingVariant = variant
    },
    RESET (state) {
        Object.assign(state, initialState())
    },
    HYDRATE_MESSAGES (state, messages) {
        messages.forEach((message) => {
            // todo break this into manageable chunks, do we actually still need it?
            if (message.answer && Array.isArray(message.answer)) {
                // Extract MCP items (tools, resources, resource templates, prompts) from the answer array
                const mcpItems = message.answer.filter(item =>
                    item.kind === 'mcp_tool' ||
                    item.kind === 'mcp_resource' ||
                    item.kind === 'mcp_resource_template' ||
                    item.kind === 'mcp_prompt'
                )

                // Handle MCP calls if present - includes tools, resources, and prompts
                if (mcpItems.length > 0) {
                    const toolCalls = mcpItems.map(item => ({
                        id: item.toolId,
                        name: item.toolName,
                        title: item.toolTitle || item.toolName,
                        kind: item.kind,
                        args: item.input,
                        output: item.output,
                        durationMs: item.durationMs
                    }))

                    // Calculate total duration in seconds
                    const totalDurationMs = mcpItems.reduce((sum, item) => sum + (item.durationMs || 0), 0)
                    const totalDurationSec = (totalDurationMs / 1000).toFixed(2)

                    state[state.agentMode].messages.push({
                        type: 'ai',
                        kind: 'tool_calls',
                        toolCalls,
                        duration: totalDurationSec,
                        content: `${toolCalls.length} tool call(s)`,
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
    UPDATE_MESSAGE_STREAMED_STATE (state, uuid) {
        // searches in both message caches to avoid race conditions
        let message = state[FF_AGENT].messages.find(m => m._uuid === uuid)
        if (!message) {
            message = state[OPERATOR_AGENT].messages.find(m => m._uuid === uuid)
        }
        if (message) {
            message._streamed = true
        }
    },
    UPDATE_ANSWER_STREAMED_STATE (state, { messageUuid, answerUuid }) {
        // searches in both message caches to avoid race conditions
        let message = state[FF_AGENT].messages.find(m => m._uuid === messageUuid)
        if (!message) {
            message = state[OPERATOR_AGENT].messages.find(m => m._uuid === messageUuid)
        }

        if (message) {
            const answer = message.answer.find(a => a._uuid === answerUuid)
            if (answer) {
                answer._streamed = true
            }
        }
    }
}

const actions = {
    async setContext ({ commit, dispatch, state, rootState, rootGetters }, { data, sessionId }) {
        if (rootGetters['account/featuresCheck'].isExpertAssistantFeatureEnabled === false) {
            return
        }

        commit('SET_CONTEXT', data)

        if (sessionId) {
            commit('SET_SESSION_ID', sessionId)
        }

        commit('SET_SHOULD_WAKE_UP_ASSISTANT', true)

        if (rootState.account?.user) {
            await dispatch('wakeUpAssistant', {
                shouldHydrateMessages: true,
                shouldAddTransferLoadingIndicator: true
            })
        }
    },

    async hydrateClient ({ dispatch, state, rootGetters }) {
        if (
            rootGetters['account/featuresCheck']
                .isExpertAssistantFeatureEnabled === false
        ) {
            return Promise.resolve()
        }

        // TODO: this need to be removed when we have https://github.com/FlowFuse/flowfuse/issues/6520 part of
        //  https://github.com/FlowFuse/flowfuse/issues/6519 as it's a hacky workaround to the expert drawer opening up
        //  before we have a team loaded
        const { waitWhile } = useTimerHelper()
        await waitWhile(() => !rootGetters['account/team'], { cutoffTries: 60 })

        return expertApi
            .chat({
                history: state[state.agentMode].context,
                context: {
                    teamId: rootGetters['account/team'].id
                },
                sessionId: state[state.agentMode].sessionId
            })
            .then((response) => {
                return dispatch('handleMessageResponse', {
                    success: true,
                    answer: response.answer || []
                })
            })
    },

    wakeUpAssistant ({ dispatch, commit, state }, { shouldHydrateMessages = false }) {
        if (state.shouldWakeUpAssistant) {
            dispatch('setAssistantWakeUp', false)

            if (shouldHydrateMessages) {
                commit('HYDRATE_MESSAGES', state[state.agentMode].context)
            }

            commit('SET_LOADING_VARIANT', 'transfer')

            return dispatch('openAssistantDrawer')
                .then(() => dispatch('hydrateClient'))
                .then(() => commit('SET_LOADING_VARIANT', state.agentMode))
        }
    },

    async handleQuery ({ commit, state, dispatch }, { query }) {
        // Auto-initialize session ID if not set
        if (!state[state.agentMode].sessionId) {
            commit('SET_SESSION_ID', uuidv4())
        }

        // Start session timing on first message (if not already running)
        if (!state[state.agentMode].sessionStartTime) {
            dispatch('startSessionTimer')
        }

        // Add user message
        dispatch('addUserMessage', query)

        commit('SET_ABORT_CONTROLLER', new AbortController())

        try {
            return await dispatch('sendQuery', { query })
        } catch (error) {
            if (error.name === 'AbortError' || error.name === 'CanceledError') {
                // User canceled request
                dispatch('addPredefinedAiMessage', 'Generation stopped.')
            } else {
                // API error
                console.error('Expert API error:', error)
                dispatch('addPredefinedAiMessage', 'Sorry, I encountered an error. Please try again.')
            }
        } finally {
            commit('SET_ABORT_CONTROLLER', null)
        }
    },

    async handleMessageResponse ({ commit, dispatch, state, rootState }, response) {
        if (response.answer && Array.isArray(response.answer)) {
            dispatch('addAiMessage', response)
        }
    },

    async startOver ({ commit, dispatch }) {
        commit('SET_SESSION_ID', uuidv4())
        commit('CLEAR_MESSAGES')

        // Reset session timing
        dispatch('resetSessionTimer')
        dispatch('startSessionTimer')

        // Clear resource selection
        await dispatch(`product/expert/${OPERATOR_AGENT}/setSelectedCapabilities`, [], { root: true })
        await dispatch(`product/expert/${OPERATOR_AGENT}/getCapabilities`, [], { root: true })

        // Add welcome message for current mode
        dispatch('addWelcomeMessageIfNeeded')
    },

    reset ({ commit, dispatch, state }) {
        dispatch(`product/expert/${state.agentMode}/reset`, null, { root: true })
        commit('RESET')
    },

    setAbortController ({ commit }, controller) {
        commit('SET_ABORT_CONTROLLER', controller)
    },

    async sendQuery ({ commit, dispatch, state, getters, rootGetters, rootState }, { query }) {
        const mqttService = createMqttService()
        const payload = {
            query,
            context: {
                ...rootGetters['context/expert'],
                agent: state.agentMode
            },
            sessionId: state[state.agentMode].sessionId,
            abortController: state[state.agentMode].abortController
        }

        if (getters.isOperatorAgent) {
            payload.context.selectedCapabilities = rootState.product.expert[OPERATOR_AGENT].selectedCapabilities
            payload.context.selectedCapabilities = rootState.product.expert[OPERATOR_AGENT].selectedCapabilities
        }

        if (!mqttService.hasConnection(getters.mqttConnectionKey)) await dispatch('establishComms')

        const transactionId = uuidv4()

        return mqttService.publishMessage(getters.mqttConnectionKey, {
            topic: `ff/v1/expert/${rootState.account.user.id}/${getters.sessionId}/support/chat`,
            payload: {
                query,
                context: {
                    ...rootGetters['context/expert'],
                    agent: state.agentMode
                }
            },
            correlationData: new TextEncoder().encode(transactionId),
            userProperties: {
                sessionId: getters.sessionId
            }
        })
    },

    async establishComms ({ dispatch, getters, rootState }) {
        const mqttService = createMqttService()

        const { url, username, password } = await userApi.initiateExpertChat()

        console.log({ url, username, password })

        await mqttService.createConnection(getters.mqttConnectionKey, {
            url,
            username,
            password,
            onMessage: (topic, message) => {
                // TODO i don't like this approach, i should define the onMessage handler when i subscribe to a topic,
                //  this global handler should be used only in niche cases, also sub to other user topics?
                if (topic !== `ff/v1/expert/${rootState.account.user.id}/${getters.sessionId}/support/reply`) return

                dispatch('handleMessageResponse', JSON.parse(message.toString()))
            },
            onClose: () => {
                // TODO add error message
                console.log('closeeeeeed')
            },
            onConnect: () => {
                mqttService.subscribe(getters.mqttConnectionKey, `ff/v1/expert/${rootState.account.user.id}/${getters.sessionId}/support/reply`)
            },
            onOffline: () => {
                // TODO add error message
                console.log('oooooofffffliiiiiineeeee')
            },
            onError: (e) => {
                // TODO add error message
                console.log('eeeeeeerrrrrrrrooooooooorrrrrrrr', e)
            }
        })

        // TODO figure out asynchronicity between moment when connection gets created, the connection is established and
        //  when we publish the message
        await new Promise(resolve => setTimeout(resolve, 5000))
    },

    openAssistantDrawer ({ dispatch, rootGetters }) {
        if (rootGetters['account/featuresCheck'].isExpertAssistantFeatureEnabled === false) return

        dispatch(`product/expert/${OPERATOR_AGENT}/getCapabilities`, null, { root: true })

        return useUxDrawersStore().openRightDrawer({ component: markRaw(ExpertDrawer) })
    },

    addWelcomeMessageIfNeeded ({ dispatch, state }) {
        const currentMode = state.agentMode
        const hasMessages = state[currentMode].messages.length > 0

        if (hasMessages) {
            return
        }

        const welcomeMessages = {
            [FF_AGENT]: 'Hello! I am here to help you get started with FlowFuse and Node-RED. I can answer your questions, provide links to documentation, or help you build step-by-step guides to achieve your goals. How can I assist you today?',
            [OPERATOR_AGENT]: 'Hello! I can help you gather insights by interacting with your configured resources and MCP tools in your Node-RED instances. What would you like to find out?'
        }

        const noResourcesMessage = 'Hello! To use Insights mode, you\'ll need to configure MCP servers in your Node-RED instances first. Once configured, I can help you interact with your flows and gather insights. Switch to Support mode if you need help getting started or watch this [introduction to Node-RED MCP server nodes](https://youtu.be/troUvaF8V68?si=P9GedupXhe5-ifaa).'

        // Determine which message to show
        let message = welcomeMessages[currentMode]

        // In Insights mode, check if capabilities are available
        if (currentMode === OPERATOR_AGENT) {
            const capabilities = state[OPERATOR_AGENT].capabilities
            if (!capabilities || capabilities.length === 0) {
                message = noResourcesMessage
            }
        }

        if (message) {
            dispatch('addPredefinedAiMessage', message)
        }
    },

    setAssistantWakeUp ({ commit }, shouldWakeUp) {
        commit('SET_SHOULD_WAKE_UP_ASSISTANT', shouldWakeUp)
    },

    // Session timing actions
    startSessionTimer ({ commit, dispatch, state }) {
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
                dispatch('addSystemMessage', {
                    message: 'Your conversation history will expire soon. You can start a new conversation when this one expires.',
                    type: 'warning'
                })
            }

            // Show 30-minute expiration
            if (elapsed >= expirationThreshold && !state[state.agentMode].sessionExpiredShown) {
                commit('SET_SESSION_EXPIRED_SHOWN', true)
                dispatch('addSystemMessage', {
                    message: 'Your conversation history has expired. Chat is now disabled. Click "Start Over" to begin a new conversation.',
                    type: 'expired'
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
     * @param {commit, dispatch}
     * @param {'ff-agent' | 'operator-agent'} mode
     */
    setAgentMode ({ commit, dispatch }, mode) {
        commit('SET_AGENT_MODE', mode)
    },

    /**
     * Adds a system message to the application's message store.
     *
     * @param {Object} context - The Vuex action context object.
     * @param {Function} context.commit - The Vuex commit method used to mutate the state.
     * @param {Object} payload - An object containing the message details.
     * @param {string} [payload.message=''] - The content of the system message.
     * @param {string} [payload.type='warning'] - The type of system message (e.g., 'warning', 'info', or 'error').
     */
    addSystemMessage ({ commit }, { message = '', type = 'warning' }) {
        if (!['warning', 'expired'].includes(type) || !message.length) return

        commit('ADD_MESSAGE', {
            _type: 'system',
            _variant: type,
            message,
            _timestamp: Date.now()
        })
    },
    addPredefinedAiMessage ({ commit }, message) {
        commit('ADD_MESSAGE', {
            _type: 'ai',
            answer: [{
                content: message,
                _streamed: false,
                _uuid: uuidv4()
            }],
            _timestamp: Date.now(),
            _streamed: false
        })
    },
    addAiMessage ({ commit }, message) {
        const answer = message.answer
            ? message.answer.map(a => ({
                ...a,
                _uuid: uuidv4(),
                _streamed: false
            }))
            : []

        commit('ADD_MESSAGE', {
            ...message,
            answer,
            _type: 'ai',
            _timestamp: Date.now(),
            _streamed: false
        })
    },
    addUserMessage ({ commit }, message) {
        commit('ADD_MESSAGE', {
            _type: 'human',
            content: message,
            _timestamp: Date.now()
        })
    },
    updateMessageStreamedState ({ commit }, uuid) {
        commit('UPDATE_MESSAGE_STREAMED_STATE', uuid)
    },
    updateAnswerStreamedState ({ commit }, { messageUuid, answerUuid, agent }) {
        commit('UPDATE_ANSWER_STREAMED_STATE', { messageUuid, answerUuid, agent })
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
