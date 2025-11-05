import { createBootstrapService } from './bootstrap.service.js'
import { createMessagingService } from './messaging.service.js'

/**
 * Service Factory - Manages service creation with dependency injection
 */
class ServiceFactory {
    /** @typedef {{
     bootstrap: import('./bootstrap.service.js').BootstrapService|null,
     messaging: import('./messaging.service.js').MessagingService|null
     }} ServiceInstances */
    $serviceInstances = {
        bootstrap: null,
        messaging: null
    }

    constructor () {
        this.$serviceInstances = {
            bootstrap: null,
            messaging: null
        }
    }

    /**
     * Create all services, create bootstrap service, and boot all services sequentially
     * @param {import('vue').App} app - Vue app instance
     * @param {import('vuex').Store} store - Vuex store instance
     * @param {import('vue-router').Router} router - Vue router instance
     * @returns {Promise<ServiceInstances>} Promise that resolves when all services are booted
     */
    async bootAllServices (app, store, router) {
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

        return this.$serviceInstances
    }

    /**
     * Get all service instances
     * @returns {ServiceInstances} Map of all service instances
     */
    getAllServices () {
        return this.$serviceInstances
    }
}

// Create singleton factory instance
let factoryInstance = null

/**
 * Get or create the ServiceFactory singleton instance
 * @returns {ServiceFactory}
 */
export function getServiceFactory () {
    if (!factoryInstance) {
        factoryInstance = new ServiceFactory()
    }
    return factoryInstance
}

/**
 * @returns {ServiceFactory}
 */
export default getServiceFactory
