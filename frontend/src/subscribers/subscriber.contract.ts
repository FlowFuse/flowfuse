import type { App } from 'vue'
import type { Router } from 'vue-router'

import { Maybe } from '@/types/common/types'
import type { CreateSubscriberOptions, SubscriberInstances } from '@/types/subscribers/subscriber.types'
import type { Transport } from '@/types/transport/transport.types'

/**
 * Lightweight base for subscribers — mirrors BaseService, but injected with a
 * Transport instead of the raw service bag.
 */
export abstract class BaseSubscriber<TTransport extends Transport = Transport> {
    protected $name: string

    protected $app: Maybe<App> = null

    protected $router: Maybe<Router> = null

    protected $transport: Maybe<TTransport> = null

    protected $subscribers: Maybe<SubscriberInstances> = null

    protected constructor ({
        name,
        app,
        router,
        transport,
        subscribers
    }: { name: string } & CreateSubscriberOptions<TTransport>) {
        this.$name = name
        this.$app = app
        this.$router = router
        this.$transport = transport
        this.$subscribers = subscribers ?? null
    }

    init () {
        return undefined
    }

    async destroy () {
        return Promise.resolve()
    }
}
