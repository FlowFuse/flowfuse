import { createBootstrapService } from './bootstrap.service.js'
import { createMqttService } from './mqtt.service.js'
import { createMessagingService } from './post-message.service.js'

const SERVICE_REGISTRY = [
    { key: 'bootstrap', create: createBootstrapService, requiredLifecycle: ['init', 'destroy'] },
    { key: 'postMessage', create: createMessagingService, requiredLifecycle: ['destroy'] },
    { key: 'mqtt', create: createMqttService, requiredLifecycle: ['destroy'] }
]

/**
 * Service Factory - Manages service creation with dependency injection
 */
class ServicesOrchestrator {
    /** @typedef {{
     bootstrap: import('./bootstrap.service.js').BootstrapService|null,
     postMessage: import('./post-message.service.js').PostMessageService|null,
     mqtt: import('./mqtt.service.js').MqttService|null
     }} ServiceInstances */
    $serviceInstances = Object.fromEntries(SERVICE_REGISTRY.map(service => [service.key, null]))

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

        for (const serviceDefinition of SERVICE_REGISTRY) {
            const instance = serviceDefinition.create({
                app,
                store,
                router,
                services: this.$serviceInstances
            })

            this.assertServiceContract(serviceDefinition, instance)
            this.$serviceInstances[serviceDefinition.key] = instance
        }

        await this.$serviceInstances.bootstrap.init()

        app.provide('$services', this.$serviceInstances)

        return this.$serviceInstances
    }

    async dispose () {
        for (const service of Object.keys(this.$serviceInstances)) {
            try {
                await this.$serviceInstances[service]?.destroy?.()
            } catch (_) {
                // teardown should be resilient and continue for remaining services
            }
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

    /**
     * Runtime guard used until service contracts are enforced with TypeScript interfaces.
     * @param {{key: string, requiredLifecycle: string[]}} definition
     * @param {import('./service.contract.js').AppService | null | undefined} instance
     */
    assertServiceContract (definition, instance) {
        if (!instance || typeof instance !== 'object') {
            throw new Error(`Service "${definition.key}" factory returned an invalid value`)
        }

        if (typeof instance.name !== 'string' || !instance.name.trim()) {
            throw new Error(`Service "${definition.key}" must expose a non-empty "name"`)
        }

        for (const lifecycleMethod of definition.requiredLifecycle) {
            if (typeof instance[lifecycleMethod] !== 'function') {
                throw new Error(`Service "${definition.key}" is missing lifecycle method "${lifecycleMethod}"`)
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
