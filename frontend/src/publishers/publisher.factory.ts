import { Maybe } from '@/types/common/types'
import type { CreatePublisherOptions } from '@/types/publishers/publisher.types'

type PublisherConstructor<T> = new (options: CreatePublisherOptions) => T

export function definePublisherSingleton<T extends { destroy(): Promise<void> }> (PublisherClass: PublisherConstructor<T>) {
    let instance: Maybe<T> = null

    function create (options: CreatePublisherOptions): T {
        if (!instance) {
            instance = new PublisherClass(options)
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
