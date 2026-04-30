import type {
    IClientSubscribeOptions,
    IPublishPacket,
    MqttClient
} from 'mqtt'

import type { AppService } from '@/types'

export type ManagedClientStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'failed'
export type SerializeMode = 'auto' | 'raw' | 'json' | 'string'
export type BinaryPayload = Buffer | Uint8Array | ArrayBuffer
export type MqttPayload = string | BinaryPayload | Record<string, unknown> | unknown[]
export type MqttSubscribeOptions = Partial<IClientSubscribeOptions>

export interface MqttCredentials {
    url: string
    username: string
    password: string
    clientId?: string
}

export type MqttCredentialProvider = () => Promise<MqttCredentials>

export interface MqttReconnectOptions {
    enabled?: boolean
    initialDelay?: number
    maxDelay?: number
    factor?: number
}

export interface MqttReconnectPolicy {
    enabled: boolean
    initialDelay: number
    maxDelay: number
    factor: number
}

export interface MqttConnectionHandlers {
    onConnect?: (client: MqttClient) => void
    onClose?: (client: MqttClient) => void
    onOffline?: (client: MqttClient) => void
    onError?: (error: Error, client: MqttClient | null) => void
    onMessage?: (topic: string, message: Buffer, packet: IPublishPacket, client: MqttClient) => void
}

export interface MqttPublishRequest {
    topic: string
    payload: MqttPayload
    qos?: 0 | 1 | 2
    retain?: boolean
    onError?: ((error: Error) => void) | null
    correlationData?: string | null
    userProperties?: Record<string, string | string[]> | null
    serialize?: SerializeMode
    waitForConnection?: boolean
    connectionTimeout?: number
}

export interface MqttWaitForConnectionOptions {
    timeout?: number
}

export interface MqttConnectionOptions extends MqttConnectionHandlers {
    reconnectPeriod?: number
    getCredentials: MqttCredentialProvider
    reconnect?: MqttReconnectOptions
}

export interface ManagedMqttSubscription {
    topic: string
    options: MqttSubscribeOptions
}

export interface MqttConnectionWaiter {
    resolve: () => void
    reject: (error: Error) => void
    timer: ReturnType<typeof setTimeout> | null
}

export interface ManagedMqttClient {
    key: string
    client: MqttClient | null
    listeners: Set<() => void>
    destroyed: boolean
    intentionalDisconnect: boolean
    status: ManagedClientStatus
    getCredentials: MqttCredentialProvider
    reconnectPolicy: MqttReconnectPolicy
    reconnectAttempt: number
    reconnectGeneration: number
    reconnectTimer: ReturnType<typeof setTimeout> | null
    subscriptions: Map<string, ManagedMqttSubscription>
    handlers: MqttConnectionHandlers
    connectionWaiters: Set<MqttConnectionWaiter>
    terminalFailure: boolean
    lastError: Error | null
}

export interface MqttServiceI extends AppService {
    createClient(key: string, options?: Partial<MqttConnectionOptions>): Promise<MqttClient>
    destroyClient(key: string): Promise<void>
    getManagedClient(key: string): ManagedMqttClient | null
    hasClient(key: string): boolean
    publishMessage(key: string, options: MqttPublishRequest): Promise<void>
    subscribe(key: string, topic: string | string[], options?: MqttSubscribeOptions): Promise<void>
    unsubscribe(key: string, topic: string | string[]): Promise<void>
    endConnection(key: string): Promise<void>
    waitForConnection(key: string, options?: MqttWaitForConnectionOptions): Promise<void>
    reset(): Promise<void>
}
