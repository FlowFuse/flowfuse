import { defineStore } from 'pinia'
import { v4 as uuidv4 } from 'uuid'
import { markRaw, watch } from 'vue'

import expertApi from '../api/expert.js'
import userApi from '../api/user.js'
import useTimerHelper from '../composables/TimerHelper.js'

import { useAccountSettingsStore } from './account-settings.js'
import { useContextStore } from './context.js'
import { useProductAssistantStore } from './product-assistant.js'
import { INSIGHTS_AGENT, SUPPORT_AGENT } from './product-expert-agents.js'
import { useProductExpertInsightsAgentStore } from './product-expert-insights-agent.js'
import { useProductExpertSupportAgentStore } from './product-expert-support-agent.js'
import { useUxDrawersStore } from './ux-drawers.js'

import { useMqttExpertTopicHelper } from '@/composables/services/MqttExpertTopicHelper'

import getServicesOrchestrator from '@/services/service.orchestrator'

// TODO currently hardcodded
const IS_MQTT_ENABLED = true

export const useProductExpertStore = defineStore('product-expert', {
    state: () => ({
        agentMode: SUPPORT_AGENT, // support-agent or insights-agent
        loadingVariant: SUPPORT_AGENT,
        shouldWakeUpAssistant: false
    }),
    getters: {
        _agentStore () {
            return this.agentMode === SUPPORT_AGENT
                ? useProductExpertSupportAgentStore()
                : useProductExpertInsightsAgentStore()
        },
        _inFlightRequests () {
            return this.agentMode === SUPPORT_AGENT
                ? useProductExpertSupportAgentStore().inFlightRequests
                : useProductExpertInsightsAgentStore().inFlightRequests
        },
        abortController () { return this._agentStore.abortController },
        messages () { return this._agentStore.messages },
        hasMessages () { return this._agentStore.messages.length > 0 },
        isSessionExpired () { return this._agentStore.sessionExpiredShown },
        isWaitingForResponse () { return !!this._agentStore.abortController },
        isSupportAgent: (state) => state.agentMode === SUPPORT_AGENT,
        isInsightsAgent: (state) => state.agentMode === INSIGHTS_AGENT,
        hasSelectedCapabilities () {
            return useProductExpertInsightsAgentStore().selectedCapabilities?.length > 0
        },
        canImportFlows () {
            const assistantStore = useProductAssistantStore()
            return !!assistantStore.immersiveInstance && !!assistantStore.supportedActions['custom:import-flow']
        },
        canManagePalette () {
            const assistantStore = useProductAssistantStore()
            return !!assistantStore.immersiveInstance && !!assistantStore.supportedActions['core:manage-palette']
        },
        mqttConnectionKey () { return this._agentStore.mqttConnectionKey },
        sessionId () { return this._agentStore.sessionId }
    },
    actions: {
        setContext ({ data, sessionId }) {
            const featuresCheck = useAccountSettingsStore().featuresCheck
            if (featuresCheck.isExpertAssistantFeatureEnabled === false) {
                return
            }

            const supportAgentStore = useProductExpertSupportAgentStore()
            supportAgentStore.context = data

            if (sessionId) {
                supportAgentStore.sessionId = sessionId
            }

            this.shouldWakeUpAssistant = true
        },
        clearWakeUp () {
            this.shouldWakeUpAssistant = false
        },
        async hydrateClient () {
            const featuresCheck = useAccountSettingsStore().featuresCheck
            if (featuresCheck.isExpertAssistantFeatureEnabled === false) {
                return
            }

            // TODO: this need to be removed when we have https://github.com/FlowFuse/flowfuse/issues/6520 part of
            //  https://github.com/FlowFuse/flowfuse/issues/6519 as it's a hacky workaround to the expert drawer opening up
            //  before we have a team loaded
            const { waitWhile } = useTimerHelper()
            await waitWhile(() => !useContextStore().team, { cutoffTries: 60 })

            const agentStore = this._agentStore
            const team = useContextStore().team

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
        sendQuery ({ query }) {
            if (IS_MQTT_ENABLED && this.isSupportAgent) {
                return this.handleMqttQuery({ query })
            } else {
                return this.sendHttpQuery({ query })
            }
        },
        async sendHttpQuery ({ query }) {
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

            if (this.isInsightsAgent) {
                payload.context.selectedCapabilities = useProductExpertInsightsAgentStore().selectedCapabilities
            }

            return expertApi.chat(payload)
        },
        async handleMqttQuery ({ query }) {
            const servicesOrchestrator = getServicesOrchestrator()
            const mqttService = servicesOrchestrator.$serviceInstances.mqtt
            const mqttTopicHelper = useMqttExpertTopicHelper()

            const transactionId = uuidv4()
            const mqttConnectionKey = this.mqttConnectionKey

            // add the query as an inFlight request
            this._inFlightRequests.set(transactionId, { query })

            if (!mqttService.hasClient(mqttConnectionKey)) await this.establishMqttComms()
            const { entityId, entityType } = mqttTopicHelper.getEntityTopicPaths()

            const topic = mqttTopicHelper.buildTopic({
                entityType,
                entityId,
                agentChannel: 'support',
                topicType: 'chat',
                topicAction: 'request'
            })

            return mqttService.publishMessage(mqttConnectionKey, {
                topic,
                qos: 2,
                payload: {
                    query,
                    context: {
                        ...useContextStore().expert,
                        agent: this.agentMode
                    }
                },
                correlationData: transactionId,
                userProperties: {
                    sessionId: this.sessionId
                }
            })
        },
        async establishMqttComms () {
            const servicesOrchestrator = getServicesOrchestrator()
            const mqttService = servicesOrchestrator.$serviceInstances.mqtt
            const topicHelper = useMqttExpertTopicHelper()

            // todo remove, dev only
            window.qwe = mqttService

            await mqttService.createClient(this.mqttConnectionKey, {
                getCredentials: () => userApi.initiateExpertChat({ sessionId: this.sessionId }),
                onMessage: async (topic, message, packet) => {
                    const parsedTopic = topicHelper.parseTopic(topic)
                    const transactionId = packet.properties?.correlationData ? new TextDecoder().decode(packet.properties.correlationData) : null

                    if (parsedTopic.isReply) {
                        // remove inFlight request because it is now resolved
                        this._inFlightRequests.delete(transactionId)

                        // handle the response
                        await this.handleMessageResponse(JSON.parse(message.toString()))
                    } else if (parsedTopic.isInflightRequest) {
                        await this.handleInFlightRequest({
                            topic,
                            message,
                            packet,
                            transactionId
                        })
                    }
                },
                onClose: () => {
                    // TODO add error message
                },
                onConnect: () => {
                    const mqttTopicHelper = useMqttExpertTopicHelper()

                    mqttService.subscribe(
                        this.mqttConnectionKey,
                        mqttTopicHelper.buildTopic({
                            entityType: '+',
                            entityId: '+',
                            agentChannel: 'support',
                            topicType: 'chat',
                            topicAction: 'response'
                        }),
                        { qos: 2 }
                    )

                    mqttService.subscribe(
                        this.mqttConnectionKey,
                        mqttTopicHelper.buildTopic({
                            entityType: '+',
                            entityId: '+',
                            agentChannel: 'support',
                            topicType: 'inflight',
                            topicAction: 'request',
                            inflightType: '+'
                        }),
                        { qos: 2 }
                    )

                    // whenever the sessionId changes, we need to unsubscribe from previous topics and subscribe to the
                    // new ones based off of the new sessionId
                    watch(
                        () => this._agentStore.sessionId,
                        async () => {
                            if (!mqttService.hasClient(this.mqttConnectionKey)) return

                            const timerHelper = useTimerHelper()
                            await mqttService.destroyClient(this.mqttConnectionKey)

                            // todo extract all hooks into atomic methods and prevent this recursion from happening
                            //  good enough for demo purposes
                            await this.establishMqttComms()
                            // todo also, getting required creds fails from time to time because we're creating the client
                            //  before the backend successfully remove the old one

                            const managedClient = mqttService.getManagedClient(this.mqttConnectionKey)

                            await timerHelper.waitWhile(
                                () => ['connected'].includes(managedClient.status),
                                { intervalMs: 200, cutoffTries: 50 }
                            )

                            await new Promise(resolve => setTimeout(resolve, 5000))

                            await mqttService.subscribe(
                                this.mqttConnectionKey,
                                mqttTopicHelper.buildTopic({
                                    entityType: '+',
                                    entityId: '+',
                                    agentChannel: 'support',
                                    topicType: 'chat',
                                    topicAction: 'response'
                                }),
                                { qos: 2 }
                            )
                            await mqttService.subscribe(
                                this.mqttConnectionKey,
                                mqttTopicHelper.buildTopic({
                                    entityType: '+',
                                    entityId: '+',
                                    agentChannel: 'support',
                                    topicType: 'inflight',
                                    topicAction: 'request',
                                    inflightType: '+'
                                }),
                                { qos: 2 }
                            )
                        }
                    )
                },
                onOffline: () => {
                    // TODO add error message
                },
                onError: (e) => {
                    // TODO add error message
                }
            })
        },
        async handleInFlightRequest ({ topic, message, packet, transactionId }) {
            const servicesOrchestrator = getServicesOrchestrator()
            const mqttService = servicesOrchestrator.$serviceInstances.mqtt

            const assistantStore = useProductAssistantStore()

            const topicHelper = useMqttExpertTopicHelper()
            const parsedTopic = topicHelper.parseTopic(topic)

            const msg = JSON.parse(message.toString())
            const sessionId = this.sessionId

            if (parsedTopic.inflightType === 'expert:status-message') {
                const responseTopic = topicHelper.buildTopic({
                    entityType: parsedTopic.entityType,
                    entityId: parsedTopic.entityId,
                    agentChannel: 'support',
                    topicType: 'inflight',
                    topicAction: 'response',
                    inflightType: parsedTopic.inflightType
                })

                // this is just a status from the agent, we can ignore it for now, but we might want to display it in the UI later
                // just ack the msg
                // todo do we need it?
                await mqttService.publishMessage(this.mqttConnectionKey, {
                    qos: 2,
                    topic: responseTopic,
                    payload: JSON.stringify({
                        ack: true
                    }),
                    correlationData: new TextEncoder().encode(transactionId),
                    userProperties: { sessionId }
                })
            } else if (parsedTopic.inflightType.startsWith('automation:')) {
                // thi is an automation request, we want to execute it and return the result to the agent
                const postMessagePayload = {
                    action: parsedTopic.inflightType.replace('automation:', 'automation/'),
                    params: msg.payload?.params || {},
                    userProperties: { sessionId },
                    transactionId
                }

                // adding the inFlightRequest to the queue because the message is passed along to the nr-assistant
                this._inFlightRequests.set(transactionId, { topic, message, packet, postMessagePayload })

                await assistantStore.invokeAction(postMessagePayload)
            }
        },
        async handleAgentReply ({ transactionId, response }) {
            if (!this._inFlightRequests.has(transactionId)) return false

            const servicesOrchestrator = getServicesOrchestrator()
            const mqttService = servicesOrchestrator.$serviceInstances.mqtt
            const topicHelper = useMqttExpertTopicHelper()

            const originalInFlightRequest = this._inFlightRequests.get(transactionId)
            const originalTopic = topicHelper.parseTopic(originalInFlightRequest.topic)
            const replyTopic = topicHelper.buildTopic({
                entityType: originalTopic.entityType,
                entityId: originalTopic.entityId,
                agentChannel: 'support',
                topicType: 'inflight',
                topicAction: 'response',
                inflightType: originalTopic.inflightType
            })

            const payload = JSON.stringify(response.data)

            await mqttService.publishMessage(this.mqttConnectionKey, {
                qos: 2,
                topic: replyTopic,
                payload,
                correlationData: new TextEncoder().encode(transactionId),
                userProperties: { sessionId: this.sessionId }
            })

            this._inFlightRequests.delete(transactionId)
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
            const insightsStore = useProductExpertInsightsAgentStore()
            insightsStore.setSelectedCapabilities([])
            await insightsStore.getCapabilities()

            // Add welcome message for current mode
            this.addWelcomeMessageIfNeeded()
        },
        openAssistantDrawer (options = {}) {
            const featuresCheck = useAccountSettingsStore().featuresCheck
            if (featuresCheck.isExpertAssistantFeatureEnabled === false) return

            useProductExpertInsightsAgentStore().getCapabilities()
            // Lazy import to avoid circular dep: product-expert.js → ExpertDrawer.vue → product-expert.js
            return import('../components/drawers/expert/ExpertDrawer.vue')
                .then(({ default: ExpertDrawer }) => useUxDrawersStore().openRightDrawer({
                    component: markRaw(ExpertDrawer),
                    fixed: options?.openPinned === true,
                    closeOnClickOutside: options?.openPinned !== true
                }))
        },
        wakeUpAssistant ({ shouldHydrateMessages = false } = {}) {
            if (this.shouldWakeUpAssistant) {
                const featuresCheck = useAccountSettingsStore().featuresCheck
                if (featuresCheck.isExpertAssistantFeatureEnabled === false) return

                this.clearWakeUp()

                if (shouldHydrateMessages) {
                    this.hydrateMessages(this._agentStore.context)
                }

                this.loadingVariant = 'transfer'

                return this.openAssistantDrawer({ openPinned: useUxDrawersStore().rightDrawer.expertState.pinned })
                    .then(() => this.hydrateClient())
                    .then(() => { this.loadingVariant = this.agentMode })
            }
        },
        setAbortController (controller) {
            this._agentStore.abortController = controller ? markRaw(controller) : null
        },
        reset () {
            this._agentStore.reset()
            this.$reset()
        },
        addWelcomeMessageIfNeeded () {
            const currentMode = this.agentMode
            const hasMessages = this._agentStore.messages.length > 0

            if (hasMessages) {
                return
            }

            const welcomeMessages = {
                [SUPPORT_AGENT]: 'Hello! I am here to help you get started with FlowFuse and Node-RED. I can answer your questions, provide links to documentation, or help you build step-by-step guides to achieve your goals. How can I assist you today?',
                [INSIGHTS_AGENT]: 'Hello! I can help you gather insights by interacting with your configured resources and MCP tools in your Node-RED instances. What would you like to find out?'
            }

            const noResourcesMessage = 'Hello! To use Insights mode, you\'ll need to configure MCP servers in your Node-RED instances first. Once configured, I can help you interact with your flows and gather insights. Switch to Support mode if you need help getting started or watch this [introduction to Node-RED MCP server nodes](https://youtu.be/troUvaF8V68?si=P9GedupXhe5-ifaa).'

            // Determine which message to show
            let message = welcomeMessages[currentMode]

            // In Insights mode, check if capabilities are available
            if (currentMode === INSIGHTS_AGENT) {
                const capabilities = useProductExpertInsightsAgentStore().capabilityServers
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
         * @param {'support-agent' | 'insights-agent'} mode
         */
        setAgentMode (mode) {
            if (![INSIGHTS_AGENT, SUPPORT_AGENT].includes(mode)) return
            this.agentMode = mode
            this.loadingVariant = mode
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
            let message = useProductExpertSupportAgentStore().messages.find(m => m._uuid === uuid)
            if (!message) {
                message = useProductExpertInsightsAgentStore().messages.find(m => m._uuid === uuid)
            }
            if (message) {
                message._streamed = true
            }
        },
        updateAnswerStreamedState ({ messageUuid, answerUuid }) {
            let message = useProductExpertSupportAgentStore().messages.find(m => m._uuid === messageUuid)
            if (!message) {
                message = useProductExpertInsightsAgentStore().messages.find(m => m._uuid === messageUuid)
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

                    this.addAiMessage(message, false)
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
    },
    persist: {
        pick: ['shouldWakeUpAssistant'],
        storage: localStorage
    }
})
