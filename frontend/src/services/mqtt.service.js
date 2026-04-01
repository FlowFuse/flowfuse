import Mqtt from 'mqtt'

import { BaseService } from './service.contract.js'

/**
 * @typedef {Object} MqttConnectionOptions
 * @property {number} [reconnectPeriod=0]
 * @property {() => Promise<{url: string, username: string, password: string, clientId?: string}>} getCredentials
 * @property {{enabled?: boolean, initialDelay?: number, maxDelay?: number, factor?: number}} [reconnect]
 * @property {(client: import('mqtt').Client) => void} [onConnect]
 * @property {(client: import('mqtt').Client) => void} [onClose]
 * @property {(client: import('mqtt').Client) => void} [onOffline]
 * @property {(error: Error, client: import('mqtt').MqttClient) => void} [onError]
 * @property {(topic: string, message: Buffer, packet: any, client: import('mqtt').MqttClient) => void} [onMessage]
 */

/**
 * @typedef {Object} ManagedMqttClient
 * @property {string} key
 * @property {import('mqtt').Client | null} client
 * @property {Set<Function>} listeners
 * @property {boolean} destroyed
 * @property {boolean} intentionalDisconnect
 * @property {'idle' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'failed'} status
 * @property {() => Promise<{url: string, username: string, password: string, clientId?: string}>} getCredentials
 * @property {{enabled: boolean, initialDelay: number, maxDelay: number, factor: number}} reconnectPolicy
 * @property {number} reconnectAttempt
 * @property {ReturnType<typeof setTimeout> | null} reconnectTimer
 * @property {Map<string, {topic: string, options: Mqtt.ClientSubscribeOptions}>} subscriptions
 * @property {{onConnect?: Function, onClose?: Function, onOffline?: Function, onError?: Function, onMessage?: Function}} handlers
 * @property {Set<{resolve: Function, reject: Function, timer: ReturnType<typeof setTimeout> | null}>} connectionWaiters
 */

class MqttService extends BaseService {
    /**
     * @type {import('vue').App}
     */
    $app

    /**
     * @type {import('vuex').Store}
     */
    $store

    /**
     * @type {import('vue-router').Router}
     */
    $router

    /**
     * @type {Object}
     */
    $services

    /**
     * @type {typeof import('mqtt') | null}
     */
    $mqtt = null

    /**
     * @type {Map<string, ManagedMqttClient>}
     */
    $clients = new Map()

    /**
     * Per-key operation queue used to serialize lifecycle operations.
     * @type {Map<string, Promise<any>>}
     */
    $clientOperations = new Map()

    /**
     * @type {boolean}
     */
    $destroyed = false

    /**
     * @param {{app: import('vue').App, store: import('vuex').Store, router: import('vue-router').Router, services?: Object}} options
     */
    constructor ({
        app,
        store,
        router,
        services = {}
    }) {
        super('mqtt')

        this.$app = app
        this.$store = store
        this.$router = router
        this.$services = services

        this.init()
    }

    init () {
        this.$mqtt = Mqtt
    }

    /**
     * @param {string} key
     * @returns {ManagedMqttClient || null}
     */
    getManagedClient (key) {
        return this.$clients.get(key) || null
    }

    /**
     * @param {string} key
     * @returns {boolean}
     */
    hasClient (key) {
        return this.$clients.has(key)
    }

