import { nextTick, watch } from 'vue'

import { useHydrationStore } from '../stores/hydration.js'

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
    async init () {
        return this.waitForAppMount()
            .then(() => this.waitForStoreHydration())
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

    async waitForStoreHydration () {
        // Wait for legacy Vuex hydration
        const vuexHydrated = new Promise((resolve) => {
            if (this.$store.state.initialized || this.$store.state._hydrated) {
                return resolve()
            }
            const unsubscribe = this.$store.subscribe((mutation) => {
                if (
                    mutation.type === 'initializeStore' ||
                    mutation.type === 'HYDRATE_COMPLETE' ||
                    this.$store.state._hydrated
                ) {
                    unsubscribe()
                    resolve()
                }
            })
        })

        // Wait for Pinia hydration (resolves immediately if PERSISTED_STORES is empty)
        const piniaHydrated = new Promise((resolve) => {
            const hydrationStore = useHydrationStore()
            if (hydrationStore.isHydrated) return resolve()
            const unwatch = watch(
                () => hydrationStore.isHydrated,
                (hydrated) => { if (hydrated) { unwatch(); resolve() } }
            )
        })

        return Promise.all([vuexHydrated, piniaHydrated])
    }

    async waitForRouterReady () {
        await this.$router.isReady()
    }

    async checkUser () {
        if (window.opener) {
            return this.$store.dispatch('account/checkIfAuthenticated').catch(e => e)
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
 * @param {{app: import('vue').App, store: import('vuex').Store, router: import('vue-router').Router, services?: Object}} options - Constructor options
 * @returns {BootstrapService}
 */
export function createBootstrapService ({
    app,
    store,
    router,
    services = {}
} = {}) {
    if (!BootstrapServiceInstance) {
        BootstrapServiceInstance = new BootstrapService({
            app,
            store,
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
