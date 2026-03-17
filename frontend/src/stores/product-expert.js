import { defineStore } from 'pinia'
import { v4 as uuidv4 } from 'uuid'
import { markRaw } from 'vue'

import expertApi from '../api/expert.js'
import ExpertDrawer from '../components/drawers/expert/ExpertDrawer.vue'
import useTimerHelper from '../composables/TimersHelper.js'

import { useAccountBridge } from './_account_bridge.js'
import { useContextStore } from './context.js'
import { useProductAssistantStore } from './product-assistant.js'
import { FF_AGENT, OPERATOR_AGENT } from './product-expert-agents.js'
import { useProductExpertFfAgentStore } from './product-expert-ff-agent.js'
import { useProductExpertOperatorAgentStore } from './product-expert-operator-agent.js'
import { useUxDrawersStore } from './ux-drawers.js'

export const useProductExpertStore = defineStore('product-expert', {
    state: () => ({
        shouldWakeUpAssistant: false,
        agentMode: FF_AGENT,
        isGenerating: false,
        autoScrollEnabled: true,
        abortController: null,
        streamingWordIndex: -1,
        streamingWords: [],
        streamingTimer: null
    }),
    getters: {
        // Helper to get the current agent store — used by all message/session getters
        _agentStore () {
            return this.agentMode === FF_AGENT
                ? useProductExpertFfAgentStore()
                : useProductExpertOperatorAgentStore()
        },
        messages () { return this._agentStore.messages },
        hasMessages () { return this._agentStore.messages.length > 0 },
        hasUserMessages () { return this._agentStore.messages.some(m => m.type === 'human') },
        lastMessage () {
            const msgs = this._agentStore.messages
            return msgs.length > 0 ? msgs[msgs.length - 1] : null
        },
        isSessionExpired () { return this._agentStore.sessionExpiredShown },
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
        // Context actions and lifecycle
        async setContext ({ data, sessionId }) {
            const { featuresCheck } = useAccountBridge()
            if (featuresCheck.isExpertAssistantFeatureEnabled === false) {
                return
            }

            const agentStore = this._agentStore
            agentStore.context = data

            if (sessionId) {
                agentStore.sessionId = sessionId
            }

            this.shouldWakeUpAssistant = true

            const store = require('../store/index.js').default
            if (store.state.account?.user) {
                await this.wakeUpAssistant({
                    shouldHydrateMessages: true,
                    shouldAddTransferLoadingIndicator: true
                })
            }
        },

        async hydrateClient () {
            const { featuresCheck } = useAccountBridge()
            if (featuresCheck.isExpertAssistantFeatureEnabled === false) {
                return
            }

            // TODO: this need to be removed when we have https://github.com/FlowFuse/flowfuse/issues/6520 part of
            //  https://github.com/FlowFuse/flowfuse/issues/6519 as it's a hacky workaround to the expert drawer opening up
            //  before we have a team loaded
            const { waitWhile } = useTimerHelper()
            const { team } = useAccountBridge()
            await waitWhile(() => !useAccountBridge().team, { cutoffTries: 60 })

            const agentStore = this._agentStore
            return expertApi
                .chat({
                    history: agentStore.context,
                    context: { teamId: team.id },
                    sessionId: agentStore.sessionId
                })
                .then((response) => {
                    return this.removeLoadingIndicator().then
                        ? this.removeLoadingIndicator().then(() =>
                            this.handleMessageResponse({
                                success: true,
                                answer: response.answer || []
                            })
                        )
                        : Promise.resolve(this.removeLoadingIndicator()).then(() =>
                            this.handleMessageResponse({
                                success: true,
                                answer: response.answer || []
                            })
                        )
                })
        },

        wakeUpAssistant ({ shouldHydrateMessages = false } = {}) {
            if (this.shouldWakeUpAssistant) {
                this.setAssistantWakeUp(false)

                if (shouldHydrateMessages) {
                    this.hydrateMessages(this._agentStore.context)
                }

                this._agentStore.messages.push({
                    type: 'loading',
                    variant: 'transfer',
                    timestamp: Date.now()
                })

                return this.openAssistantDrawer()
                    .then(() => this.hydrateClient())
            }
        },

        async handleMessage ({ query }) {
            const agentStore = this._agentStore

            if (!agentStore.sessionId) {
                agentStore.sessionId = uuidv4()
            }

            if (!agentStore.sessionStartTime) {
                this.startSessionTimer()
            }

            agentStore.messages.push({
                type: 'human',
                content: query,
                timestamp: Date.now()
            })

            agentStore.messages.push({
                type: 'loading',
                variant: this.agentMode === OPERATOR_AGENT ? 'insights' : 'default',
                timestamp: Date.now()
            })

            this.isGenerating = true
            this.abortController = markRaw(new AbortController())

            try {
                const response = await this.sendQuery({ query })

                if (this.agentMode === OPERATOR_AGENT) {
                    await new Promise(resolve => setTimeout(resolve, 8000))
                }

                this.removeLoadingIndicator()

                return {
                    success: true,
                    answer: response.answer || []
                }
            } catch (error) {
                this.removeLoadingIndicator()

                if (error.name === 'AbortError' || error.name === 'CanceledError') {
                    agentStore.messages.push({
                        type: 'ai',
                        content: 'Generation stopped.',
                        timestamp: Date.now()
                    })
                } else {
                    console.error('Expert API error:', error)
                    agentStore.messages.push({
                        type: 'ai',
                        content: 'Sorry, I encountered an error. Please try again.',
                        timestamp: Date.now()
                    })
                }

                return { success: false, error }
            } finally {
                this.isGenerating = false
                this.abortController = null
                this.removeLoadingIndicator()
            }
        },

        async handleMessageResponse (response) {
            if (response.success && response.answer && Array.isArray(response.answer)) {
                const operatorStore = useProductExpertOperatorAgentStore()
                const isOperatorWithCapabilities =
                    this.agentMode === OPERATOR_AGENT &&
                    operatorStore.selectedCapabilities?.length > 0

                const mcpItems = response.answer.filter(item =>
                    item.kind === 'mcp_tool' ||
                    item.kind === 'mcp_resource' ||
                    item.kind === 'mcp_resource_template' ||
                    item.kind === 'mcp_prompt'
                )

                if (isOperatorWithCapabilities && mcpItems.length > 0) {
                    const toolCalls = mcpItems.map(item => ({
                        id: item.toolId,
                        name: item.toolName,
                        title: item.toolTitle || item.toolName,
                        kind: item.kind,
                        args: item.input,
                        output: item.output,
                        durationMs: item.durationMs
                    }))

                    const totalDurationMs = mcpItems.reduce((sum, item) => sum + (item.durationMs || 0), 0)
                    const totalDurationSec = (totalDurationMs / 1000).toFixed(2)

                    this._agentStore.messages.push({
                        type: 'ai',
                        kind: 'tool_calls',
                        toolCalls,
                        duration: totalDurationSec,
                        content: `${toolCalls.length} tool call(s)`,
                        timestamp: Date.now()
                    })
                }

                const hasFlows = response.answer.some(item =>
                    item.flows && Array.isArray(item.flows) && item.flows.length > 0
                )

                for (const item of response.answer) {
                    if (item.kind === 'guide') {
                        this._agentStore.messages.push({
                            type: 'ai',
                            kind: 'guide',
                            guide: item,
                            content: item.title || 'Setup Guide',
                            timestamp: Date.now()
                        })
                    } else if (item.kind === 'resources') {
                        this._agentStore.messages.push({
                            type: 'ai',
                            kind: 'resources',
                            resources: item,
                            content: item.title || 'Resources',
                            timestamp: Date.now()
                        })
                    } else if (item.kind === 'chat' && ((Array.isArray(item.issues) && item.issues.length > 0) || (Array.isArray(item.suggestions) && item.suggestions.length > 0))) {
                        this._agentStore.messages.push({
                            type: 'ai',
                            kind: 'chat',
                            resources: item,
                            content: item.content || 'Response',
                            timestamp: Date.now()
                        })
                    } else if (item.kind === 'chat') {
                        await this.streamMessage(item.content)
                    }
                }

                if (hasFlows) {
                    useUxDrawersStore().setRightDrawerWider(true)
                }
            } else if (response.success && (!response.answer || !Array.isArray(response.answer))) {
                this._agentStore.messages.push({
                    type: 'ai',
                    content: 'Sorry, I received an unexpected response format.',
                    timestamp: Date.now()
                })
            }
        },

        addMessage (message) {
            this._agentStore.messages.push(message)
        },

        updateLastMessage (content) {
            const msgs = this._agentStore.messages
            if (msgs.length > 0) {
                msgs[msgs.length - 1].content = content
            }
        },

        clearConversation () {
            this._agentStore.messages = []
        },

        async startOver () {
            const agentStore = this._agentStore
            agentStore.sessionId = uuidv4()
            agentStore.messages = []
            this.isGenerating = false

            this.resetSessionTimer()
            this.startSessionTimer()

            const operatorStore = useProductExpertOperatorAgentStore()
            operatorStore.setSelectedCapabilities([])
            await operatorStore.getCapabilities()

            this.addWelcomeMessageIfNeeded()
        },

        setGenerating (isGenerating) { this.isGenerating = isGenerating },

        setAutoScroll (enabled) { this.autoScrollEnabled = enabled },

        setAbortController (controller) {
            this.abortController = controller ? markRaw(controller) : null
        },

        reset () {
            // Reset current agent store first, then this store
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
                abortController: this.abortController
            }

            if (this.isOperatorAgent) {
                payload.context.selectedCapabilities = useProductExpertOperatorAgentStore().selectedCapabilities
            }

            return expertApi.chat(payload)
        },

        openAssistantDrawer () {
            const { featuresCheck } = useAccountBridge()
            if (featuresCheck.isExpertAssistantFeatureEnabled === false) {
                return
            }

            useProductExpertOperatorAgentStore().getCapabilities()

            return useUxDrawersStore().openRightDrawer({ component: markRaw(ExpertDrawer) })
        },

        addWelcomeMessageIfNeeded () {
            const agentStore = this._agentStore
            if (agentStore.messages.length > 0) {
                return
            }

            const welcomeMessages = {
                [FF_AGENT]: 'Hello! I am here to help you get started with FlowFuse and Node-RED. I can answer your questions, provide links to documentation, or help you build step-by-step guides to achieve your goals. How can I assist you today?',
                [OPERATOR_AGENT]: 'Hello! I can help you gather insights by interacting with your configured resources and MCP tools in your Node-RED instances. What would you like to find out?'
            }

            const noResourcesMessage = 'Hello! To use Insights mode, you\'ll need to configure MCP servers in your Node-RED instances first. Once configured, I can help you interact with your flows and gather insights. Switch to Support mode if you need help getting started or watch this [introduction to Node-RED MCP server nodes](https://youtu.be/troUvaF8V68?si=P9GedupXhe5-ifaa).'

            let message = welcomeMessages[this.agentMode]

            if (this.agentMode === OPERATOR_AGENT) {
                const capabilities = useProductExpertOperatorAgentStore().capabilityServers
                if (!capabilities || capabilities.length === 0) {
                    message = noResourcesMessage
                }
            }

            if (message) {
                this.streamMessage(message)
            }
        },

        setAssistantWakeUp (shouldWakeUp) { this.shouldWakeUpAssistant = shouldWakeUp },

        async streamMessage (content) {
            const words = content.split(' ')
            this.streamingWords = words
            this.streamingWordIndex = 0

            this._agentStore.messages.push({
                type: 'ai',
                content: '',
                isStreaming: true,
                timestamp: Date.now()
            })

            return new Promise((resolve) => {
                const streamNextWord = () => {
                    if (this.streamingWordIndex >= this.streamingWords.length) {
                        const lastMsg = this.lastMessage
                        if (lastMsg) {
                            lastMsg.isStreaming = false
                        }
                        this.streamingWordIndex = -1
                        this.streamingWords = []
                        resolve()
                        return
                    }

                    const word = this.streamingWords[this.streamingWordIndex]
                    const currentContent = this.lastMessage?.content || ''
                    const newContent = currentContent + (currentContent ? ' ' : '') + word

                    this.updateLastMessage(newContent)
                    this.streamingWordIndex++

                    this.streamingTimer = markRaw(setTimeout(streamNextWord, 30))
                }

                streamNextWord()
            })
        },

        clearStreamingTimer () {
            clearTimeout(this.streamingTimer)
            this.streamingTimer = null
        },

        setStreamingWordIndex (index) { this.streamingWordIndex = index },

        setStreamingWords (words) { this.streamingWords = words },

        removeLoadingIndicator () {
            const msgs = this._agentStore.messages
            const loadingIndex = msgs.findIndex(m => m.type === 'loading')
            if (loadingIndex !== -1) {
                msgs.splice(loadingIndex, 1)
            }
        },

        hydrateMessages (messages) {
            if (!messages) return
            messages.forEach((message) => {
                if (message.answer && Array.isArray(message.answer)) {
                    const mcpItems = message.answer.filter(item =>
                        item.kind === 'mcp_tool' ||
                        item.kind === 'mcp_resource' ||
                        item.kind === 'mcp_resource_template' ||
                        item.kind === 'mcp_prompt'
                    )

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
                        const totalDurationMs = mcpItems.reduce((sum, item) => sum + (item.durationMs || 0), 0)
                        const totalDurationSec = (totalDurationMs / 1000).toFixed(2)

                        this._agentStore.messages.push({
                            type: 'ai',
                            kind: 'tool_calls',
                            toolCalls,
                            duration: totalDurationSec,
                            content: `${toolCalls.length} tool call(s)`,
                            timestamp: Date.now()
                        })
                    }

                    message.answer.forEach((item) => {
                        if (item.kind === 'guide') {
                            this._agentStore.messages.push({
                                type: 'ai',
                                kind: 'guide',
                                guide: item,
                                content: item.title || 'Setup Guide',
                                timestamp: Date.now()
                            })
                        } else if (item.kind === 'resources') {
                            this._agentStore.messages.push({
                                type: 'ai',
                                kind: 'resources',
                                resources: item,
                                content: item.title || 'Resources',
                                timestamp: Date.now()
                            })
                        } else if (item.kind === 'chat') {
                            this._agentStore.messages.push({
                                type: 'ai',
                                content: item.content,
                                timestamp: Date.now()
                            })
                        }
                    })
                } else if (message.query) {
                    this._agentStore.messages.push({
                        type: 'human',
                        content: message.query,
                        timestamp: Date.now()
                    })
                }
            })
        },

        removeMessageByIndex (index) {
            this._agentStore.messages.splice(index, 1)
        },

        startSessionTimer () {
            const agentStore = this._agentStore

            if (agentStore.sessionCheckTimer) {
                clearInterval(agentStore.sessionCheckTimer)
            }

            agentStore.sessionStartTime = Date.now()
            agentStore.sessionWarningShown = false
            agentStore.sessionExpiredShown = false

            const timer = setInterval(() => {
                const elapsed = Date.now() - agentStore.sessionStartTime
                const warningThreshold = 25 * 60 * 1000
                const expirationThreshold = 28 * 60 * 1000

                if (elapsed >= warningThreshold && !agentStore.sessionWarningShown) {
                    agentStore.sessionWarningShown = true
                    agentStore.messages.push({
                        type: 'system',
                        variant: 'warning',
                        content: 'Your conversation history will expire soon. You can start a new conversation when this one expires.',
                        timestamp: Date.now()
                    })
                }

                if (elapsed >= expirationThreshold && !agentStore.sessionExpiredShown) {
                    agentStore.sessionExpiredShown = true
                    agentStore.messages.push({
                        type: 'system',
                        variant: 'expired',
                        content: 'Your conversation history has expired. Chat is now disabled. Click "Start Over" to begin a new conversation.',
                        timestamp: Date.now()
                    })
                }
            }, 30000)

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

        setAgentMode (mode) {
            if (![OPERATOR_AGENT, FF_AGENT].includes(mode)) return
            this.agentMode = mode
        }
    },
    persist: {
        pick: ['shouldWakeUpAssistant'],
        storage: localStorage
    }
})
