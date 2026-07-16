import type { MqttConnectionOptions, MqttServiceI } from '@/types/services/mqtt.types'
import type { Transport, TransportAttachmentHandle, TransportConnectOptions, TransportSubscribeOptions } from '@/types/transport/transport.types'

export class MqttTransport implements Transport<TransportConnectOptions> {
    private $mqtt: MqttServiceI

    constructor (mqtt: MqttServiceI) {
        this.$mqtt = mqtt
    }

    attach (key: string, options: TransportConnectOptions): Promise<TransportAttachmentHandle> {
        return this.$mqtt.attachClient(key, options as Partial<MqttConnectionOptions>)
    }

    subscribe (key: string, topics: string[], options: TransportSubscribeOptions = {}): Promise<void> {
        return this.$mqtt.subscribe(key, topics, options)
    }

    detach (handle: TransportAttachmentHandle): Promise<void> {
        return this.$mqtt.detachClient(handle)
    }
}

export function createMqttTransport (mqtt: MqttServiceI): MqttTransport {
    return new MqttTransport(mqtt)
}
