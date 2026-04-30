import Mqtt, {
    type IClientPublishOptions,
    type IConnackPacket,
    type IDisconnectPacket,
    type IPublishPacket,
    type MqttClient,
    type MqttClientEventCallbacks,
    type Packet
} from 'mqtt'

import { BaseService } from './service.contract'

import { Maybe } from '@/types/common/types'
import type {
    BinaryPayload,
    ManagedMqttClient,
    MqttConnectionOptions,
    MqttConnectionWaiter,
    MqttCredentialProvider,
    MqttCredentials,
    MqttPublishRequest,
    MqttReconnectOptions,
    MqttReconnectPolicy,
    MqttServiceI,
    MqttSubscribeOptions,
    MqttWaitForConnectionOptions,
    SerializeMode
} from '@/types/services/mqtt.types'
import type { CreateServiceOptions } from '@/types/services/service.types'

type MqttModule = typeof Mqtt
type NormalizedBinaryPayload = Buffer
type PublishPayload = string | NormalizedBinaryPayload
type TerminalConnectionError = Error & { code?: string }

interface MqttNormalizedPublishProperties {
    correlationData?: string
    userProperties?: Record<string, string | string[]>
}

class MqttService extends BaseService implements MqttServiceI {
    protected $mqtt: MqttModule | null

    protected $clients: Map<string, ManagedMqttClient>

    protected $clientOperations: Map<string, Promise<unknown>>

    protected $destroyed: boolean

    constructor ({ app, router, services }: CreateServiceOptions) {
        super({
            name: 'mqtt',
            app,
            router,
            services
        })

        this.$mqtt = null
        this.$clients = new Map()
        this.$clientOperations = new Map()
        this.$destroyed = false

        this.init()
    }

    init () {
        this.$mqtt = Mqtt
    }

    getManagedClient (key: string): ManagedMqttClient | null {
        return this.$clients.get(key) ?? null
    }

    hasClient (key: string): boolean {
        return this.$clients.has(key)
    }

    async runClientOperation<T> (key: string, operation: () => Promise<T> | T): Promise<T> {
        const previous = this.$clientOperations.get(key) ?? Promise.resolve()
        const current = previous
            .catch(() => {})
            .then(operation)

        const tracked = current.finally(() => {
            if (this.$clientOperations.get(key) === tracked) {
                this.$clientOperations.delete(key)
            }
        })
        this.$clientOperations.set(key, tracked)

        return tracked
    }

    async destroyClient (key: string): Promise<void> {
        await this.runClientOperation(key, async () => {
            await this._destroyClientUnlocked(key)
        })
    }

    async createClient (key: string, options: Partial<MqttConnectionOptions> = {}): Promise<MqttClient> {
        const {
            reconnectPeriod = 0,
            getCredentials,
            reconnect,
            onConnect,
            onClose,
            onOffline,
            onError,
            onMessage
        } = options

        if (!key || typeof key !== 'string') {
            throw new Error('MQTT connection key is required')
        }

        if (typeof getCredentials !== 'function') {
            throw new Error(`MQTT connection "${key}" requires a getCredentials callback`)
        }

        return this.runClientOperation(key, async () => {
            if (this.$destroyed) {
                throw new Error('MqttService has been destroyed')
            }

            if (this.hasClient(key)) {
                await this._destroyClientUnlocked(key)
            }

            const managed: ManagedMqttClient = {
                key,
                client: null,
                listeners: new Set(),
                destroyed: false,
                intentionalDisconnect: false,
                status: 'idle',
                getCredentials: this._buildCredentialsProvider(key, getCredentials),
                reconnectPolicy: this._normalizeReconnectPolicy({
                    reconnect,
                    reconnectPeriod,
                    hasDynamicCredentials: true
                }),
                reconnectAttempt: 0,
                reconnectGeneration: 0,
                reconnectTimer: null,
                subscriptions: new Map(),
                connectionWaiters: new Set(),
                terminalFailure: false,
                lastError: null,
                handlers: {
                    onConnect,
                    onClose,
                    onOffline,
                    onError,
                    onMessage
                }
            }

            this.$clients.set(key, managed)

            try {
                return await this.connectManagedClient(managed, false)
            } catch (error) {
                this.$clients.delete(key)
                throw error
            }
        })
    }

