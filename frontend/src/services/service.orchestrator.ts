import type { App } from 'vue'
import type { Router } from 'vue-router'

import SERVICE_REGISTRY, { ServiceInstances } from './service.registry'

/**
 * Service Factory - Manages service creation with dependency injection
 */
class ServiceOrchestrator {
    $serviceInstances: ServiceInstances = Object.fromEntries(SERVICE_REGISTRY.map(service => [service.key, null])) as ServiceInstances

    /**
     * @type {import('vue').App} - Vue app instance
     */
    $app: App = null

    $router: Router = null

    $cleanupRegistered = false

    async init (app: App, router:Router) {
        await this.dispose()

        this.$app = app
        this.$router = router

        await this.registerCleanup()
        await this.bootServices()

        return this
    }

    /**
     * Create all services
     * @returns {Promise<ServiceInstances>} Promise that resolves when all services are booted
     */
    async bootServices (): Promise<ServiceInstances> {
        const app = this.$app
        const router = this.$router

        for (const serviceDefinition of SERVICE_REGISTRY) {
            this.$serviceInstances[serviceDefinition.key] = serviceDefinition.create({
                app,
                router,
                services: this.$serviceInstances
            })
        }

        await this.$serviceInstances.bootstrap.init()

        app.provide('$services', this.$serviceInstances)

        return this.$serviceInstances
    }

    async dispose () {
        for (const service of Object.keys(this.$serviceInstances)) {
            try {
                await this.$serviceInstances[service]?.destroy?.()
            } catch {
                // teardown should be resilient and continue for remaining services
            }
            this.$serviceInstances[service] = null
        }

        this.$app = null
        this.$router = null

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
 * @returns {ServiceOrchestrator}
 */
export function getServicesOrchestrator (): ServiceOrchestrator {
    if (!orchestratorInstance) {
        orchestratorInstance = new ServiceOrchestrator()
    }
    return orchestratorInstance
}

/**
 * @returns {ServiceOrchestrator}
 */
export default getServicesOrchestrator
