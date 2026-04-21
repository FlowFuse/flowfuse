import type { App } from 'vue'
import type { Router } from 'vue-router'

import { ServiceInstances } from '@/services/service.registry'
import { Maybe } from '@/types/common/types'

/**
 * Minimal lifecycle contract for app services.
 * Intended to become a TypeScript interface during migration.
 */
export interface AppService {
    init?: () => (void | Promise<void>)
    destroy?: () => (void | Promise<void>)
}

export interface CreateServiceOptions {
    app: App
    router: Router
    services?: ServiceInstances
}

/**
 * Lightweight base class for shared lifecycle surface.
 */
export abstract class BaseService {
    protected $name: string

    protected $app: Maybe<App> = null

    protected $router: Maybe<Router> = null

    protected $services: Maybe<ServiceInstances> = null

    protected constructor ({
        name,
        app,
        router,
        services
    }: { name: string } & CreateServiceOptions) {
        this.$name = name
        this.$app = app
        this.$router = router
        this.$services = services
    }

    init () {
        return undefined
    }

    async destroy () {
        return Promise.resolve()
    }
}
