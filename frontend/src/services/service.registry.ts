import { BootstrapServiceI, createBootstrapService } from './bootstrap.service'
import { MqttServiceI, createMqttService } from './mqtt.service'
import { PostMessageServiceI, createMessagingService } from './post-message.service'

export type ServiceInstances = {
    bootstrap: BootstrapServiceI | null
    postMessage: PostMessageServiceI | null
    mqtt: MqttServiceI | null
}

export default [
    { key: 'bootstrap' as const, create: createBootstrapService, requiredLifecycle: ['init', 'destroy'] as const },
    { key: 'postMessage' as const, create: createMessagingService, requiredLifecycle: ['destroy'] as const },
    { key: 'mqtt' as const, create: createMqttService, requiredLifecycle: ['destroy'] as const }
]