    async runClientOperation (key, operation) {
        const previous = this.$clientOperations.get(key) || Promise.resolve()

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

    /**
     * Remove and detach a managed connection without assuming it is still alive.
     * @param {string} key
     */
    async destroyClient (key) {
        await this.runClientOperation(key, async () => {
            await this._destroyClientUnlocked(key)
        })
    }

    /**
     * Create or replace a connection safely.
     * @param {string} key
     * @param {MqttConnectionOptions} options
     * @returns {Promise<import('mqtt').MqttClient>}
     */
    async createClient (key, options = {}) {
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

            // Replace the existing connection cleanly
            if (this.hasClient(key)) {
                await this._destroyClientUnlocked(key)
            }

            /** @type {ManagedMqttClient} */
            const managed = {
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
                reconnectTimer: null,
                subscriptions: new Map(),
                connectionWaiters: new Set(),
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
                await this.connectManagedClient(managed, false)
                return managed.client
            } catch (error) {
                this.$clients.delete(key)
                throw error
            }
        })
    }

    /**
     * Publish a message only when the connection is alive.
     * @param {string} key
     * @param {{topic: string, payload: unknown, qos?: number, retain?: boolean, onError?: Function | null, correlationData?: string | Buffer | Uint8Array | ArrayBuffer | null, userProperties?: Record<string, string | string[]> | null, serialize?: 'auto' | 'raw' | 'json' | 'string', waitForConnection?: boolean, connectionTimeout?: number}} options
     * @returns {Promise<void>}
     */
    async publishMessage (key, {
        topic,
        payload,
        qos = 2,
        retain,
        onError = null,
        correlationData = null,
        userProperties = null,
        serialize = 'auto',
        waitForConnection = false,
        connectionTimeout = 5000
    } = {}) {
        const managed = this.getManagedClient(key)

        if (!managed || managed.destroyed) {
            return Promise.reject(new Error(`MQTT connection "${key}" does not exist`))
        }

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

        let properties
        try {
            payload = this._normalizePublishPayload(payload, serialize)
            properties = this._normalizePublishProperties({
                correlationData,
                userProperties
            })
        } catch (error) {
            return Promise.reject(error)
        }

        const options = {
            qos,
            retain
        }

        if (properties) {
            options.properties = properties
        }

        if (waitForConnection) {
            try {
                await this.waitForConnection(key, { timeout: connectionTimeout })
            } catch (error) {
                if (typeof onError === 'function') onError(error)
                return Promise.reject(error)
            }
        }

        const { client } = managed

        if (managed.status === 'reconnecting' || !client?.connected) {
            return Promise.reject(new Error(`MQTT connection "${key}" is not connected`))
        }

        return new Promise((resolve, reject) => {
            client.publish(topic, payload, options, (err) => {
                if (err) {
                    if (typeof onError === 'function') onError(err)
                    reject(err)
                    return
                }
                resolve()
            })
        })
    }

    /**
     * Subscribe to topics on a managed connection.
     * @param {string} key
     * @param {string | string[]} topic
     * @param {Mqtt.ClientSubscribeOptions} [options]
     * @returns {Promise<void>}
     */
    subscribe (key, topic, options = {}) {
        const managed = this.$clients.get(key)
        if (!managed || managed.destroyed) {
            return Promise.reject(new Error(`MQTT connection "${key}" does not exist`))
        }

        if (!managed.client.connected) {
            return Promise.reject(new Error(`MQTT connection "${key}" is not connected`))
        }

        return new Promise((resolve, reject) => {
            managed.client.subscribe(topic, options, (err) => {
                if (err) {
                    reject(err)
                    return
                }
                this.rememberSubscriptions(managed, topic, options)
                resolve()
            })
        })
    }

    /**
     * Unsubscribe from topics on a managed connection.
     * @param {string} key
     * @param {string | string[]} topic
     * @returns {Promise<void>}
     */
    unsubscribe (key, topic) {
        const managed = this.getManagedClient(key)
        if (!managed || managed.destroyed) {
            return Promise.resolve()
        }

        if (!managed.client.connected) {
            return Promise.reject(new Error(`MQTT connection "${key}" is not connected`))
        }

        return new Promise((resolve, reject) => {
            managed.client.unsubscribe(topic, (err) => {
                if (err) {
                    reject(err)
                    return
                }
                this.forgetSubscriptions(managed, topic)
                resolve()
            })
        })
    }

    /**
     * End a specific connection and remove it from the registry.
     * @param {string} key
     * @returns {Promise<void>}
     */
    async endConnection (key) {
        await this.destroyClient(key)
    }

    /**
     * Destroy all managed connections and prevent further use.
     * @returns {Promise<void>}
     */
    async destroy () {
        this.$destroyed = true

        const keys = [...this.$clients.keys()]
        await Promise.all(keys.map(key => this.destroyClient(key)))

        this.$clients.clear()
        this.$mqtt = null
    }

    /**
     * Reset the service so it can be reused in tests or HMR.
     * @returns {Promise<void>}
     */
    async reset () {
        await this.destroy()
        this.$destroyed = false
        this.$mqtt = Mqtt
    }

    /**
     * @param {import('mqtt').MqttClient} client
     * @param {boolean} [force=true]
     * @returns {Promise<void>}
     */
    endMqttClient (client, force = true) {
        return new Promise((resolve, reject) => {
            client.end(force, undefined, (error) => {
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

    /**
     * @param {ManagedMqttClient} managed
     */
    clearReconnectTimer (managed) {
        if (managed.reconnectTimer) {
            clearTimeout(managed.reconnectTimer)
            managed.reconnectTimer = null
        }
    }

    /**
     * @param {ManagedMqttClient} managed
     */
    cleanupManagedListeners (managed) {
        for (const off of managed.listeners) {
            try {
                off()
            } catch (_) {
                // ignore listener cleanup failures
            }
        }
        managed.listeners.clear()
    }

    /**
     * @param {ManagedMqttClient} managed
     */
    resolveConnectionWaiters (managed) {
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

    /**
     * @param {ManagedMqttClient} managed
     * @param {Error} error
     */
    rejectConnectionWaiters (managed, error) {
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

    /**
     * @param {string} key
     * @param {{timeout?: number}} [options]
     * @returns {Promise<void>}
     */
    waitForConnection (key, { timeout = 5000 } = {}) {
        const managed = this.getManagedClient(key)
        if (!managed || managed.destroyed) {
            return Promise.reject(new Error(`MQTT connection "${key}" does not exist`))
        }

        if (!Number.isInteger(timeout) || timeout < 0) {
            return Promise.reject(new TypeError('MQTT waitForConnection timeout must be a non-negative integer'))
        }

        if (!managed.connectionWaiters) {
            managed.connectionWaiters = new Set()
        }

        if (managed.client?.connected && managed.status !== 'reconnecting') {
            return Promise.resolve()
        }

        return new Promise((resolve, reject) => {
            const waiter = {
                resolve: () => {
                    managed.connectionWaiters.delete(waiter)
                    resolve()
                },
                reject: (error) => {
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

    /**
     * @param {ManagedMqttClient} managed
     * @param {boolean} isReconnect
     * @returns {Promise<import('mqtt').MqttClient>}
     */
    async connectManagedClient (managed, isReconnect) {
        if (managed.destroyed || this.$destroyed) {
            throw new Error(`${managed.destroyed ? 'Client' : 'MqttService'} has been destroyed`)
        }

        managed.status = isReconnect ? 'reconnecting' : 'connecting'

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
            } catch (_) {
                // ignore stale client close failures before replacement
            }
        }

        const client = this.$mqtt.connect(credentials.url, {
            username: credentials.username,
            password: credentials.password,
            clientId: credentials.clientId,
            reconnectPeriod: 0,
            protocolVersion: 5
        })

        managed.client = client
        this.bindManagedListeners(managed, client)

        return client
    }

    /**
     * @param {ManagedMqttClient} managed
     * @param {import('mqtt').MqttClient} client
     */
    bindManagedListeners (managed, client) {
        const register = (eventName, handler) => {
            const wrapped = (...args) => {
                if (managed.destroyed || this.$destroyed || managed.client !== client) return
                handler(...args)
            }
            client.on(eventName, wrapped)
            managed.listeners.add(() => client.off(eventName, wrapped))
        }

        register('connect', async () => {
            managed.status = 'connected'
            managed.reconnectAttempt = 0
            this.clearReconnectTimer(managed)
            this.resolveConnectionWaiters(managed)

            try {
                await this.replaySubscriptions(managed, client)
            } catch (error) {
                managed.handlers.onError?.(error, client)
            }

            if (typeof managed.handlers.onConnect === 'function') {
                managed.handlers.onConnect(client)
            }
        })

        register('close', () => {
            managed.status = 'disconnected'
            if (typeof managed.handlers.onClose === 'function') {
                managed.handlers.onClose(client)
            }
            this.scheduleReconnect(managed)
        })

        register('offline', () => {
            managed.status = 'disconnected'
            if (typeof managed.handlers.onOffline === 'function') {
                managed.handlers.onOffline(client)
            }
            this.scheduleReconnect(managed)
        })

        register('error', (error) => {
            if (typeof managed.handlers.onError === 'function') {
                managed.handlers.onError(error, client)
            }
        })

        register('message', (topic, message, packet) => {
            if (typeof managed.handlers.onMessage === 'function') {
                managed.handlers.onMessage(topic, message, packet, client)
            }
        })
    }

    /**
     * @param {ManagedMqttClient} managed
     */
    scheduleReconnect (managed) {
        if (
            managed.destroyed ||
            this.$destroyed ||
            managed.intentionalDisconnect ||
            !managed.reconnectPolicy.enabled ||
            managed.reconnectTimer
        ) {
            return
        }

        const attempt = managed.reconnectAttempt
        const delay = Math.min(
            managed.reconnectPolicy.maxDelay,
            managed.reconnectPolicy.initialDelay * Math.pow(managed.reconnectPolicy.factor, attempt)
        )

        managed.reconnectAttempt += 1
        managed.status = 'reconnecting'
        managed.reconnectTimer = setTimeout(() => {
            managed.reconnectTimer = null
            this.reconnectClient(managed.key)
        }, delay)
    }

    /**
     * @param {string} key
     * @returns {Promise<void>}
     */
    async reconnectClient (key) {
        await this.runClientOperation(key, async () => {
            const managed = this.$clients.get(key)
            if (!managed || managed.destroyed || managed.intentionalDisconnect || this.$destroyed) {
                return
            }

            try {
                await this.connectManagedClient(managed, true)
            } catch (error) {
                managed.status = 'failed'
                if (typeof managed.handlers.onError === 'function') {
                    managed.handlers.onError(error, managed.client)
                }
                this.scheduleReconnect(managed)
            }
        })
    }

    /**
     * @param {ManagedMqttClient} managed
     * @param {string | string[]} topic
     * @param {Mqtt.ClientSubscribeOptions} options
     */
    rememberSubscriptions (managed, topic, options = {}) {
        if (!managed.subscriptions) {
            managed.subscriptions = new Map()
        }
        const topics = Array.isArray(topic) ? topic : [topic]
        for (const topicName of topics) {
            managed.subscriptions.set(topicName, {
                topic: topicName,
                options: { ...options }
            })
        }
    }

    /**
     * @param {ManagedMqttClient} managed
     * @param {string | string[]} topic
     */
    forgetSubscriptions (managed, topic) {
        if (!managed.subscriptions) {
            managed.subscriptions = new Map()
        }
        const topics = Array.isArray(topic) ? topic : [topic]
        for (const topicName of topics) {
            managed.subscriptions.delete(topicName)
        }
    }

    /**
     * @param {ManagedMqttClient} managed
     * @param {import('mqtt').MqttClient} client
     * @returns {Promise<void>}
     */
    async replaySubscriptions (managed, client) {
        if (!managed.subscriptions) {
            managed.subscriptions = new Map()
        }
        const subscriptions = [...managed.subscriptions.values()]
        if (!subscriptions.length || managed.client !== client || !client.connected) {
            return
        }

        await Promise.all(subscriptions.map(({
            topic,
            options
        }) => {
            return new Promise((resolve, reject) => {
                client.subscribe(topic, options, (err) => {
                    if (err) {
                        reject(err)
                        return
                    }
                    resolve()
                })
            })
        }))
    }

    /**
     * @param {string} key
     * @param {MqttConnectionOptions['getCredentials']} getCredentials
     * @returns {ManagedMqttClient['getCredentials']}
     */
    _buildCredentialsProvider (key, getCredentials) {
        return async () => {
            const credentials = await getCredentials()
            if (!credentials || typeof credentials !== 'object') {
                throw new Error(`MQTT credential provider for connection "${key}" must resolve to an object`)
            }

            if (!this._isValidUrl(credentials.url)) {
                throw new Error(`MQTT credential provider for connection "${key}" must return a valid url`)
            }

            if (typeof credentials.username !== 'string' || !credentials.username.trim()) {
                throw new Error(`MQTT credential provider for connection "${key}" must return a non-empty username`)
            }

            if (typeof credentials.password !== 'string' || !credentials.password.trim()) {
                throw new Error(`MQTT credential provider for connection "${key}" must return a non-empty password`)
            }

            if (
                credentials.clientId !== undefined &&
                (typeof credentials.clientId !== 'string' || !credentials.clientId.trim())
            ) {
                throw new Error(`MQTT credential provider for connection "${key}" must return a non-empty clientId when provided`)
            }

            return credentials
        }
    }

    /**
     * Internal destroy helper that assumes per-key serialization is already handled.
     * @param {string} key
     */
    async _destroyClientUnlocked (key) {
        const managed = this.$clients.get(key)
        if (!managed) return

        managed.destroyed = true
        managed.intentionalDisconnect = true
        managed.status = 'disconnected'

        this.clearReconnectTimer(managed)
        this.rejectConnectionWaiters(managed, new Error(`MQTT connection "${key}" has been closed`))

        const {
            client,
            listeners
        } = managed

        for (const off of listeners) {
            try {
                off()
            } catch (_) {
                // ignore listener cleanup failures
            }
        }

        if (client) {
            try {
                await this.endMqttClient(client, true)
            } catch (_) {
                // ignore close failures during cleanup
            }
        }

        this.$clients.delete(key)
    }

    /**
     * @param {unknown} error
     * @returns {boolean}
     */
    _isIgnorableClientCloseError (error) {
        return (
            error instanceof Error &&
            typeof error.message === 'string' &&
            ['Connection closed', 'client disconnecting', 'client disconnected'].includes(error.message)
        )
    }

    /**
     * @param {unknown} value
     * @returns {boolean}
     */
    _isPlainObject (value) {
        if (value === null || typeof value !== 'object') return false
        const prototype = Object.getPrototypeOf(value)
        return prototype === Object.prototype || prototype === null
    }

    /**
     * @param {unknown} url
     * @returns {boolean}
     */
    _isValidUrl (url) {
        if (typeof url !== 'string' || !url.trim()) return false

        try {
            const parsed = new URL(url)
            return ['mqtt:', 'mqtts:', 'ws:', 'wss:'].includes(parsed.protocol)
        } catch (_) {
            return false
        }
    }

    /**
     * @param {unknown} payload
     * @returns {boolean}
     */
    _isBinaryPayload (payload) {
        return (
            (typeof Buffer !== 'undefined' && Buffer.isBuffer(payload)) ||
            payload instanceof Uint8Array ||
            payload instanceof ArrayBuffer
        )
    }

    /**
     * @param {{reconnect?: MqttConnectionOptions['reconnect'], reconnectPeriod?: number, hasDynamicCredentials?: boolean}} options
     * @returns {ManagedMqttClient['reconnectPolicy']}
     */
    _normalizeReconnectPolicy ({
        reconnect,
        reconnectPeriod = 0,
        hasDynamicCredentials = false
    } = {}) {
        const initialDelay = Number.isFinite(reconnect?.initialDelay) && reconnect.initialDelay >= 0
            ? reconnect.initialDelay
            : (Number.isFinite(reconnectPeriod) && reconnectPeriod >= 0 ? reconnectPeriod : 1000)

        const maxDelay = Number.isFinite(reconnect?.maxDelay) && reconnect.maxDelay >= initialDelay
            ? reconnect.maxDelay
            : Math.max(initialDelay, 30000)

        const factor = Number.isFinite(reconnect?.factor) && reconnect.factor >= 1
            ? reconnect.factor
            : 2

        const enabled = reconnect?.enabled ?? hasDynamicCredentials ?? initialDelay > 0

        return {
            enabled,
            initialDelay,
            maxDelay,
            factor
        }
    }

    /**
     * @param {unknown} payload
     * @param {'auto' | 'raw' | 'json' | 'string'} [serialize='auto']
     * @returns {string | Buffer | Uint8Array}
     */
    _normalizePublishPayload (payload, serialize = 'auto') {
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

        // auto
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

    /**
     * @param {{correlationData: unknown, userProperties: unknown}} properties
     * @returns {{correlationData?: Buffer | Uint8Array, userProperties?: Record<string, string | string[]>} | undefined}
     */
    _normalizePublishProperties ({
        correlationData,
        userProperties
    }) {
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

    /**
     * @param {unknown} correlationData
     * @returns {Buffer | Uint8Array | undefined}
     */
    _normalizeCorrelationData (correlationData) {
        if (correlationData === null || correlationData === undefined) {
            return undefined
        }

        if (typeof correlationData === 'string') {
            return typeof Buffer !== 'undefined'
                ? Buffer.from(correlationData)
                : new TextEncoder().encode(correlationData)
        }

        if (this._isBinaryPayload(correlationData)) {
            return this._normalizeBinaryPayload(correlationData)
        }

        throw new TypeError('MQTT publish correlationData must be a string or binary value')
    }

    /**
     * @param {unknown} userProperties
     * @returns {Record<string, string | string[]> | undefined}
     */
    _normalizeUserProperties (userProperties) {
        if (userProperties === null || userProperties === undefined) {
            return undefined
        }

        if (!this._isPlainObject(userProperties)) {
            throw new TypeError('MQTT publish userProperties must be a plain object')
        }

        const normalized = {}
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

    /**
     * @param {Buffer | Uint8Array | ArrayBuffer} payload
     * @returns {Buffer | Uint8Array}
     */
    _normalizeBinaryPayload (payload) {
        if (typeof Buffer !== 'undefined' && Buffer.isBuffer(payload)) {
            return payload
        }

        if (payload instanceof ArrayBuffer) {
            if (typeof Buffer !== 'undefined') {
                return Buffer.from(payload)
            }
            return new Uint8Array(payload)
        }

        if (typeof Buffer !== 'undefined') {
            return Buffer.from(payload.buffer, payload.byteOffset, payload.byteLength)
        }

        return payload
    }

    /**
     * @param {unknown} payload
     * @param {'auto' | 'json'} mode
     * @returns {string}
     */
    _stringifyPayload (payload, mode) {
        try {
            return JSON.stringify(payload)
        } catch (error) {
            throw new TypeError(`Failed to serialize MQTT payload in "${mode}" mode: ${error.message}`)
        }
    }
}

let MqttServiceInstance = null

/**
 * Get or create the MQTT service singleton instance.
 * @param {{app: import('vue').App, store: import('vuex').Store, router: import('vue-router').Router, services?: Object}} options
 * @returns {MqttService}
 */
export function createMqttService ({
    app,
    store,
    router,
    services = {}
} = {}) {
    if (!MqttServiceInstance) {
        MqttServiceInstance = new MqttService({
            app,
            store,
            router,
            services
        })
    }

    return MqttServiceInstance
}

/**
 * @returns {Promise<void>}
 */
export async function destroyMqttService () {
    if (!MqttServiceInstance) return
    await MqttServiceInstance.destroy()
    MqttServiceInstance = null
}

/**
 * @returns {MqttService}
 */
export default createMqttService
