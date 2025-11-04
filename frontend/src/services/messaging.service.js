const DATA_SOURCE_FLOWFUSE_WEBSITE = 'flowfuse-website'

const dataSourceScopes = {
    [DATA_SOURCE_FLOWFUSE_WEBSITE]: {
        FLOWFUSE_EXPERT: 'flowfuse-expert'
    }
}

const ACTIONS_FLOWFUSE_EXPERT = {
    SET_CONTEXT: 'set-context'
}

const sourceActions = {
    [DATA_SOURCE_FLOWFUSE_WEBSITE]: ACTIONS_FLOWFUSE_EXPERT
}

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
            if (event.data.source === DATA_SOURCE_FLOWFUSE_WEBSITE && event.data.scope === dataSourceScopes[DATA_SOURCE_FLOWFUSE_WEBSITE].FLOWFUSE_EXPERT) {
                await this.handleFlowFuseExpertMessage(event)
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

    sendReadyMessage () {
        const message = {
            type: 'onLoad',
            status: 'ready',
            timestamp: Date.now()
        }

        if (window.parent !== window) {
            window.parent.postMessage(message, '*')
        }

        if (window.opener) {
            window.opener.postMessage(message, '*')
        }
    }

    setExpertContext (payload) {
        return this.$store.dispatch('product/expert/setContext', payload)
            .then(() => {
                const message = {
                    type: 'flowfuse-expert-response',
                    action: 'confirm',
                    timestamp: Date.now()
                }

                window.parent.postMessage(message, origin)
            })
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
}) {
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

export default createMessagingService