    async publishMessage (key: string, options?: MqttPublishRequest): Promise<void> {
        const managed = this.getManagedClient(key)

        if (!managed || managed.destroyed) {
            return Promise.reject(new Error(`MQTT connection "${key}" does not exist`))
        }

        const {
            topic,
            payload,
            qos = 2,
            retain,
            onError = null,
            correlationData = null,
            userProperties = null,
            serialize = 'auto',
            waitForConnection = true,
            connectionTimeout = 5000
        } = options!

        if (!topic || typeof topic !== 'string' || !topic.trim()) {
            return Promise.reject(new Error('MQTT publish topic is required'))
        }
        if (topic.includes('+') || topic.includes('#')) {
            return Promise.reject(new Error('MQTT publish topic must not contain wildcard characters'))
        }

        if (qos !== undefined && (!Number.isInteger(qos) || qos < 0 || qos > 2)) {
            return Promise.reject(new TypeError('MQTT publish qos must be one of: 0, 1, 2'))
        }

        if (retain !== undefined && typeof retain !== 'boolean') {
            return Promise.reject(new TypeError('MQTT publish retain must be a boolean'))
        }

        if (onError !== null && onError !== undefined && typeof onError !== 'function') {
            return Promise.reject(new TypeError('MQTT publish onError must be a function'))
        }

        if (typeof waitForConnection !== 'boolean') {
            return Promise.reject(new TypeError('MQTT publish waitForConnection must be a boolean'))
        }

        if (!Number.isInteger(connectionTimeout) || connectionTimeout < 0) {
            return Promise.reject(new TypeError('MQTT publish connectionTimeout must be a non-negative integer'))
        }

        let normalizedPayload: PublishPayload
        let properties: MqttNormalizedPublishProperties | undefined
        try {
            normalizedPayload = this._normalizePublishPayload(payload, serialize)
            properties = this._normalizePublishProperties({
                correlationData,
                userProperties
            })
        } catch (error) {
            return Promise.reject(error)
        }

        const publishOptions: IClientPublishOptions = {
            qos,
            retain
        }

        if (properties) {
            publishOptions.properties = {
                ...properties,
                correlationData: properties.correlationData
                    ? new TextEncoder().encode(properties.correlationData) as unknown as Buffer
                    : undefined
            }
        }

        if (waitForConnection) {
            try {
                await this.waitForConnection(key, { timeout: connectionTimeout })
            } catch (error) {
                if (error instanceof Error && typeof onError === 'function') onError(error)
                return Promise.reject(error)
            }
        }

        const { client } = managed

        if (managed.status === 'reconnecting' || !client?.connected) {
            return Promise.reject(new Error(`MQTT connection "${key}" is not connected`))
        }

        return new Promise<void>((resolve, reject) => {
            client.publish(topic, normalizedPayload as string | Buffer, publishOptions, (err?: Error) => {
                if (err) {
                    if (typeof onError === 'function') onError(err)
                    reject(err)
                    return
                }
                resolve()
            })
        })
    }

    subscribe (key: string, topic: string | string[], options: MqttSubscribeOptions = {}): Promise<void> {
        const managed = this.$clients.get(key)
        if (!managed || managed.destroyed) {
            return Promise.reject(new Error(`MQTT connection "${key}" does not exist`))
        }

        if (!managed.client?.connected) {
            return Promise.reject(new Error(`MQTT connection "${key}" is not connected`))
        }

        return new Promise<void>((resolve, reject) => {
            managed.client?.subscribe(topic, options, (err?: Error | null) => {
                if (err) {
                    reject(err)
                    return
                }
                this.rememberSubscriptions(managed, topic, options)
                resolve()
            })
        })
    }

    unsubscribe (key: string, topic: string | string[]): Promise<void> {
        const managed = this.getManagedClient(key)
        if (!managed || managed.destroyed) {
            return Promise.resolve()
        }

        if (!managed.client?.connected) {
            return Promise.reject(new Error(`MQTT connection "${key}" is not connected`))
        }

        return new Promise<void>((resolve, reject) => {
            managed.client?.unsubscribe(topic, (err?: Error | null) => {
                if (err) {
                    reject(err)
                    return
                }
                this.forgetSubscriptions(managed, topic)
                resolve()
            })
        })
    }

