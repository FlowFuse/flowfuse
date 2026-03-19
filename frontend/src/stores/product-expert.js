import { defineStore } from 'pinia'
import { v4 as uuidv4 } from 'uuid'
import { markRaw } from 'vue'

import expertApi from '../api/expert.js'
import useTimerHelper from '../composables/TimerHelper.js'

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
        loadingVariant: FF_AGENT
    }),
    getters: {
        _agentStore () {
            return this.agentMode === FF_AGENT
                ? useProductExpertFfAgentStore()
                : useProductExpertOperatorAgentStore()
        },
        abortController () { return this._agentStore.abortController },
        messages () { return this._agentStore.messages },
        hasMessages () { return this._agentStore.messages.length > 0 },
        hasUserMessages () { return this._agentStore.messages.some(m => m._type === 'human') },
        lastMessage () {
            const msgs = this._agentStore.messages
            return msgs.length > 0 ? msgs[msgs.length - 1] : null
        },
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
                this.setAssistantWakeUp(false)

                if (shouldHydrateMessages) {
                    this.hydrateMessages(this._agentStore.context)
                }

                this.loadingVariant = 'transfer'

                return this.openAssistantDrawer()
                    .then(() => this.hydrateClient())
                    .then(() => { this.loadingVariant = this.agentMode })
            }
        },

        async handleQuery ({ query }) {
            const agentStore = this._agentStore

            if (!agentStore.sessionId) {
                agentStore.sessionId = uuidv4()
            }

            if (!agentStore.sessionStartTime) {
                this.startSessionTimer()
            }

            this.addUserMessage(query)

            agentStore.abortController = markRaw(new AbortController())

            try {
                return await this.sendQuery({ query })
            } catch (error) {
                if (error.name === 'AbortError' || error.name === 'CanceledError') {
                    this.addPredefinedAiMessage('Generation stopped.')
                } else {
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

            this.resetSessionTimer()
            this.startSessionTimer()

            const operatorStore = useProductExpertOperatorAgentStore()
            operatorStore.setSelectedCapabilities([])
            await operatorStore.getCapabilities()

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

        async openAssistantDrawer () {
            const { featuresCheck } = useAccountBridge()
            if (featuresCheck.isExpertAssistantFeatureEnabled === false) {
                return
            }

            useProductExpertOperatorAgentStore().getCapabilities()

            const { default: ExpertDrawer } = await import('../components/drawers/expert/ExpertDrawer.vue')
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
                this.addPredefinedAiMessage(message)
            }
        },

        setAssistantWakeUp (shouldWakeUp) { this.shouldWakeUpAssistant = shouldWakeUp },

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
                    this.addSystemMessage({
                        message: 'Your conversation history will expire soon. You can start a new conversation when this one expires.',
                        type: 'warning'
                    })
                }

                if (elapsed >= expirationThreshold && !agentStore.sessionExpiredShown) {
                    agentStore.sessionExpiredShown = true
                    this.addSystemMessage({
                        message: 'Your conversation history has expired. Chat is now disabled. Click "Start Over" to begin a new conversation.',
                        type: 'expired'
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
        },

        // Message helper actions
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
                if (message.answer && Array.isArray(message.answer)) {
                    this._agentStore.messages.push({
                        ...message,
                        answer: message.answer.map(a => ({ ...a, _uuid: uuidv4(), _streamed: true })),
                        _type: 'ai',
                        _timestamp: Date.now(),
                        _streamed: true,
                        _uuid: uuidv4()
                    })
                } else if (message.query) {
                    this._agentStore.messages.push({
                        _type: 'human',
                        content: message.query,
                        _timestamp: Date.now(),
                        _uuid: uuidv4()
                    })
                }
            })
        }
    },
    persist: {
        pick: ['shouldWakeUpAssistant'],
        storage: localStorage
    }
})
