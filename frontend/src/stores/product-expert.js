import { defineStore } from 'pinia'
import { v4 as uuidv4 } from 'uuid'
import { markRaw } from 'vue'

import expertApi from '../api/expert.js'
import useTimerHelper from '../composables/TimerHelper.js'

import { useAccountBridge } from './_account_bridge.js'
import { useContextStore } from './context.js'
import { useProductAssistantStore } from './product-assistant.js'
import { FF_AGENT, OPERATOR_AGENT } from './product-expert-agents.js'
import { useProductExpertContextStore } from './product-expert-context.js'
import { useProductExpertFfAgentStore } from './product-expert-ff-agent.js'
import { useProductExpertOperatorAgentStore } from './product-expert-operator-agent.js'
import { useUxDrawersStore } from './ux-drawers.js'

export const useProductExpertStore = defineStore('product-expert', {
    state: () => ({
        agentMode: FF_AGENT, // ff-agent or operator-agent
        loadingVariant: FF_AGENT
    }),
    getters: {
        shouldWakeUpAssistant () { return useProductExpertContextStore().shouldWakeUpAssistant },
        _agentStore () {
            return this.agentMode === FF_AGENT
                ? useProductExpertFfAgentStore()
                : useProductExpertOperatorAgentStore()
        },
        abortController () { return this._agentStore.abortController },
        messages () { return this._agentStore.messages },
        hasMessages () { return this._agentStore.messages.length > 0 },
        isSessionExpired () { return this._agentStore.sessionExpiredShown },
        isWaitingForResponse () { return !!this._agentStore.abortController },
        isFfAgent: (state) => state.agentMode === FF_AGENT,
        isOperatorAgent: (state) => state.agentMode === OPERATOR_AGENT,
        hasSelectedCapabilities () {
            return useProductExpertOperatorAgentStore().selectedCapabilities?.length > 0
        },
        canImportFlows () {
            const assistantStore = useProductAssistantStore()
            return !!assistantStore.immersiveInstance && !!assistantStore.supportedActions['custom:import-flow']
        },
        canManagePalette () {
            const assistantStore = useProductAssistantStore()
            return !!assistantStore.immersiveInstance && !!assistantStore.supportedActions['core:manage-palette']
        }
    },
    actions: {
        async hydrateClient () {
            const { featuresCheck } = useAccountBridge()
            if (featuresCheck.isExpertAssistantFeatureEnabled === false) {
                return
            }

            // TODO: this need to be removed when we have https://github.com/FlowFuse/flowfuse/issues/6520 part of
            //  https://github.com/FlowFuse/flowfuse/issues/6519 as it's a hacky workaround to the expert drawer opening up
            //  before we have a team loaded
            const { waitWhile } = useTimerHelper()
            await waitWhile(() => !useAccountBridge().team, { cutoffTries: 60 })

            const agentStore = this._agentStore
            const { team } = useAccountBridge()

            return expertApi
                .chat({
                    history: agentStore.context,
                    context: { teamId: team.id },
                    sessionId: agentStore.sessionId
                })
                .then((response) => {
                    return this.handleMessageResponse({
                        success: true,
                        answer: response.answer || []
                    })
                })
        },

        wakeUpAssistant ({ shouldHydrateMessages = false } = {}) {
            if (this.shouldWakeUpAssistant) {
                useProductExpertContextStore().clearWakeUp()

                if (shouldHydrateMessages) {
                    this.hydrateMessages(this._agentStore.context)
                }

                this.loadingVariant = 'transfer'

                useProductExpertOperatorAgentStore().getCapabilities()
                // Lazy import to avoid circular dep: product-expert.js → ExpertDrawer.vue → product-expert.js
                return import('../components/drawers/expert/ExpertDrawer.vue')
                    .then(({ default: ExpertDrawer }) => useUxDrawersStore().openRightDrawer({ component: markRaw(ExpertDrawer) }))
                    .then(() => this.hydrateClient())
                    .then(() => { this.loadingVariant = this.agentMode })
            }
        },

        async handleQuery ({ query }) {
            const agentStore = this._agentStore

            // Auto-initialize session ID if not set
            if (!agentStore.sessionId) {
                agentStore.sessionId = uuidv4()
            }

            // Start session timing on first message (if not already running)
            if (!agentStore.sessionStartTime) {
                this.startSessionTimer()
            }

            // Add user message
            this.addUserMessage(query)

            agentStore.abortController = markRaw(new AbortController())

            try {
                return await this.sendQuery({ query })
            } catch (error) {
                if (error.name === 'AbortError' || error.name === 'CanceledError') {
                    // User canceled request
                    this.addPredefinedAiMessage('Generation stopped.')
                } else {
                    // API error
                    console.error('Expert API error:', error)
                    this.addPredefinedAiMessage('Sorry, I encountered an error. Please try again.')
                }
            } finally {
                agentStore.abortController = null
            }
        },

        async handleMessageResponse (response) {
            if (response.answer && Array.isArray(response.answer)) {
                this.addAiMessage(response)
            }
        },

        async startOver () {
            const agentStore = this._agentStore
            agentStore.sessionId = uuidv4()
            agentStore.messages = []

            // Reset session timing
            this.resetSessionTimer()
            this.startSessionTimer()

            // Clear resource selection
            const operatorStore = useProductExpertOperatorAgentStore()
            operatorStore.setSelectedCapabilities([])
            await operatorStore.getCapabilities()

            // Add welcome message for current mode
            this.addWelcomeMessageIfNeeded()
        },

        setAbortController (controller) {
            this._agentStore.abortController = controller ? markRaw(controller) : null
        },

        reset () {
            this._agentStore.reset()
            this.$reset()
        },

        sendQuery ({ query }) {
            const agentStore = this._agentStore
            const payload = {
                query,
                context: {
                    ...useContextStore().expert,
                    agent: this.agentMode
                },
                sessionId: agentStore.sessionId,
                abortController: agentStore.abortController
            }

            if (this.isOperatorAgent) {
                payload.context.selectedCapabilities = useProductExpertOperatorAgentStore().selectedCapabilities
            }

            return expertApi.chat(payload)
        },

        addWelcomeMessageIfNeeded () {
            const currentMode = this.agentMode
            const hasMessages = this._agentStore.messages.length > 0

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
                const capabilities = useProductExpertOperatorAgentStore().capabilityServers
                if (!capabilities || capabilities.length === 0) {
                    message = noResourcesMessage
                }
            }

            if (message) {
                this.addPredefinedAiMessage(message)
            }
        },

        // Session timing actions
        startSessionTimer () {
            const agentStore = this._agentStore

            // Clear any existing timer
            if (agentStore.sessionCheckTimer) {
                clearInterval(agentStore.sessionCheckTimer)
            }

            // Set session start time
            agentStore.sessionStartTime = Date.now()
            agentStore.sessionWarningShown = false
            agentStore.sessionExpiredShown = false

            // Check every 30 seconds if we've reached the warning/expiration threshold
            const timer = setInterval(() => {
                const elapsed = Date.now() - agentStore.sessionStartTime
                const warningThreshold = 25 * 60 * 1000 // 25 minutes
                const expirationThreshold = 28 * 60 * 1000 // 28 minutes

                // Show 25-minute warning
                if (elapsed >= warningThreshold && !agentStore.sessionWarningShown) {
                    agentStore.sessionWarningShown = true
                    this.addSystemMessage({
                        message: 'Your conversation history will expire soon. You can start a new conversation when this one expires.',
                        type: 'warning'
                    })
                }

                // Show 30-minute expiration
                if (elapsed >= expirationThreshold && !agentStore.sessionExpiredShown) {
                    agentStore.sessionExpiredShown = true
                    this.addSystemMessage({
                        message: 'Your conversation history has expired. Chat is now disabled. Click "Start Over" to begin a new conversation.',
                        type: 'expired'
                    })
                }
            }, 30000) // Check every 30 seconds

            agentStore.setSessionCheckTimer(timer)
        },

        resetSessionTimer () {
            const agentStore = this._agentStore
            if (agentStore.sessionCheckTimer) {
                clearInterval(agentStore.sessionCheckTimer)
                agentStore.sessionCheckTimer = null
            }
            agentStore.sessionStartTime = null
            agentStore.sessionWarningShown = false
            agentStore.sessionExpiredShown = false
        },

        /**
         *
         * @param {'ff-agent' | 'operator-agent'} mode
         */
        setAgentMode (mode) {
            if (![OPERATOR_AGENT, FF_AGENT].includes(mode)) return
            this.agentMode = mode
        },

        /**
         * Adds a system message to the application's message store.
         *
         * @param {Object} payload - An object containing the message details.
         * @param {string} [payload.message=''] - The content of the system message.
         * @param {string} [payload.type='warning'] - The type of system message (e.g., 'warning', 'info', or 'error').
         */
        addSystemMessage ({ message = '', type = 'warning' }) {
            if (!['warning', 'expired'].includes(type) || !message.length) return
            this._agentStore.messages.push({
                _type: 'system',
                _variant: type,
                message,
                _timestamp: Date.now(),
                _uuid: uuidv4()
            })
        },

        addPredefinedAiMessage (message) {
            this._agentStore.messages.push({
                _type: 'ai',
                answer: [{ content: message, _streamed: false, _uuid: uuidv4() }],
                _timestamp: Date.now(),
                _streamed: false,
                _uuid: uuidv4()
            })
        },

        addAiMessage (message) {
            const answer = message.answer
                ? message.answer.map(a => ({ ...a, _uuid: uuidv4(), _streamed: false }))
                : []
            this._agentStore.messages.push({
                ...message,
                answer,
                _type: 'ai',
                _timestamp: Date.now(),
                _streamed: false,
                _uuid: uuidv4()
            })
        },

        addUserMessage (message) {
            this._agentStore.messages.push({
                _type: 'human',
                content: message,
                _timestamp: Date.now(),
                _uuid: uuidv4()
            })
        },

        updateMessageStreamedState (uuid) {
            let message = useProductExpertFfAgentStore().messages.find(m => m._uuid === uuid)
            if (!message) {
                message = useProductExpertOperatorAgentStore().messages.find(m => m._uuid === uuid)
            }
            if (message) {
                message._streamed = true
            }
        },

        updateAnswerStreamedState ({ messageUuid, answerUuid }) {
            let message = useProductExpertFfAgentStore().messages.find(m => m._uuid === messageUuid)
            if (!message) {
                message = useProductExpertOperatorAgentStore().messages.find(m => m._uuid === messageUuid)
            }
            if (message) {
                const answer = message.answer?.find(a => a._uuid === answerUuid)
                if (answer) {
                    answer._streamed = true
                }
            }
        },

        hydrateMessages (messages) {
            if (!messages) return
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

                        this._agentStore.messages.push({
                            _type: 'ai',
                            kind: 'tool_calls',
                            toolCalls,
                            duration: totalDurationSec,
                            content: `${toolCalls.length} tool call(s)`,
                            _timestamp: Date.now(),
                            _streamed: true,
                            _uuid: uuidv4()
                        })
                    }

                    // AI response with answer array - process each item
                    message.answer.forEach((item) => {
                        if (item.kind === 'guide') {
                            // Transform guide response
                            this._agentStore.messages.push({
                                _type: 'ai',
                                kind: 'guide',
                                guide: item,
                                content: item.title || 'Setup Guide',
                                _timestamp: Date.now(),
                                _streamed: true,
                                _uuid: uuidv4()
                            })
                        } else if (item.kind === 'resources') {
                            // Transform resources response
                            this._agentStore.messages.push({
                                _type: 'ai',
                                kind: 'resources',
                                resources: item,
                                content: item.title || 'Resources',
                                _timestamp: Date.now(),
                                _streamed: true,
                                _uuid: uuidv4()
                            })
                        } else if (item.kind === 'chat') {
                            // Transform chat response
                            this._agentStore.messages.push({
                                _type: 'ai',
                                content: item.content,
                                _timestamp: Date.now(),
                                _streamed: true,
                                _uuid: uuidv4()
                            })
                        }
                    })
                } else if (message.query) {
                    // Transform user message
                    this._agentStore.messages.push({
                        _type: 'human',
                        content: message.query,
                        _timestamp: Date.now(),
                        _uuid: uuidv4()
                    })
                }
                // Else: ignore messages that don't match either format
            })
        }
    }
})
