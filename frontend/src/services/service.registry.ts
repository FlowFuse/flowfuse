import { createBootstrapService } from './bootstrap.service'
import { createMqttService } from './mqtt.service'
import { createMessagingService } from './post-message.service'

export default [
    { key: 'bootstrap' as const, create: createBootstrapService, requiredLifecycle: ['init', 'destroy'] as const },
    { key: 'postMessage' as const, create: createMessagingService, requiredLifecycle: ['destroy'] as const },
    { key: 'mqtt' as const, create: createMqttService, requiredLifecycle: ['destroy'] as const }
]
