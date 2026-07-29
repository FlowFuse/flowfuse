import type {
    ErrorWithReasonCode,
    IClientSubscribeOptions,
    IConnackPacket,
    IDisconnectPacket,
    IPublishPacket,
    MqttClient,
    Packet
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
    onConnect?: (packet: IConnackPacket, client: MqttClient) => void
    onClose?: (client: MqttClient) => void
    onDisconnect?: (packet: IDisconnectPacket, client: MqttClient) => void
    onOffline?: (client: MqttClient) => void
    onEnd?: (client: MqttClient) => void
    onReconnect?: (client: MqttClient) => void
    onError?: (error: Error | ErrorWithReasonCode, client: MqttClient | null) => void
    onMessage?: (topic: string, message: Buffer, packet: IPublishPacket, client: MqttClient) => void
    onPacketSend?: (packet: Packet, client: MqttClient) => void
    onPacketReceive?: (packet: Packet, client: MqttClient) => void
    onOutgoingEmpty?: (client: MqttClient) => void
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

export interface ManagedMqttObserver {
    id: number
    handlers: MqttConnectionHandlers
}

export interface MqttObserverHandle {
    key: string
    id: number
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
    observers: Set<ManagedMqttObserver>
    connectionWaiters: Set<MqttConnectionWaiter>
    terminalFailure: boolean
    lastError: Error | null
    connectHandlerPromise: Promise<void> | null
}

export interface MqttServiceI extends AppService {
    createClient(clientKey: string, options?: Partial<MqttConnectionOptions>): Promise<MqttClient>
    destroyClient(clientKey: string): Promise<void>
    attachClientObserver(clientKey: string, options?: Partial<MqttConnectionOptions>): Promise<MqttObserverHandle>
    detachClientObserver(handle: MqttObserverHandle): Promise<void>
    getManagedClient(clientKey: string): ManagedMqttClient | null
    hasClient(clientKey: string): boolean
    publishMessage(clientKey: string, options: MqttPublishRequest): Promise<void>
    subscribe(clientKey: string, topic: string | string[], options?: MqttSubscribeOptions): Promise<void>
    unsubscribe(clientKey: string, topic: string | string[]): Promise<void>
    endConnection(clientKey: string): Promise<void>
    waitForConnection(clientKey: string, options?: MqttWaitForConnectionOptions): Promise<void>
    reset(): Promise<void>
}
