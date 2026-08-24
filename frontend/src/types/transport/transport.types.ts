/**
 * The bits of the broker packet a consumer may need beyond topic and payload:
 * the correlation id a reply has to echo, and any user properties the sender set.
 */
export interface TransportMessagePacket {
    properties?: {
        correlationData?: Uint8Array | Buffer | null
        userProperties?: Record<string, string | string[]>
    }
}

export interface TransportConnectOptions {
    getCredentials: () => Promise<unknown>
    onMessage?: (topic: string, message: Buffer | Uint8Array | string, packet?: TransportMessagePacket) => void
    onConnect?: () => void
    onClose?: () => void
    onOffline?: () => void
    onError?: (err: Error) => void
    onDisconnect?: () => void
}

export interface TransportSubscribeOptions {
    qos?: 0 | 1 | 2
}

import type { MqttPayload } from '@/types/services/mqtt.types'

export interface TransportPublishOptions {
    topic: string
    payload: MqttPayload
    qos?: 0 | 1 | 2
    correlationData?: string | null
    userProperties?: Record<string, string | string[]> | null
}

export interface TransportAttachmentHandle {
    key: string
    id: number
}

export interface Transport<TConnect = TransportConnectOptions> {
    attach(key: string, options: TConnect): Promise<TransportAttachmentHandle>
    subscribe(key: string, topics: string[], options?: TransportSubscribeOptions): Promise<void>
    publish(key: string, options: TransportPublishOptions): Promise<void>
    detach(handle: TransportAttachmentHandle): Promise<void>
}
