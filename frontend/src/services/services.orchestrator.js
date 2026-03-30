import { createBootstrapService } from './bootstrap.service.js'
import { createMqttService, destroyMqttService } from './mqtt.service.js'
import { createMessagingService } from './post-messaging.service.js'

/**
 * Service Factory - Manages service creation with dependency injection
 */
class ServicesOrchestrator {
    /** @typedef {{
     bootstrap: import('./bootstrap.service.js').BootstrapService|null,
     messaging: import('./post-messaging.service.js').PostMessagingService|null,
     mqtt: import('./mqtt.service.js').MqttService|null
     }} ServiceInstances */
    $serviceInstances = {
        bootstrap: null,
        messaging: null,
        mqtt: null
    }

    /**
     * @type {import('vue').App} - Vue app instance
     */
    $app = null

    /**
     * @type {import('vue-router').Router} - Vue router instance
     */
    $router = null

    /**
     * @type {import('vuex').Store} - Vuex store instance
     */
    $store = null

    $cleanupRegistered = false

    /**
     *
     * @param {import('vue').App} app - Vue app instance
     * @param {import('vuex').Store} store - Vuex store instance
     * @param {import('vue-router').Router} router - Vue router instance
     * @return {Promise<ServicesOrchestrator>}
     */
    async init (app, store, router) {
        await this.dispose()

        this.$app = app
        this.$router = router
        this.$store = store

        await this.registerCleanup()
        await this.bootServices()

        return this
    }

    /**
     * Create all services
     * @returns {Promise<ServiceInstances>} Promise that resolves when all services are booted
     */
    async bootServices () {
        const app = this.$app
        const store = this.$store
        const router = this.$router

        this.$serviceInstances.bootstrap = createBootstrapService({
            app,
            store,
            router,
            services: this.$serviceInstances
        })

        this.$serviceInstances.messaging = createMessagingService({
            app,
            store,
            router,
            services: this.$serviceInstances
        })

        this.$serviceInstances.mqtt = createMqttService({
            app,
            store,
            router,
            services: this.$serviceInstances
        })

        this.$serviceInstances.bootstrap.init()

        app.provide('$services', this.$serviceInstances)

        return this.$serviceInstances
    }

    async dispose () {
        const customDisposalRules = {
            mqtt: async () => {
                await Promise.allSettled([
                    this.$serviceInstances.mqtt?.destroy?.(),
                    destroyMqttService()
                ])
            }
        }

        for (const service of Object.keys(this.$serviceInstances)) {
            if (Object.prototype.hasOwnProperty.call(customDisposalRules, service)) await customDisposalRules[service]()
            this.$serviceInstances[service] = null
        }

        this.$app = null
        this.$router = null
        this.$store = null

        this.$cleanupRegistered = false
    }

    async registerCleanup () {
        if (!this.$cleanupRegistered) {
            this.$cleanupRegistered = true

            const originalUnmount = this.$app.unmount.bind(this.$app)
            this.$app.unmount = async (...args) => {
                await this.dispose()
                return originalUnmount(...args)
            }

            if (import.meta.hot) {
                import.meta.hot.dispose(async () => {
                    await this.dispose()
                })
            }
        }
    }
}

// Create a singleton factory instance
let orchestratorInstance = null

/**
 * Get or create the ServicesOrchestrator singleton instance
 * @returns {ServicesOrchestrator}
 */
export function getServicesOrchestrator () {
    if (!orchestratorInstance) {
        orchestratorInstance = new ServicesOrchestrator()
    }
    return orchestratorInstance
}

/**
 * @returns {ServicesOrchestrator}
 */
export default getServicesOrchestrator
