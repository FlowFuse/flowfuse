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

/**
 * The broker's answer to a connect, or its reason for a disconnect. Attaching to a link
 * that is already up reports an empty one.
 */
export interface TransportReasonPacket {
    reasonCode?: number
    properties?: {
        reasonString?: string
    }
}

export interface TransportError extends Error {
    code?: number | string | null
}

export interface TransportConnectOptions {
    getCredentials: () => Promise<unknown>
    onMessage?: (topic: string, message: Buffer | Uint8Array | string, packet?: TransportMessagePacket) => void
    onConnect?: (connack?: TransportReasonPacket) => void
    onClose?: () => void
    onOffline?: () => void
    onError?: (err: TransportError) => void
    onDisconnect?: (packet?: TransportReasonPacket) => void
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
