import { defineStore } from 'pinia'
import { v4 as uuidv4 } from 'uuid'
import { markRaw } from 'vue'

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
import {
    ERRORS_WITHOUT_CODES,
    FATAL_ERROR_CODES,
    PROTOCOL_BUG_ERROR_CODES,
    THROTTLED_ERROR_CODES,
    TRANSIENT_ERROR_CODES
} from '@/services/mqtt.service'

import getServicesOrchestrator from '@/services/service.orchestrator'

export const useProductExpertStore = defineStore('product-expert', {
    state: () => ({
        agentMode: SUPPORT_AGENT, // support-agent or insights-agent
        loadingVariant: SUPPORT_AGENT,
        shouldWakeUpAssistant: false,
        inFlightUpdates: []
    }),
    getters: {
        _agentStore () {
            return this.agentMode === SUPPORT_AGENT
                ? useProductExpertSupportAgentStore()
                : useProductExpertInsightsAgentStore()
        },
        /**
         * @return {import('vue').UnwrapRef<Map<unknown, unknown> | Map<any, any>> | import('vue').UnwrapRef<Map<unknown, unknown> | Map<any, any>>}
         * @private
         */
        _inFlightRequests () {
            return this.agentMode === SUPPORT_AGENT
                ? useProductExpertSupportAgentStore().inFlightRequests
                : useProductExpertInsightsAgentStore().inFlightRequests
        },
        abortController () { return this._agentStore.abortController },
        messages () { return this._agentStore.messages },
        hasMessages () { return this._agentStore.messages.length > 0 },
        isSessionExpired () { return this._agentStore.sessionExpiredShown },
        isWaitingForResponse () { return !!this._agentStore.abortController || this._inFlightRequests.size > 0 },
        isSupportAgent: (state) => state.agentMode === SUPPORT_AGENT,
        isInsightsAgent: (state) => state.agentMode === INSIGHTS_AGENT,
        hasSelectedCapabilities () {
            return useProductExpertInsightsAgentStore().selectedCapabilities?.length > 0
        },
        canImportFlows () {
            const assistantStore = useProductAssistantStore()
            return !!assistantStore.isImmersiveInstance && !!assistantStore.supportedActions['custom:import-flow']
        },
        canManagePalette () {
            const assistantStore = useProductAssistantStore()
            return !!assistantStore.isImmersiveInstance && !!assistantStore.supportedActions['core:manage-palette']
        },
        mqttConnectionKey () { return this._agentStore.mqttConnectionKey },
        sessionId () { return this._agentStore.sessionId },
        shouldUseMqtt () {
            const accountSettingsStore = useAccountSettingsStore()
            return accountSettingsStore.featuresCheck?.isExpertCommsBetaEnabled && this.isSupportAgent
        }
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
        openAssistantDrawer (options = {}) {
            const featuresCheck = useAccountSettingsStore().featuresCheck
            if (featuresCheck.isExpertAssistantFeatureEnabled === false) return

            // In immersive editor context, navigate to the Expert tab instead of opening RightDrawer
            const contextStore = useContextStore()
            if (contextStore.isImmersiveEditor) {
                const drawersStore = useUxDrawersStore()
                if (!drawersStore.editorImmersiveDrawer.state) {
                    drawersStore.openEditorImmersiveDrawer()
                }
                const expertRouteName = contextStore.editorEntityType === 'device'
                    ? 'device-editor-expert'
                    : 'instance-editor-expert'
                // Lazy require: top-level import would form a cycle via Platform → RightDrawer → product-expert.js
                const router = require('@/routes.js').default
                return router.push({ name: expertRouteName, params: contextStore.route.params })
            }

            if (this.agentMode === INSIGHTS_AGENT) {
                useProductExpertInsightsAgentStore().getCapabilities()
            }
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
                    if (!this.shouldUseMqtt) {
                        console.error('Expert API error:', error)
                        this.addPredefinedAiMessage('Sorry, I encountered an error. Please try again.',
                            { isError: true })
                    }
                }
            } finally {
                agentStore.abortController = null
            }
        },
        sendQuery ({ query }) {
            if (this.shouldUseMqtt) {
                return this.sendMqttQuery({ query })
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
        async sendMqttQuery ({ query } = {}) {
            const servicesOrchestrator = getServicesOrchestrator()
            const mqttService = servicesOrchestrator.$serviceInstances.mqtt
            const mqttTopicHelper = useMqttExpertTopicHelper()

            const transactionId = uuidv4()
            const mqttConnectionKey = this.mqttConnectionKey

            if (!mqttService.hasClient(mqttConnectionKey)) await this.establishMqttComms()

            // add the query as an inFlight request
            this._inFlightRequests.set(transactionId, { query, transactionId })

            const { entityId, entityType } = mqttTopicHelper.getEntityTopicPaths()

            const topic = mqttTopicHelper.buildTopic({
                entityType,
                entityId,
                agentChannel: 'support',
                topicType: 'chat',
                topicAction: 'request'
            })

            try {
                await mqttService.publishMessage(mqttConnectionKey, {
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
                        sessionId: this.sessionId,
                        origin: window.origin || window.location.origin
                    }
                })

                return Promise.resolve()
            } catch (e) {
                this._onMqttError(e)
                return Promise.reject(e)
            }
        },
        async establishMqttComms () {
            const servicesOrchestrator = getServicesOrchestrator()
            const mqttService = servicesOrchestrator.$serviceInstances.mqtt

            await mqttService.createClient(this.mqttConnectionKey, {
                getCredentials: () => userApi.initiateExpertChat({ sessionId: this.sessionId }),
                onMessage: this._onMqttMessage,
                onClose: this._onMqttClose,
                onConnect: this._onMqttConnect,
                onOffline: this._onMqttOffline,
                onError: this._onMqttError,
                onDisconnect: this._onMqttDisconnect
            })
        },
        async handleInFlightRequest ({ topic, message, transactionId, sessionId, chatTransactionId } = {}) {
            const inFlightRequest = this._inFlightRequests.values().next().value

            // dismiss inFlight requests that don't match the existing sessionId or the inFlight message transactionId
            if (sessionId !== this.sessionId || inFlightRequest?.transactionId !== chatTransactionId) return

            const servicesOrchestrator = getServicesOrchestrator()
            const assistantStore = useProductAssistantStore()
            const topicHelper = useMqttExpertTopicHelper()

            const mqttService = servicesOrchestrator.$serviceInstances.mqtt
            const parsedTopic = topicHelper.parseTopic(topic)
            const payload = JSON.parse(message.toString())

            this._addInFlightUpdate(payload.status || payload.toolname || 'Processing request...')

            const responseTopic = topicHelper.buildTopic({
                entityType: parsedTopic.entityType,
                entityId: parsedTopic.entityId,
                agentChannel: 'support',
                topicType: 'inflight',
                topicAction: 'response',
                inflightType: parsedTopic.inflightType,
                sessionId: sessionId || this.sessionId
            })

            switch (true) {
            case parsedTopic.inflightType === 'expert:status-message':
                await mqttService.publishMessage(this.mqttConnectionKey, {
                    qos: 2,
                    topic: responseTopic,
                    payload: JSON.stringify({
                        ack: true
                    }),
                    correlationData: transactionId,
                    userProperties: {
                        sessionId,
                        transactionId: chatTransactionId,
                        origin: window.origin || window.location.origin
                    }
                })
                break
            case parsedTopic.inflightType.startsWith('automation:'):
                try {
                    const result = await assistantStore.invokeActionAwaitResponse({
                        action: `automation/${parsedTopic.inflightType.replace('automation:', '')}`,
                        params: payload.params || {},
                        sessionId,
                        chatTransactionId,
                        transactionId
                    })

                    await mqttService.publishMessage(this.mqttConnectionKey, {
                        qos: 2,
                        topic: responseTopic,
                        payload: JSON.stringify(result),
                        correlationData: transactionId,
                        userProperties: {
                            sessionId,
                            transactionId: chatTransactionId,
                            origin: window.origin || window.location.origin
                        }
                    })
                } catch (e) {
                    this._onMqttError(e)
                }
                break
            default:
                // do nothing
            }
        },
        async handleMessageResponse (response) {
            // ignore aborted messages through mqtt
            if (Object.prototype.hasOwnProperty.call(response, 'aborted') && response.aborted === true) return

            if (response.answer && Array.isArray(response.answer)) {
                this.addAiMessage(response)
                this._clearInFlightUpdates()
            }
        },
        async startOver () {
            const agentStore = this._agentStore
            agentStore.sessionId = uuidv4()
            agentStore.messages = []

            if (this.shouldUseMqtt) {
                const servicesOrchestrator = getServicesOrchestrator()
                const mqttService = servicesOrchestrator.$serviceInstances.mqtt

                await mqttService.destroyClient(this.mqttConnectionKey)
            }

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
        addPredefinedAiMessage (message, { isError = false, code = null } = {}) {
            const lastThree = this._agentStore.messages.slice(-3)
            const recentErrorCodes = lastThree.map(msg => msg.errorCode).filter(Boolean)

            // When using MQTT, ignore duplicate error messages (e.g., during connection loss or reconnection attempts)
            // to prevent repetition in the message history
            if (!this.shouldUseMqtt || !recentErrorCodes.includes(code)) {
                this._agentStore.messages.push({
                    _type: 'ai',
                    generated: true,
                    error: isError,
                    errorCode: code,
                    answer: [{ content: message, _streamed: false, _uuid: uuidv4() }],
                    _timestamp: Date.now(),
                    _streamed: false,
                    _uuid: uuidv4()
                })
            }
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
            const isAiMessage = (message) => message.answer && Array.isArray(message.answer)
            const isUserMessage = (message) => Object.prototype.hasOwnProperty.call(message, 'query') && message.query

            messages.forEach((message) => {
                switch (true) {
                case isAiMessage(message):
                    this.addAiMessage(message, false)
                    break
                case isUserMessage(message):
                    this.addUserMessage(message.query)
                    break
                default:
                    // do nothing, unrecognized message
                }
            })
        },
        async _onMqttMessage  (topic, message, packet) {
            // ignore any messages if inFlightRequests has been cleared (it means that the chat was stopped mid-flight)
            if (this._inFlightRequests.size === 0) return

            const topicHelper = useMqttExpertTopicHelper()
            const parsedTopic = topicHelper.parseTopic(topic)
            const transactionId = packet.properties?.correlationData ? new TextDecoder().decode(packet.properties.correlationData) : null
            const sessionId = packet.properties?.userProperties?.sessionId // chat session
            const chatTransactionId = packet.properties?.userProperties?.transactionId // passed through for integrity

            switch (true) {
            case parsedTopic.isReply:
                // remove inFlight request because it is now resolved
                this._inFlightRequests.delete(transactionId)
                // handle the response
                await this.handleMessageResponse(JSON.parse(message.toString()))
                break
            case parsedTopic.isInflightRequest:
                await this.handleInFlightRequest({
                    topic,
                    message,
                    packet,
                    transactionId,
                    sessionId,
                    chatTransactionId
                })
                break
            default:
                // do nothing
            }
        },
        _onMqttClose  () {
            const rand = Math.floor(Math.random() * 6)
            const message = [
                'Looks like we got disconnected. Send another message to pick up where we left off, or start a fresh session.',
                'The connection took an unscheduled vacation. You can keep going by sending a message, or start a new session.',
                'I blinked and lost you there. Drop me a message to continue, or start over — no hard feelings.',
                'Well, that was rude of the connection. Send a message to resume, or kick off a new session.',
                "We got cut off mid-conversation. Send a message to jump back in, or start fresh if you'd prefer.",
                'The line went dead on us. You can pick this back up with a new message, or start a clean session.'
            ][rand]

            this.addPredefinedAiMessage(
                message,
                { isError: true, code: 'con_close' }
            )
        },
        async _onMqttConnect (connack) {
            if (connack.reasonCode && connack.reasonCode >= 0x80) {
                // mqtt.js usually emits 'error' instead, but guard anyway
                return this.handleMqttError(connack.reasonCode, connack.properties?.reasonString)
            }

            const servicesOrchestrator = getServicesOrchestrator()
            const mqttService = servicesOrchestrator.$serviceInstances.mqtt

            // if the last message was an error, it means we just reconnected after a failure
            // letting users know that everything is all right
            const lastMessage = this.messages.length > 0 ? this.messages[this.messages.length - 1] : null
            if (lastMessage && lastMessage.error) {
                const rand = Math.floor(Math.random() * 9)
                this.addPredefinedAiMessage([
                    "I'm back! Sorry about that — where were we?",
                    'Reconnected. Miss me? Let\'s pick up where we left off.',
                    'And we\'re back in business. Carry on as if nothing happened.',
                    'That was a close one. I have returned.',
                    'Plot twist — I survived. What did I miss?',
                    'Back online. Pretend that little intermission never happened.',
                    'The prodigal connection has returned. Did you redecorate while I was gone?',
                    'I clawed my way back. What were we talking about?',
                    'Dropped out for a sec but I never stopped thinking about your question.'
                ][rand])
            }

            const mqttTopicHelper = useMqttExpertTopicHelper()

            try {
                await Promise.all([
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
                    ),
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
                ])
            } catch (error) {
                this._onMqttError(error instanceof Error ? error : new Error(String(error)))
            }
        },
        _onMqttDisconnect (packet) {
            this.handleMqttError(packet.reasonCode, packet.properties?.reasonString)
        },
        _onMqttOffline () {
            console.warn('#################### mqtt offline')
            // TODO add error message, handle reconnect, notify user
        },
        _onMqttError (err) {
            this.handleMqttError(err.code, err.message)
        },
        _addInFlightUpdate (status) {
            this.inFlightUpdates.push(status)
        },
        _clearInFlightUpdates () {
            this.inFlightUpdates = []
        },
        async handleMqttError (code, reason) {
            // stopping inFlight chat requests to ignore any in flight messages if any and also clear the loader
            this.stopInflightChat()
            this._clearInFlightUpdates()

            const servicesOrchestrator = getServicesOrchestrator()
            const mqttService = servicesOrchestrator.$serviceInstances.mqtt

            const rand = Math.floor(Math.random() * 3)
            let payload = {
                code: 'n/a',
                message: [
                    "Something went sideways but I'm not sure what. Let me reconnect and pretend that didn't happen...",
                    "Lost connection for mysterious reasons. Even I don't know what happened. Reconnecting...",
                    'Well, that was unexpected. Let me dust myself off and reconnect...'
                ][rand]
            }

            // The error code may be missing because an ErrorWithReasonCode was not thrown, so we must rely on the error message instead
            if (code === null) {
                const reasonContainsSlug = (slug) => {
                    if (typeof slug === 'string') {
                        return reason.toLowerCase().includes(slug)
                    } return false
                }

                switch (true) {
                case reasonContainsSlug(ERRORS_WITHOUT_CODES.connack.slug):
                    payload = {
                        code: 'connack',
                        message: [
                            "Knocked on the broker's door but it's giving me the silent treatment. Reconnecting...",
                            'Waited for a handshake that never came — awkward. Trying again...',
                            'The broker left me on read. Let me try again...'
                        ][rand]
                    }
                    break
                case reasonContainsSlug(ERRORS_WITHOUT_CODES.keepalive.slug):
                    payload = {
                        code: 'keepalive',
                        message: [
                            'Hm, looks like I lost my train of thought. Give me a sec to reconnect...',
                            'I zoned out for a moment there. Reconnecting...',
                            'The line went quiet — either I got ghosted or the wifi did. Reconnecting...'
                        ][rand]
                    }
                    break
                case reasonContainsSlug(ERRORS_WITHOUT_CODES.disconnecting.slug):
                    payload = {
                        code: 'disconnecting',
                        message: [
                            'Caught me mid-goodbye — tried to say something while walking out the door. One moment...',
                            "I was already packing up when someone yelled 'one more thing!' Hang tight...",
                            'Oops, talked over my own exit. Let me come back properly...'
                        ][rand]
                    }
                    break
                case reasonContainsSlug(ERRORS_WITHOUT_CODES.connection.slug):
                    payload = {
                        code: 'connection',
                        message: [
                            'My message got lost in transit — like a carrier pigeon in a storm. Reconnecting...',
                            'The connection pulled a disappearing act. Working on getting it back...',
                            'Well, that dropped faster than my phone signal in an elevator. Reconnecting...'
                        ][rand]
                    }
                    break
                case reasonContainsSlug(ERRORS_WITHOUT_CODES.websocket.slug):
                    payload = {
                        code: 'websocket',
                        message: [
                            'The websocket gremlins struck again. Reconnecting...',
                            'Something tripped over the wires on my end. Give me a moment...',
                            'My connection threw a tantrum. Calming it down and reconnecting...'
                        ][rand]
                    }
                    break
                case reasonContainsSlug(ERRORS_WITHOUT_CODES.cantConnect.slug):
                    payload = {
                        code: 'cantConnect',
                        message: [
                            "Knocked on the door but nobody's home. Trying again...",
                            "Can't seem to reach my brain right now — it might be napping. Retrying...",
                            "I'm getting the 'number you have dialed is unavailable' treatment. Retrying..."
                        ][rand]
                    }
                    break
                case reasonContainsSlug(ERRORS_WITHOUT_CODES.unrecognizedPacket.slug):
                    payload = {
                        code: 'unrecognizedPacket',
                        message: [
                            "Got a message I can't read — it's like receiving a fax in 2026. Reconnecting...",
                            "Someone sent me a message in a language I don't speak. Reconnecting...",
                            'That response made zero sense to me. Let me start fresh...'
                        ][rand]
                    }
                    break
                case reasonContainsSlug(ERRORS_WITHOUT_CODES.exceedingPacket.slug):
                    payload = {
                        code: 'exceedingPacket',
                        message: [
                            'That message was way too chonky to handle. Reconnecting...',
                            'Someone tried to shove a whole novel through the mail slot. Reconnecting...',
                            'Received a message so big it broke the mailbox. Let me reconnect...'
                        ][rand]
                    }
                    break
                case reasonContainsSlug(ERRORS_WITHOUT_CODES.unregisteredTopic.slug):
                    payload = {
                        code: 'unregisteredTopic',
                        message: [
                            "Got a message for someone I don't know. Wrong address? Reconnecting...",
                            "That message had a return address I've never seen. Let me reconnect...",
                            "Someone's talking about something I never signed up for. Reconnecting..."
                        ][rand]
                    }
                    break
                case reasonContainsSlug(ERRORS_WITHOUT_CODES.topicAliasRange.slug):
                    payload = {
                        code: 'topicAliasRange',
                        message: [
                            "Got an out-of-bounds memo — someone didn't read the fine print. Reconnecting...",
                            'That reference number is way off the charts. Reconnecting...',
                            "I was handed a ticket number that doesn't exist. Let me reconnect..."
                        ][rand]
                    }
                    break
                case reasonContainsSlug(ERRORS_WITHOUT_CODES.topicAliasMaximum.slug):
                    payload = {
                        code: 'topicAliasMaximum',
                        message: [
                            "The broker and I couldn't agree on the rules. Let me try negotiating again...",
                            'We had a bit of a contract dispute on connection terms. Reconnecting...',
                            'The handshake got awkward — bad terms. Let me try again...'
                        ][rand]
                    }
                    break
                default: // use default payload
                }

                return this.addPredefinedAiMessage(payload.message, { isError: true, code: payload.code })
            }

            // Permanent config errors
            if (FATAL_ERROR_CODES.has(code) || PROTOCOL_BUG_ERROR_CODES.has(code)) {
                await mqttService.endConnection()
                await mqttService.destroyClient(this.mqttConnectionKey)
                payload = {
                    code: 'fatal',
                    message: [
                        "Something went seriously wrong and I can't fix it by trying again. Please start over.",
                        "I've hit a wall I can't climb over. Starting over should get things moving again.",
                        "That's a hard stop — this one's beyond my self-repair skills. Try starting over."
                    ][rand]
                }
                return
            }

            switch (code) {
            case 0x01: // Unacceptable protocol version
                payload = {
                    code: 'unacceptable_protocol',
                    message: [
                        "Looks like I'm speaking the wrong dialect. Let me sort that out...",
                        "The server and I aren't on the same page — literally different protocols. Working on it...",
                        'I showed up to a French restaurant and ordered in Klingon. Give me a moment...'
                    ][rand]
                }
                break
            case 0x02: // Identifier rejected
                payload = {
                    code: 'identifier_rejected',
                    message: [
                        "The bouncer didn't like my ID. Let me get a new one...",
                        "Showed up and they said 'who are you?' — rude. Trying again...",
                        'My name tag got rejected at the door. Reconnecting with better credentials...'
                    ][rand]
                }
                break
            case 0x03: // Server unavailable
                payload = {
                    code: 'server_unavailable',
                    message: [
                        'The server is taking a coffee break. I\'ll try again shortly...',
                        "Nobody's home on the other end. I'll keep knocking...",
                        "Server's out of office. Hopefully it didn't set an auto-reply. Retrying..."
                    ][rand]
                }
                break
            case 0x04: // Bad username or password
                payload = {
                    code: 'bad_credentials',
                    message: [
                        "Wrong password — and no, I can't just try 'password123'. Fixing it...",
                        "My credentials got rejected. I knew I should've written them down. Working on it...",
                        'Access denied — turns out I forgot my own password. Give me a sec...'
                    ][rand]
                }
                break
            case 0x05: // Not authorized
                payload = {
                    code: 'not_authorized',
                    message: [
                        "I don't have clearance for this. Let me talk to someone about my permissions...",
                        'Tried to walk into the VIP section without a wristband. Sorting it out...',
                        'The velvet rope stopped me. Checking my authorization...'
                    ][rand]
                }
                break
            case 0x85: // Client Identifier not valid → regenerate, then 'close' reconnects
                payload = {
                    code: 'invalid_client_id',
                    message: [
                        'My ID card expired mid-conversation. Getting a fresh one...',
                        "Apparently I don't exist anymore. Time for a new identity...",
                        "Identity crisis — the server doesn't recognize me. Reinventing myself..."
                    ][rand]
                }
                break
            case 0x87: // Not authorized → try refreshing the token once
                payload = {
                    code: 'not_authorized_token',
                    message: [
                        'My backstage pass expired. Refreshing it now...',
                        'My hall pass ran out. Grabbing a new one from the front desk...',
                        'Authorization expired — I aged out. Refreshing my token...'
                    ][rand]
                }
                break
            case 0x8D: // Keep Alive timeout → just reconnect
                payload = {
                    code: 'keepalive_timeout',
                    message: [
                        "The server thought I fell asleep. I'm still here! Reconnecting...",
                        'Got marked absent for not raising my hand fast enough. Reconnecting...',
                        "Missed my check-in — the server assumed the worst. I'm back..."
                    ][rand]
                }
                break
            case 0x8E: // Session taken over by another tab/device
                payload = {
                    code: 'session_taken_over',
                    message: [
                        'Another version of me just stole my seat. I\'ll stand down gracefully.',
                        "Looks like I've been replaced by myself in another tab. Can't compete with that.",
                        'My evil twin from another tab took over. I\'ll bow out here.'
                    ][rand]
                }
                break
            case 0x9C: // Use another server (temporary)
            case 0x9D: // Server moved (persistent)
                payload = {
                    code: 'server_moved',
                    message: [
                        "The server said 'not here, try next door.' Following directions...",
                        'Got redirected — the server moved without leaving a forwarding address. Tracking it down...',
                        "The server pulled a 'new phone, who dis.' Finding its new location..."
                    ][rand]
                }
                break
            default: // use default payload
            }

            if (THROTTLED_ERROR_CODES.has(code)) {
                // // todo add backoff procedure
                payload = {
                    code: 'throttled',
                    message: [
                        "I'm being told to slow down — apparently even AI can be too eager. Taking a breather...",
                        'Hit the rate limit. Guess I was talking too fast. Cooling off for a bit...',
                        "The server said 'whoa, easy there.' Backing off and trying again shortly..."
                    ][rand]
                }
            }

            if (TRANSIENT_ERROR_CODES.has(code)) {
                payload = {
                    code: 'transient',
                    message: [
                        'Just a hiccup — nothing a quick reconnect won\'t fix...',
                        'Blinked and lost the connection. Should be back in a moment...',
                        'Minor turbulence. Fasten your seatbelt, we\'ll be back on course shortly...'
                    ][rand]
                }
            }

            // 0x80 Unspecified, 0x83 Implementation specific, anything unknown:
            this.addPredefinedAiMessage(payload.message, { isError: true, code: payload.code })
        },
        stopInflightChat () {
            if (this.shouldUseMqtt) {
                const inFlightRequest = this._inFlightRequests.values().next().value
                const servicesOrchestrator = getServicesOrchestrator()
                const mqttService = servicesOrchestrator.$serviceInstances.mqtt

                const hasMqttClient = mqttService.hasClient(this.mqttConnectionKey) &&
                    (mqttService.getManagedClient(this.mqttConnectionKey)).status === 'connected'

                if (inFlightRequest && hasMqttClient) {
                    const mqttTopicHelper = useMqttExpertTopicHelper()

                    const { entityId, entityType } = mqttTopicHelper.getEntityTopicPaths()

                    const topic = mqttTopicHelper.buildTopic({
                        entityType,
                        entityId,
                        agentChannel: 'support',
                        topicType: 'chat',
                        topicAction: 'request'
                    })

                    // publishing an abort message to stop the agent
                    mqttService.publishMessage(this.mqttConnectionKey, {
                        topic,
                        qos: 2,
                        payload: {
                            abort: true,
                            context: {
                                ...useContextStore().expert,
                                agent: this.agentMode
                            }
                        },
                        correlationData: inFlightRequest.transactionId,
                        userProperties: {
                            sessionId: this.sessionId,
                            origin: window.origin || window.location.origin
                        }
                    })
                }
            }
            this._inFlightRequests.clear()
        }
    },
    persist: {
        pick: ['shouldWakeUpAssistant'],
        storage: localStorage
    }
})
