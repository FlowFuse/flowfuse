/**
 * Bootstrap Service - Handles application lifecycle and readiness detection
 * @class
 */
class BootstrapService {
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
     * @param {import('vue').App} app - Vue app instance
     * @param {import('vuex').Store} store - Vuex store instance
     * @param {import('vue-router').Router} router - Vue router instance
     */
    constructor (app, store, router) {
        this.$app = app
        this.$store = store
        this.$router = router

        this.isReady = false
        this.readyPromise = null
        this.readyResolve = null
        this.setupReadyPromise()
    }

    setupReadyPromise () {
        this.readyPromise = new Promise((resolve) => {
            this.readyResolve = resolve
        })
    }

    /**
     * Initialize the bootstrap service and wait for app readiness
     */
    async bootstrap () {
        return this.waitForAppMount(this.$app)
            .then(() => this.waitForStoreHydration(this.$store))
            .then(() => this.waitForRouterReady(this.$router))
            .then(() => {
                this.markAsReady()
                this.setupMessageHandlers()
                this.sendReadyMessage()
            })
    }

    async waitForAppMount (app) {
        // Check if the app is already mounted
        if (app._instance?.isMounted) {
            return Promise.resolve()
        }

        // Wait for mounted hook
        return new Promise((resolve) => {
            app.config.globalProperties.$nextTick(() => {
                resolve()
            })
        })
    }

    async waitForStoreHydration (store) {
        // Check if the store has been initialized
        if (store.state.initialized || store.state._hydrated) {
            return Promise.resolve()
        }

        // Wait for store hydration
        return new Promise((resolve) => {
            const unsubscribe = store.subscribe((mutation) => {
                if (mutation.type === 'initializeStore' ||
                    mutation.type === 'HYDRATE_COMPLETE' ||
                    store.state._hydrated) {
                    unsubscribe()
                    resolve()
                }
            })
        })
    }

    async waitForRouterReady (router) {
        // Wait for router to be ready
        await router.isReady()
    }

    markAsReady () {
        this.isReady = true
        if (this.readyResolve) {
            this.readyResolve()
        }
    }

    setupMessageHandlers () {
        window.addEventListener('message', (event) => {
            if (event.data.type === 'flowfuse-expert') {
                this.handleFlowFuseExpertMessage(event)
            }
        })
    }

    handleFlowFuseExpertMessage (event) {
        console.log('Received flowfuse-expert message:', event.data)

        // Handle different expert message types
        switch (event.data.action) {
        case 'ping':
            this.sendPongMessage(event.origin)
            break
        case 'getStatus':
            this.sendStatusMessage(event.origin)
            break
        default:
            console.log('Unknown flowfuse-expert action:', event.data.action)
        }
    }

    sendReadyMessage () {
        const message = {
            type: 'onLoad',
            status: 'ready',
            timestamp: Date.now()
        }

        // Send to parent window if in iframe
        if (window.parent !== window) {
            window.parent.postMessage(message, '*')
        }

        // Send to opener if opened in popup
        if (window.opener) {
            window.opener.postMessage(message, '*')
        }

        console.log('App ready message sent:', message)
    }

    sendPongMessage (origin) {
        const message = {
            type: 'flowfuse-expert-response',
            action: 'pong',
            timestamp: Date.now()
        }

        window.parent.postMessage(message, origin)
    }

    sendStatusMessage (origin) {
        const message = {
            type: 'flowfuse-expert-response',
            action: 'status',
            data: {
                ready: this.isReady,
                timestamp: Date.now()
            }
        }

        window.parent.postMessage(message, origin)
    }

    /**
     * Wait for the application to be ready
     * @returns {Promise} Promise that resolves when app is ready
     */
    whenReady () {
        console.log('a')
        if (this.isReady) {
            console.log('b')
            return Promise.resolve()
        }
        console.log('c', this.readyPromise)
        return this.readyPromise
    }
}

let BootstrapServiceInstance = null

/**
 * @param {import('vue').App} app - Vue app instance
 * @param {import('vuex').Store} store - Vuex store instance
 * @param {import('vue-router').Router} router - Vue router instance
 */
export function createBootstrapService (app, store, router) {
    if (!BootstrapServiceInstance) {
        BootstrapServiceInstance = new BootstrapService(app, store, router)
    }
    return BootstrapServiceInstance
}

export default createBootstrapService
