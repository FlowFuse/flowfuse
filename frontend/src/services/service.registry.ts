import { BootstrapServiceI, createBootstrapService } from './bootstrap.service'
import { MqttServiceI, createMqttService } from './mqtt.service'
import { PostMessageServiceI, createMessagingService } from './post-message.service'

export type ServiceInstances = {
    bootstrap: BootstrapServiceI | null
    postMessage: PostMessageServiceI | null
    mqtt: MqttServiceI | null
}

export default [
    { key: 'bootstrap', create: createBootstrapService, requiredLifecycle: ['init', 'destroy'] },
    { key: 'postMessage', create: createMessagingService, requiredLifecycle: ['destroy'] },
    { key: 'mqtt', create: createMqttService, requiredLifecycle: ['destroy'] }
]
