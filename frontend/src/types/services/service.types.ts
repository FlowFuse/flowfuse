import type { App } from 'vue'
import type { Router } from 'vue-router'

import type { BootstrapServiceI, MqttServiceI, PostMessageServiceI } from '@/types'

/**
 * Minimal lifecycle contract for app services.
 */
export interface AppService {
    init?: () => (void | Promise<void>)
    destroy?: () => (void | Promise<void>)
}

export type ServiceInstances = {
    bootstrap: BootstrapServiceI | null
    postMessage: PostMessageServiceI | null
    mqtt: MqttServiceI | null
}

export interface CreateServiceOptions {
    app: App
    router: Router
    services?: ServiceInstances
}