    async endConnection (key: string): Promise<void> {
        await this.destroyClient(key)
    }

    async destroy (): Promise<void> {
        this.$destroyed = true

        const keys = [...this.$clients.keys()]
        await Promise.all(keys.map(async (key) => this.destroyClient(key)))

        this.$clients.clear()
        this.$mqtt = null
    }

    async reset (): Promise<void> {
        await this.destroy()
        this.$destroyed = false
        this.$mqtt = Mqtt
    }

    endMqttClient (client: MqttClient, force: boolean = true): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            client.end(force, undefined, (error?: Error) => {
                if (error) {
                    if (this._isIgnorableClientCloseError(error)) {
                        resolve()
                        return
                    }
                    reject(error)
                    return
                }
                resolve()
            })
        })
    }

    clearReconnectTimer (managed: ManagedMqttClient) {
        if (managed.reconnectTimer) {
            clearTimeout(managed.reconnectTimer)
            managed.reconnectTimer = null
        }
    }

    cleanupManagedListeners (managed: ManagedMqttClient) {
        for (const off of managed.listeners) {
            try {
                off()
            } catch {
                // ignore listener cleanup failures
            }
        }
        managed.listeners.clear()
    }

    resolveConnectionWaiters (managed: ManagedMqttClient) {
        if (!managed.connectionWaiters) {
            managed.connectionWaiters = new Set()
        }
        for (const waiter of managed.connectionWaiters) {
            if (waiter.timer) {
                clearTimeout(waiter.timer)
            }
            waiter.resolve()
        }
        managed.connectionWaiters.clear()
    }

    rejectConnectionWaiters (managed: ManagedMqttClient, error: Error) {
        if (!managed.connectionWaiters) {
            managed.connectionWaiters = new Set()
        }
        for (const waiter of managed.connectionWaiters) {
            if (waiter.timer) {
                clearTimeout(waiter.timer)
            }
            waiter.reject(error)
        }
        managed.connectionWaiters.clear()
    }

    waitForConnection (key: string, { timeout = 5000 }: MqttWaitForConnectionOptions = {}): Promise<void> {
        const managed = this.getManagedClient(key)
        if (!managed || managed.destroyed) {
            return Promise.reject(new Error(`MQTT connection "${key}" does not exist`))
        }

        if (!Number.isInteger(timeout) || timeout < 0) {
            return Promise.reject(new TypeError('MQTT waitForConnection timeout must be a non-negative integer'))
        }

        if (managed.status === 'failed' && managed.lastError) {
            return Promise.reject(managed.lastError)
        }

        if (managed.client?.connected && managed.status !== 'reconnecting') {
            return Promise.resolve()
        }

        return new Promise<void>((resolve, reject) => {
            const waiter: MqttConnectionWaiter = {
                resolve: () => {
                    managed.connectionWaiters.delete(waiter)
                    resolve()
                },
                reject: (error: Error) => {
                    managed.connectionWaiters.delete(waiter)
                    reject(error)
                },
                timer: null
            }

            waiter.timer = setTimeout(() => {
                waiter.reject(new Error(`MQTT connection "${key}" did not connect before the timeout elapsed`))
            }, timeout)

            managed.connectionWaiters.add(waiter)
        })
    }

    async connectManagedClient (managed: ManagedMqttClient, isReconnect: boolean): Promise<MqttClient> {
        if (managed.destroyed || this.$destroyed) {
            throw new Error(`${managed.destroyed ? 'Client' : 'MqttService'} has been destroyed`)
        }

        managed.reconnectGeneration += 1
        managed.status = isReconnect ? 'reconnecting' : 'connecting'
        managed.lastError = null

        const credentials = await managed.getCredentials()

        if (!this._isValidUrl(credentials.url)) {
            throw new Error(`Invalid MQTT url for connection "${managed.key}"`)
        }

        const previousClient = managed.client
        if (previousClient) {
            this.cleanupManagedListeners(managed)
            managed.client = null
            try {
                await this.endMqttClient(previousClient, true)
            } catch {
                // ignore stale client close failures before replacement
            }
            this._killStaleClient(previousClient)
        }

        const mqttModule = this.$mqtt
        if (!mqttModule) {
            throw new Error('MQTT client module is unavailable')
        }

        const client = mqttModule.connect(credentials.url, {
            username: credentials.username,
            password: credentials.password,
            clientId: credentials.clientId,
            reconnectPeriod: 0,
            protocolVersion: 5,
            keepalive: 2
        })

        managed.client = client
        this.bindManagedListeners(managed, client)

        return client
    }

    bindManagedListeners (managed: ManagedMqttClient, client: MqttClient) {
        const register = <K extends keyof MqttClientEventCallbacks>(
            eventName: K,
            handler: MqttClientEventCallbacks[K]
        ) => {
            const wrapped = ((...args: Parameters<MqttClientEventCallbacks[K]>) => {
                if (managed.destroyed || this.$destroyed || managed.client !== client) return
                ;(handler as (...a: unknown[]) => void)(...args)
            }) as MqttClientEventCallbacks[K]

            client.on(eventName, wrapped)
            managed.listeners.add(() => client.off(eventName, wrapped))
        }

        register('connect', async (connack: IConnackPacket) => {
            managed.status = 'connected'
            managed.reconnectAttempt = 0
            managed.terminalFailure = false
            managed.lastError = null
            this.clearReconnectTimer(managed)
            this.resolveConnectionWaiters(managed)

            try {
                await this.replaySubscriptions(managed, client)
            } catch (error) {
                if (error instanceof Error) {
                    managed.handlers.onError?.(error, client)
                }
            }

            managed.handlers.onConnect?.(connack, client)
        })

        register('close', () => {
            managed.status = 'disconnected'
            managed.handlers.onClose?.(client)
            this.scheduleReconnect(managed)
        })

        register('disconnect', (packet: IDisconnectPacket) => {
            managed.handlers.onDisconnect?.(packet, client)
        })

        register('offline', () => {
            managed.status = 'disconnected'
            managed.handlers.onOffline?.(client)
            this.scheduleReconnect(managed)
        })

        register('end', () => {
            managed.handlers.onEnd?.(client)
        })

        register('reconnect', () => {
            managed.handlers.onReconnect?.(client)
        })

        register('error', (error: Error) => {
            managed.handlers.onError?.(error, client)
        })

        register('message', (topic: string, message: Buffer, packet: IPublishPacket) => {
            managed.handlers.onMessage?.(topic, message, packet, client)
        })

        register('packetsend', (packet: Packet) => {
            managed.handlers.onPacketSend?.(packet, client)
        })

        register('packetreceive', (packet: Packet) => {
            managed.handlers.onPacketReceive?.(packet, client)
        })

        register('outgoingEmpty', () => {
            managed.handlers.onOutgoingEmpty?.(client)
        })
    }

    scheduleReconnect (managed: ManagedMqttClient) {
        if (
            managed.destroyed ||
            this.$destroyed ||
            managed.intentionalDisconnect ||
            managed.terminalFailure ||
            !managed.reconnectPolicy.enabled ||
            managed.reconnectTimer ||
            managed.status === 'connected' ||
            managed.status === 'connecting'
        ) {
            return
        }

        const attempt = managed.reconnectAttempt
        const delay = Math.min(
            managed.reconnectPolicy.maxDelay,
            managed.reconnectPolicy.initialDelay * Math.pow(managed.reconnectPolicy.factor, attempt)
        )

        const generation = managed.reconnectGeneration

        managed.reconnectAttempt += 1
        managed.status = 'reconnecting'
        managed.reconnectTimer = setTimeout(() => {
            managed.reconnectTimer = null
            if (managed.reconnectGeneration !== generation) return
            this.reconnectClient(managed.key)
        }, delay)
    }

    async reconnectClient (key: string): Promise<void> {
        await this.runClientOperation(key, async () => {
            const managed = this.$clients.get(key)
            if (!managed || managed.destroyed || managed.intentionalDisconnect || this.$destroyed) {
                return
            }

            if (managed.client?.connected) {
                return
            }

            try {
                await this.connectManagedClient(managed, true)
            } catch (error) {
                const normalizedError = error instanceof Error ? error : new Error(String(error))
                managed.status = 'failed'
                managed.lastError = normalizedError
                if (this._isTerminalConnectionError(normalizedError)) {
                    managed.terminalFailure = true
                    this.clearReconnectTimer(managed)
                    this.rejectConnectionWaiters(managed, normalizedError)
                }
                managed.handlers.onError?.(normalizedError, managed.client)
                if (!managed.terminalFailure) {
                    this.scheduleReconnect(managed)
                }
            }
        })
    }

    rememberSubscriptions (managed: ManagedMqttClient, topic: string | string[], options: MqttSubscribeOptions = {}) {
        const topics = Array.isArray(topic) ? topic : [topic]
        for (const topicName of topics) {
            managed.subscriptions.set(topicName, {
                topic: topicName,
                options: { ...options }
            })
        }
    }

    forgetSubscriptions (managed: ManagedMqttClient, topic: string | string[]) {
        const topics = Array.isArray(topic) ? topic : [topic]
        for (const topicName of topics) {
            managed.subscriptions.delete(topicName)
        }
    }

    async replaySubscriptions (managed: ManagedMqttClient, client: MqttClient): Promise<void> {
        const subscriptions = [...managed.subscriptions.values()]
        if (!subscriptions.length || managed.client !== client || !client.connected) {
            return
        }

        await Promise.all(subscriptions.map(({ topic, options }) => {
            return new Promise<void>((resolve, reject) => {
                client.subscribe(topic, options, (err?: Error | null) => {
                    if (err) {
                        reject(err)
                        return
                    }
                    resolve()
                })
            })
        }))
    }

    private _buildCredentialsProvider (key: string, getCredentials: MqttCredentialProvider): MqttCredentialProvider {
        return async () => {
            let credentials: MqttCredentials
            try {
                credentials = await getCredentials()
            } catch (error) {
                throw this._asTerminalConnectionError(
                    error,
                    `MQTT credential provider for connection "${key}" failed`
                )
            }

            if (!credentials || typeof credentials !== 'object') {
                throw this._createTerminalConnectionError(`MQTT credential provider for connection "${key}" must resolve to an object`)
            }

            if (!this._isValidUrl(credentials.url)) {
                throw this._createTerminalConnectionError(`MQTT credential provider for connection "${key}" must return a valid url`)
            }

            if (typeof credentials.username !== 'string' || !credentials.username.trim()) {
                throw this._createTerminalConnectionError(`MQTT credential provider for connection "${key}" must return a non-empty username`)
            }

            if (typeof credentials.password !== 'string' || !credentials.password.trim()) {
                throw this._createTerminalConnectionError(`MQTT credential provider for connection "${key}" must return a non-empty password`)
            }

            if (credentials.clientId !== undefined && (typeof credentials.clientId !== 'string' || !credentials.clientId.trim())) {
                throw this._createTerminalConnectionError(`MQTT credential provider for connection "${key}" must return a non-empty clientId when provided`)
            }

            if (!credentials.clientId) {
                credentials.clientId = credentials.username
            }

            return credentials
        }
    }

    private _createTerminalConnectionError (message: string): TerminalConnectionError {
        const error: TerminalConnectionError = new Error(message)
        error.code = 'MQTT_TERMINAL_CONNECTION_ERROR'
        return error
    }

    private _asTerminalConnectionError (error: unknown, fallbackMessage: string): TerminalConnectionError {
        const normalized: TerminalConnectionError = error instanceof Error ? error : new Error(fallbackMessage)
        normalized.code = 'MQTT_TERMINAL_CONNECTION_ERROR'
        return normalized
    }

    private _isTerminalConnectionError (error: unknown): error is TerminalConnectionError {
        return error instanceof Error && (error as TerminalConnectionError).code === 'MQTT_TERMINAL_CONNECTION_ERROR'
    }

    private async _destroyClientUnlocked (key: string): Promise<void> {
        const managed = this.$clients.get(key)
        if (!managed) return

        managed.destroyed = true
        managed.intentionalDisconnect = true
        managed.status = 'disconnected'

        this.clearReconnectTimer(managed)
        this.rejectConnectionWaiters(managed, new Error(`MQTT connection "${key}" has been closed`))

        for (const off of managed.listeners) {
            try {
                off()
            } catch {
                // ignore listener cleanup failures
            }
        }
        managed.listeners.clear()

        if (managed.client) {
            const client = managed.client
            managed.client = null
            try {
                await this.endMqttClient(client, true)
            } catch {
                // ignore close failures during cleanup
            }
            this._killStaleClient(client)
        }

        this.$clients.delete(key)
    }

    private _killStaleClient (client: MqttClient) {
        try {
            client.removeAllListeners()
            const stream = (client as unknown as { stream?: { destroyed?: boolean, destroy?: () => void } }).stream
            if (stream && !stream.destroyed && typeof stream.destroy === 'function') {
                stream.destroy()
            }
        } catch {
            // best-effort cleanup of zombie client
        }
    }

    private _isIgnorableClientCloseError (error: unknown): boolean {
        return (
            error instanceof Error &&
            typeof error.message === 'string' &&
            ['Connection closed', 'client disconnecting', 'client disconnected'].includes(error.message)
        )
    }

    private _isPlainObject (value: unknown): value is Record<string, unknown> {
        if (value === null || typeof value !== 'object') return false
        const prototype = Object.getPrototypeOf(value)
        return prototype === Object.prototype || prototype === null
    }

    private _isValidUrl (url: unknown): url is string {
        if (typeof url !== 'string' || !url.trim()) return false

        try {
            const parsed = new URL(url)
            return ['mqtt:', 'mqtts:', 'ws:', 'wss:'].includes(parsed.protocol)
        } catch {
            return false
        }
    }

    private _isBinaryPayload (payload: unknown): payload is BinaryPayload {
        return (
            (typeof Buffer !== 'undefined' && Buffer.isBuffer(payload)) ||
            payload instanceof Uint8Array ||
            payload instanceof ArrayBuffer
        )
    }

    private _normalizeReconnectPolicy ({
        reconnect,
        reconnectPeriod = 0,
        hasDynamicCredentials = false
    }: {
        reconnect?: MqttReconnectOptions
        reconnectPeriod?: number
        hasDynamicCredentials?: boolean
    } = {}): MqttReconnectPolicy {
        const initialDelay = Number.isFinite(reconnect?.initialDelay) && (reconnect?.initialDelay ?? -1) >= 0
            ? reconnect.initialDelay as number
            : (Number.isFinite(reconnectPeriod) && reconnectPeriod >= 0 ? reconnectPeriod : 1000)

        const maxDelay = Number.isFinite(reconnect?.maxDelay) && (reconnect?.maxDelay ?? -1) >= initialDelay
            ? reconnect.maxDelay as number
            : Math.max(initialDelay, 30000)

        const factor = Number.isFinite(reconnect?.factor) && (reconnect?.factor ?? 0) >= 1
            ? reconnect.factor as number
            : 2

        const enabled = reconnect?.enabled ?? hasDynamicCredentials ?? initialDelay > 0

        return {
            enabled,
            initialDelay,
            maxDelay,
            factor
        }
    }

    private _normalizePublishPayload (payload: unknown, serialize: SerializeMode = 'auto'): PublishPayload {
        if (!['auto', 'raw', 'json', 'string'].includes(serialize)) {
            throw new TypeError(`Invalid MQTT payload serialization mode: "${serialize}"`)
        }

        if (serialize === 'json') {
            return this._stringifyPayload(payload, 'json')
        }

        if (serialize === 'string') {
            return String(payload)
        }

        if (serialize === 'raw') {
            if (typeof payload === 'string' || this._isBinaryPayload(payload)) {
                return this._isBinaryPayload(payload)
                    ? this._normalizeBinaryPayload(payload)
                    : payload
            }
            throw new TypeError('MQTT raw payload must be a string or binary value')
        }

        if (typeof payload === 'string' || this._isBinaryPayload(payload)) {
            return this._isBinaryPayload(payload)
                ? this._normalizeBinaryPayload(payload)
                : payload
        }

        if (Array.isArray(payload) || this._isPlainObject(payload)) {
            return this._stringifyPayload(payload, 'auto')
        }

        throw new TypeError('Unsupported MQTT payload type for auto serialization')
    }

    private _normalizePublishProperties ({
        correlationData,
        userProperties
    }: {
        correlationData: Maybe<string>
        userProperties: Maybe<Record<string, string | string[]>>
    }): MqttNormalizedPublishProperties | undefined {
        const normalizedCorrelationData = this._normalizeCorrelationData(correlationData)
        const normalizedUserProperties = this._normalizeUserProperties(userProperties)

        if (!normalizedCorrelationData && !normalizedUserProperties) {
            return undefined
        }

        return {
            correlationData: normalizedCorrelationData,
            userProperties: normalizedUserProperties
        }
    }

    private _normalizeCorrelationData (correlationData: Maybe<string>): string | undefined {
        if (correlationData === null || correlationData === undefined) {
            return undefined
        }

        if (typeof correlationData === 'string') {
            return correlationData
        }

        throw new TypeError('MQTT publish correlationData must be a string')
    }

    private _normalizeUserProperties (userProperties: Maybe<Record<string, string | string[]>>): Record<string, string | string[]> | undefined {
        if (userProperties === null || userProperties === undefined) {
            return undefined
        }

        if (!this._isPlainObject(userProperties)) {
            throw new TypeError('MQTT publish userProperties must be a plain object')
        }

        const normalized: Record<string, string | string[]> = {}
        for (const [key, value] of Object.entries(userProperties)) {
            if (!key.trim()) {
                throw new TypeError('MQTT publish userProperties keys must be non-empty strings')
            }

            if (typeof value === 'string') {
                normalized[key] = value
                continue
            }

            if (Array.isArray(value) && value.every(item => typeof item === 'string')) {
                normalized[key] = value
                continue
            }

            throw new TypeError(`MQTT publish userProperties["${key}"] must be a string or string[]`)
        }

        return Object.keys(normalized).length ? normalized : undefined
    }

    private _normalizeBinaryPayload (payload: BinaryPayload): NormalizedBinaryPayload {
        if (typeof Buffer !== 'undefined' && Buffer.isBuffer(payload)) {
            return payload
        }

        if (payload instanceof ArrayBuffer) {
            if (typeof Buffer !== 'undefined') {
                return Buffer.from(payload)
            }
            return new Uint8Array(payload) as unknown as NormalizedBinaryPayload
        }

        if (typeof Buffer !== 'undefined') {
            return Buffer.from(payload.buffer, payload.byteOffset, payload.byteLength)
        }
        return new Uint8Array(payload.buffer, payload.byteOffset, payload.byteLength) as unknown as NormalizedBinaryPayload
    }

    private _stringifyPayload (payload: unknown, mode: 'auto' | 'json'): string {
        try {
            return JSON.stringify(payload)
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error)
            throw new TypeError(`Failed to serialize MQTT payload in "${mode}" mode: ${message}`)
        }
    }
}

