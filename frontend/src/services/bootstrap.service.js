import { nextTick } from 'vue'

import { BaseService } from './service.contract.js'

import { useAccountAuthStore } from '@/stores/account-auth.js'
import { useAccountSettingsStore } from '@/stores/account-settings.js'
import { useContextStore } from '@/stores/context.js'

/**
 * Bootstrap Service - Handles application lifecycle and readiness detection
 * @class
 */
class BootstrapService extends BaseService {
    /**
     * @type {import('vue').App} - Vue app instance
     */
    $app

    /**
     * @type {import('vue-router').Router} - Vue router instance
     */
    $router

    /**
     * @type {Object} - Map of all services for dependency injection
     */
    $services

    /**
     * @param {{app: import('vue').App, router: import('vue-router').Router, services?: Object}} options - Constructor options
     */
    constructor ({
        app,
        router,
        services = {}
    }) {
        super('bootstrap')

        this.$app = app
        this.$router = router
        this.$services = services

        this.isReady = false
        this.readyPromise = null
        this.readyResolve = null

        this.setupReadyPromise()
    }

    async destroy () {
        this.isReady = false
        this.readyPromise = null
        this.readyResolve = null
    }

    setupReadyPromise () {
        this.readyPromise = new Promise((resolve) => {
            this.readyResolve = resolve
        })
    }

    /**
     * Initialize the bootstrap service and wait for app readiness
     */
    async init () {
        return this.waitForAppMount()
            .then(() => {
                // Eagerly create account & context stores — restores persisted state from localStorage instantly
                useAccountAuthStore()
                useContextStore()
                useAccountSettingsStore()
            })
            .then(() => this.checkUser())
            .then(() => this.mountApp())
            .then(() => this.waitForRouterReady())
            .then(async () => this.markAsReady())
    }

    async waitForAppMount () {
        if (this.$app._container?.children?.length > 0) {
            return Promise.resolve()
        }

        return new Promise((resolve) => {
            nextTick(() => {
                resolve()
            })
        })
    }

    async waitForRouterReady () {
        await this.$router.isReady()
    }

    async checkUser () {
        if (window.opener) {
            return useAccountAuthStore().checkIfAuthenticated().catch(e => e)
        }

        return Promise.resolve()
    }

    async mountApp () {
        this.$app.mount('#app')
    }

    markAsReady () {
        this.isReady = true
        if (this.readyResolve) {
            this.readyResolve()
        }
    }

    /**
     * Wait for the application to be ready
     * @returns {Promise} Promise that resolves when app is ready
     */
    whenReady () {
        if (this.isReady) {
            return Promise.resolve()
        }

        return this.readyPromise
    }
}

let BootstrapServiceInstance = null

/**
 * @param {{app: import('vue').App, router: import('vue-router').Router, services?: Object}} options - Constructor options
 * @returns {BootstrapService}
 */
export function createBootstrapService ({
    app,
    router,
    services = {}
} = {}) {
    if (!BootstrapServiceInstance) {
        BootstrapServiceInstance = new BootstrapService({
            app,
            router,
            services
        })
    }

    return BootstrapServiceInstance
}

/**
 * @returns {BootstrapService}
 */
export default createBootstrapService
