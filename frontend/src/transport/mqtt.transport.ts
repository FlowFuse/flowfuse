import type { MqttConnectionOptions, MqttServiceI } from '@/types/services/mqtt.types'
import type { Transport, TransportConnectOptions, TransportSubscribeOptions } from '@/types/transport/transport.types'

export class MqttTransport implements Transport<TransportConnectOptions> {
    private $mqtt: MqttServiceI

    constructor (mqtt: MqttServiceI) {
        this.$mqtt = mqtt
    }

    async connect (key: string, options: TransportConnectOptions): Promise<void> {
        await this.$mqtt.createClient(key, options as Partial<MqttConnectionOptions>)
    }

    subscribe (key: string, topics: string[], options: TransportSubscribeOptions = {}): Promise<void> {
        return this.$mqtt.subscribe(key, topics, options)
    }

    disconnect (key: string): Promise<void> {
        return this.$mqtt.destroyClient(key)
    }
}

export function createMqttTransport (mqtt: MqttServiceI): MqttTransport {
    return new MqttTransport(mqtt)
}
