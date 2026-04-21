import { nextTick } from 'vue'

import { BaseService } from './service.contract'

import { useAccountAuthStore } from '@/stores/account-auth.js'
import { useAccountSettingsStore } from '@/stores/account-settings.js'
import { useContextStore } from '@/stores/context.js'
import { Maybe } from '@/types/common/types'
import type { BootstrapServiceI } from '@/types/services/bootstrap.types'
import type { CreateServiceOptions } from '@/types/services/service.types'

/**
 * Bootstrap Service - Handles application lifecycle and readiness detection
 * @class
 */
class BootstrapService extends BaseService implements BootstrapServiceI {
    protected isReady: boolean = false
    protected readyPromise: Promise<void> | null = null
    protected readyResolve: ((value?: void | PromiseLike<void>) => void) | null = null

    constructor ({ app, router, services }: CreateServiceOptions) {
        super({
            name: 'bootstrap',
            app,
            router,
            services
        })

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

        return new Promise<void>((resolve) => {
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

    whenReady (): Promise<void> {
        if (this.isReady) {
            return Promise.resolve()
        }

        return this.readyPromise
    }
}

let BootstrapServiceInstance: Maybe<BootstrapService> = null

export function createBootstrapService ({ app, router, services } : CreateServiceOptions) {
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
