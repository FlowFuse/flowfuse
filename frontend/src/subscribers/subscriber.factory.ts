import { Maybe } from '@/types/common/types'
import type { CreateSubscriberOptions } from '@/types/subscribers/subscriber.types'

type SubscriberConstructor<T> = new (options: CreateSubscriberOptions) => T

export function defineSubscriberSingleton<T extends { destroy(): Promise<void> }> (Ctor: SubscriberConstructor<T>) {
    let instance: Maybe<T> = null

    function create (options: CreateSubscriberOptions): T {
        if (!instance) {
            instance = new Ctor(options)
        }
        return instance
    }

    async function destroy (): Promise<void> {
        if (!instance) return
        await instance.destroy()
        instance = null
    }

    return { create, destroy }
}
