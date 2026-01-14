const DATA_SOURCE_FLOWFUSE_WEBSITE = 'flowfuse-website'
const DATA_SOURCE_ASSISTANT = 'nr-assistant'
const DATA_TARGET_ASSISTANT = 'flowfuse-expert'

const dataSourceScopes = {
    [DATA_SOURCE_FLOWFUSE_WEBSITE]: {
        FLOWFUSE_EXPERT: 'flowfuse-expert'
    },
    [DATA_SOURCE_ASSISTANT]: {
        FLOWFUSE_EXPERT: 'flowfuse-expert'
    }
}

const ACTIONS_FLOWFUSE_EXPERT = {
    SET_CONTEXT: 'set-context'
}

const sourceActions = {
    [DATA_SOURCE_FLOWFUSE_WEBSITE]: ACTIONS_FLOWFUSE_EXPERT
}

const allowedOrigins = ['https://flowfuse.com', 'https://app.flowfuse.com', 'https://forge.flowfuse.dev', 'http://localhost:8080', 'http://localhost:3000']

/**
 * Messaging Service - Handles postMessage communication
 * @class
 */
class MessagingService {
    /**
     * @type {import('vue').App} - Vue app instance
     */
    $app

    /**
     * @type {import('vuex').Store} - Vuex store instance
     */
    $store

    /**
     * @type {import('vue-router').Router} - Vue router instance
     */
    $router

    /**
     * @type {Object} - Map of all services for dependency injection
     */
    $services

    /**
     * @param {{app: import('vue').App, store: import('vuex').Store, router: import('vue-router').Router, services?: Object}} options - Constructor options
     */
    constructor ({
        app,
        store,
        router,
        services = {}
    }) {
        this.$app = app
        this.$store = store
        this.$router = router
        this.$services = services

        this.init()
    }

    /**
     * Initialize message handlers
     */
    init () {
        this.$services.bootstrap
            .whenReady()
            .then(() => {
                this.sendReadyMessage()
                this.setupMessageHandlers()
            })
            .catch(e => e)
    }

    setupMessageHandlers () {
        window.addEventListener('message', async (event) => {
            const isSourceWebsite = event.data.source === DATA_SOURCE_FLOWFUSE_WEBSITE
            const isWebsiteExpertScope = event.data.scope === dataSourceScopes[DATA_SOURCE_FLOWFUSE_WEBSITE].FLOWFUSE_EXPERT
            const shouldHandleWebsiteExpertMessages = isSourceWebsite && isWebsiteExpertScope

            const isAssistantTargettingFlowFuseExpert = event.data.target === DATA_TARGET_ASSISTANT
            const isSourceAssistant = event.data.source === DATA_SOURCE_ASSISTANT
            const isAssistantScope = isAssistantTargettingFlowFuseExpert && event.data.scope === dataSourceScopes[DATA_SOURCE_ASSISTANT].FLOWFUSE_EXPERT
            const shouldHandleAssistantMessages = isAssistantTargettingFlowFuseExpert && isSourceAssistant && isAssistantScope

            switch (true) {
            case shouldHandleWebsiteExpertMessages:
                return await this.handleFlowFuseExpertMessage(event)
            case shouldHandleAssistantMessages:
                return await this.handleAssistantMessage(event)
            default:
                // do nothing
            }
        })
    }

    async handleFlowFuseExpertMessage (event) {
        switch (event.data.action) {
        case sourceActions[DATA_SOURCE_FLOWFUSE_WEBSITE].SET_CONTEXT:
            await this.setExpertContext(event.data.payload)
            break
        default:
            console.warn('Unknown message received:', event.data.action)
        }
    }

    async handleAssistantMessage (event) {
        await this.$store.dispatch('product/assistant/handleMessage', event)
    }

    sendReadyMessage () {
        const message = {
            type: 'onLoad',
            status: 'ready',
            timestamp: Date.now()
        }

        this.sendMessage({ message })
    }

    setExpertContext (payload) {
        return this.$store.dispatch('product/expert/setContext', payload)
            .then(() => {
                const message = {
                    type: 'flowfuse-expert-response',
                    action: 'confirm',
                    timestamp: Date.now()
                }

                this.sendMessage({ message })
            })
    }

    sendMessage ({
        message,
        target,
        targetOrigin
    }) {
        // If we have a target, we aim at that target
        if (target) {
            target.postMessage(message, targetOrigin)
            return
        }

        // if we don't have a target, we aim at our opener or parent while checking for the whitelisted target origin
        if (targetOrigin && !allowedOrigins.includes(targetOrigin)) {
            console.warn('Invalid target origin:', targetOrigin)
            return
        }

        // Check parent window
        if (window.parent !== window) {
            const parentOrigin = this.getWindowOrigin(window.parent)

            if (parentOrigin && this.isWindowOriginAllowed(parentOrigin)) {
                window.parent.postMessage(message, parentOrigin)
            } else if (parentOrigin) {
                console.warn(`Parent window origin not whitelisted: ${parentOrigin}`)
            } else {
                console.warn('Cannot determine parent window origin - message not sent')
            }
        }

        // Check opener window
        if (window.opener) {
            const openerOrigin = this.getWindowOrigin(window.opener)

            if (openerOrigin && this.isWindowOriginAllowed(openerOrigin)) {
                window.opener.postMessage(message, openerOrigin)
            } else if (openerOrigin) {
                console.warn(`Opener window origin not whitelisted: ${openerOrigin}`)
            } else {
                console.warn('Cannot determine opener window origin - message not sent')
            }
        }
    }

    /**
     * Get the origin of a window
     * @param {Window} targetWindow - The window to get origin from
     * @returns {string|null} - The origin or null if inaccessible
     */
    getWindowOrigin (targetWindow) {
        try {
            return targetWindow.location.origin
        } catch (error) {
            // Cross-origin - try to get from document.referrer or other sources
            if (targetWindow === window.parent && document.referrer) {
                try {
                    return new URL(document.referrer).origin
                } catch (e) {
                    return null
                }
            }
            // For opener windows, document.referrer might also contain the opener's URL
            if (targetWindow === window.opener && document.referrer) {
                try {
                    return new URL(document.referrer).origin
                } catch (e) {
                    return null
                }
            }
            return null
        }
    }

    /**
     * Check if an origin is whitelisted
     * @param {string} origin - The origin to check
     * @returns {boolean} - True if the origin is allowed
     */
    isWindowOriginAllowed (origin) {
        return allowedOrigins.includes(origin)
    }
}

let MessagingServiceInstance = null

/**
 * Get or create the MessagingService singleton instance
 * @param {{app: import('vue').App, store: import('vuex').Store, router: import('vue-router').Router, services?: Object}} options - Constructor options
 * @returns {MessagingService}
 */
export function createMessagingService ({
    app,
    store,
    router,
    services = {}
} = {}) {
    if (!MessagingServiceInstance) {
        MessagingServiceInstance = new MessagingService({
            app,
            store,
            router,
            services
        })
    }

    return MessagingServiceInstance
}

/**
 * @returns {MessagingService}
 */
export default createMessagingService
