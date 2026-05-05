import type { App } from 'vue'
import type { Router } from 'vue-router'

import { Maybe } from '@/types/common/types'
import type { CreateServiceOptions, ServiceInstances } from '@/types/services/service.types'

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
