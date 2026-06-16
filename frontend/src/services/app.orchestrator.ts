import type { App } from 'vue'
import type { Router } from 'vue-router'

import SERVICE_REGISTRY from './service.registry'

import SUBSCRIBER_REGISTRY from '@/subscribers/subscriber.registry'
import { createMqttTransport } from '@/transport/mqtt.transport'
import { Maybe } from '@/types/common/types'
import type { ServiceInstances } from '@/types/services/service.types'
import type { SubscriberInstances } from '@/types/subscribers/subscriber.types'

/**
 * App Orchestrator - boots services and subscribers with dependency injection.
 */
class AppOrchestrator {
    $serviceInstances: ServiceInstances = Object.fromEntries(SERVICE_REGISTRY.map(service => [service.key, null])) as ServiceInstances

    $subscriberInstances: SubscriberInstances = Object.fromEntries(SUBSCRIBER_REGISTRY.map(subscriber => [subscriber.key, null])) as SubscriberInstances

    /**
     * @type {import('vue').App} - Vue app instance
     */
    $app: Maybe<App> = null

    $router: Maybe<Router> = null

    $cleanupRegistered = false

    async init (app: App, router:Router) {
        await this.dispose()

        this.$app = app
        this.$router = router

        await this.registerCleanup()
        await this.bootServices()
        await this.bootSubscribers()

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
            ;(this.$serviceInstances as Record<string, unknown>)[serviceDefinition.key] = serviceDefinition.create({
                app,
                router,
                services: this.$serviceInstances
            })
        }

        await this.$serviceInstances.bootstrap.init()

        app.provide('$services', this.$serviceInstances)

        return this.$serviceInstances
    }

    /**
     * Create all subscribers, injecting a transport built over the mqtt service.
     * @returns {Promise<SubscriberInstances>} Promise that resolves when all subscribers are booted
     */
    async bootSubscribers (): Promise<SubscriberInstances> {
        const app = this.$app
        const router = this.$router
        const transport = createMqttTransport(this.$serviceInstances.mqtt)

        for (const subscriberDefinition of SUBSCRIBER_REGISTRY) {
            ;(this.$subscriberInstances as Record<string, unknown>)[subscriberDefinition.key] = subscriberDefinition.create({
                app,
                router,
                transport,
                subscribers: this.$subscriberInstances
            })
        }

        app.provide('$subscribers', this.$subscriberInstances)

        return this.$subscriberInstances
    }

    async dispose () {
        for (const subscriber of Object.keys(this.$subscriberInstances) as Array<keyof SubscriberInstances>) {
            try {
                await this.$subscriberInstances[subscriber]?.destroy?.()
            } catch {
                // teardown should be resilient and continue for remaining subscribers
            }
            this.$subscriberInstances[subscriber] = null
        }

        for (const service of Object.keys(this.$serviceInstances) as Array<keyof ServiceInstances>) {
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
let orchestratorInstance: Maybe<AppOrchestrator> = null

/**
 * Get or create the AppOrchestrator singleton instance
 * @returns {AppOrchestrator}
 */
export function getAppOrchestrator (): AppOrchestrator {
    if (!orchestratorInstance) {
        orchestratorInstance = new AppOrchestrator()
    }
    return orchestratorInstance
}

/**
 * @returns {AppOrchestrator}
 */
export default getAppOrchestrator
