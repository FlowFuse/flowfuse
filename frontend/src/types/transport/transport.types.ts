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

export interface Transport<TConnect = TransportConnectOptions> {
    connect(key: string, options: TConnect): Promise<void>
    subscribe(key: string, topics: string[], options?: TransportSubscribeOptions): Promise<void>
    disconnect(key: string): Promise<void>
}
