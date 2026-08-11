export interface TransportConnectOptions {
    getCredentials: () => Promise<unknown>
    onMessage?: (topic: string, message: Buffer | Uint8Array | string) => void
    onConnect?: () => void
    onClose?: () => void
    onOffline?: () => void
    onError?: (err: Error) => void
    onDisconnect?: () => void
}

export interface TransportSubscribeOptions {
    qos?: 0 | 1 | 2
}

export interface TransportPublishOptions {
    topic: string
    payload: unknown
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