let MqttServiceInstance: MqttService | null = null

export function createMqttService ({ app, router, services }: CreateServiceOptions): MqttService {
    if (!MqttServiceInstance) {
        MqttServiceInstance = new MqttService({
            app,
            router,
            services
        })
    }

    return MqttServiceInstance
}

export async function destroyMqttService (): Promise<void> {
    if (!MqttServiceInstance) return
    await MqttServiceInstance.destroy()
    MqttServiceInstance = null
}

export const FATAL_ERROR_CODES = new Set([
    0x84, // Unsupported Protocol Version
    0x86, // Bad User Name or Password
    0x8A, // Banned
    0x8C, // Bad authentication method
    0x9A, // Retain not supported
    0x9B, // QoS not supported
    0x9E, // Shared Subscriptions not supported
    0xA1, // Subscription Identifiers not supported
    0xA2 // Wildcard Subscriptions not supported
])

export const TRANSIENT_ERROR_CODES = new Set([
    0x88, // Server unavailable
    0x89, // Server busy
    0x8B, // Server shutting down
    0x98, // Administrative action
    0xA0 // Maximum connect time
])

export const THROTTLED_ERROR_CODES = new Set([
    0x97, // Quota exceeded
    0x9F // Connection rate exceeded
])

export const PROTOCOL_BUG_ERROR_CODES = new Set([
    0x81, 0x82, // Malformed Packet, Protocol Error
    0x8F, 0x90, // Topic Filter / Topic Name invalid
    0x91, 0x92, // Packet Identifier issues
    0x93, 0x94, // Receive Maximum / Topic Alias
    0x95, 0x96, 0x99 // Packet too large, Rate too high, Payload format
])

export default createMqttService
