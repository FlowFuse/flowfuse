import Mqtt from 'mqtt'

import { BaseService } from './service.contract.js'

/**
 * @typedef {import('mqtt').MqttClient} MqttJsClient
 * @typedef {import('mqtt').IPublishPacket} MqttJsPublishPacket
 * @typedef {import('mqtt').IClientSubscribeOptions} MqttJsSubscribeOptions
 */

/**
 * @typedef {Object} MqttCredentials
 * @property {string} url - Broker URL using the `mqtt`, `mqtts`, `ws`, or `wss` protocol.
 * @property {string} username - Username used to authenticate the MQTT client.
 * @property {string} password - Password used to authenticate the MQTT client.
 * @property {string} [clientId] - Optional explicit MQTT client identifier.
 */

/**
 * @typedef {() => Promise<MqttCredentials>} MqttCredentialProvider
 */

/**
 * @typedef {Object} MqttReconnectOptions
 * @property {boolean} [enabled] - Enables reconnection scheduling for the managed client.
 * @property {number} [initialDelay] - Delay in milliseconds before the first reconnect attempt.
 * @property {number} [maxDelay] - Upper bound in milliseconds for exponential reconnect backoff.
 * @property {number} [factor] - Exponential backoff multiplier applied after each failure.
 */

/**
 * @typedef {Object} MqttReconnectPolicy
 * @property {boolean} enabled - Whether reconnect scheduling is currently enabled.
 * @property {number} initialDelay - Delay in milliseconds before the first reconnect attempt.
 * @property {number} maxDelay - Maximum delay in milliseconds allowed between reconnect attempts.
 * @property {number} factor - Exponential backoff multiplier applied between reconnect attempts.
 */

/**
 * @typedef {Object} MqttConnectionHandlers
 * @property {(client: MqttJsClient) => void} [onConnect] - Invoked after the broker reports a successful connection.
 * @property {(client: MqttJsClient) => void} [onClose] - Invoked after the active client closes.
 * @property {(client: MqttJsClient) => void} [onOffline] - Invoked after the active client transitions offline.
 * @property {(error: Error, client: MqttJsClient | null) => void} [onError] - Invoked when the connection or lifecycle emits an error.
 * @property {(topic: string, message: Buffer, packet: MqttJsPublishPacket, client: MqttJsClient) => void} [onMessage] - Invoked for incoming MQTT messages.
 */

/**
 * @typedef {Object} MqttPublishRequest
 * @property {string} topic - Exact publish topic. Wildcards are not allowed.
 * @property {unknown} payload - Message payload before serialization.
 * @property {0 | 1 | 2} [qos=2] - MQTT QoS level for the publish request.
 * @property {boolean} [retain] - Whether the broker should retain the published payload.
 * @property {((error: Error) => void) | null} [onError] - Optional error callback invoked when publish preparation or delivery fails.
 * @property {string | Buffer | Uint8Array | ArrayBuffer | null} [correlationData] - Optional MQTT v5 correlation data.
 * @property {Record<string, string | string[]> | null} [userProperties] - Optional MQTT v5 user properties.
 * @property {'auto' | 'raw' | 'json' | 'string'} [serialize='auto'] - Serialization mode used to normalize the payload before publish.
 * @property {boolean} [waitForConnection=true] - Wait for the managed connection to become ready before publishing.
 * @property {number} [connectionTimeout=5000] - Maximum time in milliseconds to wait for a live connection.
 */

/**
 * @typedef {Object} MqttWaitForConnectionOptions
 * @property {number} [timeout=5000] - Maximum time in milliseconds to wait for the connection to become active.
 */

/**
 * @typedef {Object} MqttNormalizedPublishProperties
 * @property {Buffer | Uint8Array} [correlationData] - Normalized MQTT v5 correlation data.
 * @property {Record<string, string | string[]>} [userProperties] - Normalized MQTT v5 user properties.
 */

/**
 * @typedef {() => void} ManagedMqttListenerCleanup
 */

/**
 * @typedef {Object} ManagedMqttSubscription
 * @property {string} topic - Topic filter to restore after reconnecting.
 * @property {MqttJsSubscribeOptions} options - Subscribe options originally used for the topic.
 */

/**
 * @typedef {Object} MqttConnectionWaiter
 * @property {() => void} resolve - Resolves a pending wait-for-connection promise.
 * @property {(error: Error) => void} reject - Rejects a pending wait-for-connection promise.
 * @property {ReturnType<typeof setTimeout> | null} timer - Timeout handle used to fail the waiter if it takes too long.
 */

/**
 * @typedef {Object} MqttServiceOptions
 * @property {import('vue').App} app - Vue application instance that owns the service.
 * @property {import('vuex').Store} store - Vuex store instance shared across the frontend.
 * @property {import('vue-router').Router} router - Vue Router instance for navigation-aware integrations.
 * @property {Record<string, unknown>} [services={}] - Service registry used for cross-service coordination.
 */

/**
 * @typedef {Object} MqttConnectionOptions
 * @property {number} [reconnectPeriod=0] - Legacy reconnect base delay in milliseconds when no explicit reconnect policy is provided.
 * @property {MqttCredentialProvider} getCredentials - Async callback that returns fresh broker credentials for each connection attempt.
 * @property {MqttReconnectOptions} [reconnect] - Reconnect policy overrides for the managed connection.
 * @property {(client: MqttJsClient) => void} [onConnect] - Lifecycle callback fired when the client connects.
 * @property {(client: MqttJsClient) => void} [onClose] - Lifecycle callback fired when the client closes.
 * @property {(client: MqttJsClient) => void} [onOffline] - Lifecycle callback fired when the client goes offline.
 * @property {(error: Error, client: MqttJsClient | null) => void} [onError] - Lifecycle callback fired when an error occurs.
 * @property {(topic: string, message: Buffer, packet: MqttJsPublishPacket, client: MqttJsClient) => void} [onMessage] - Lifecycle callback fired for inbound messages.
 */

/**
 * @typedef {Object} ManagedMqttClient
 * @property {string} key - Stable identifier used to store and retrieve the managed connection.
 * @property {MqttJsClient | null} client - Active mqtt.js client instance for this managed connection.
 * @property {Set<ManagedMqttListenerCleanup>} listeners - Registered listener cleanup callbacks for the active client.
 * @property {boolean} destroyed - Indicates that the managed connection has been permanently torn down.
 * @property {boolean} intentionalDisconnect - Marks whether the last disconnect was initiated by service cleanup.
 * @property {'idle' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'failed'} status - Current lifecycle state of the managed connection.
 * @property {MqttCredentialProvider} getCredentials - Credential provider invoked before each connection attempt.
 * @property {MqttReconnectPolicy} reconnectPolicy - Effective reconnect policy currently applied to the connection.
 * @property {number} reconnectAttempt - Number of reconnect attempts that have been scheduled since the last successful connect.
 * @property {ReturnType<typeof setTimeout> | null} reconnectTimer - Pending reconnect timer, if one is currently scheduled.
 * @property {Map<string, ManagedMqttSubscription>} subscriptions - Remembered subscriptions used to replay topics after reconnects.
 * @property {MqttConnectionHandlers} handlers - Lifecycle handlers bound to this managed connection.
 * @property {Set<MqttConnectionWaiter>} connectionWaiters - Pending callers waiting for the connection to become usable.
 */

class MqttService extends BaseService {
    /**
     * Vue application instance that owns the service lifecycle.
     * @type {import('vue').App}
     */
    $app

    /**
     * Shared Vuex store instance.
     * @type {import('vuex').Store}
     */
    $store

    /**
     * Shared Vue Router instance.
     * @type {import('vue-router').Router}
     */
    $router

    /**
     * Registry of sibling services available for coordination.
     * @type {Record<string, unknown>}
     */
    $services

    /**
     * mqtt.js module reference used to create clients.
     * @type {typeof import('mqtt') | null}
     */
    $mqtt = null

    /**
     * Managed MQTT connections indexed by their logical key.
     * @type {Map<string, ManagedMqttClient>}
     */
    $clients = new Map()

    /**
     * Per-key operation queue used to serialize lifecycle operations.
     * @type {Map<string, Promise<unknown>>}
     */
    $clientOperations = new Map()

    /**
     * Marks the service as unusable after teardown.
     * @type {boolean}
     */
    $destroyed = false

    /**
     * Create the MQTT service with the shared frontend dependencies.
     * @param {MqttServiceOptions} options - Dependencies injected by the frontend service container.
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

    /**
     * Initialize the mqtt.js module reference used by this service instance.
     * @returns {void}
     */
    init () {
        this.$mqtt = Mqtt
    }

    /**
     * Return the managed connection record for a given key.
     * @param {string} key - Logical connection identifier.
     * @returns {ManagedMqttClient | null} Managed client state or `null` when the key is unknown.
     */
    getManagedClient (key) {
        return this.$clients.get(key) || null
    }

    /**
     * Check whether a managed connection exists for the given key.
     * @param {string} key - Logical connection identifier.
     * @returns {boolean} `true` when a managed connection exists for the key.
     */
    hasClient (key) {
        return this.$clients.has(key)
    }

    /**
     * Queue a lifecycle operation so only one operation runs at a time for a given connection key.
     * @template T
     * @param {string} key - Logical connection identifier.
     * @param {() => Promise<T> | T} operation - Operation to execute after any previous queued work completes.
     * @returns {Promise<T>} Result of the queued operation.
     */
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
     * @param {string} key - Logical connection identifier.
     * @returns {Promise<void>} Resolves once cleanup for the keyed connection finishes.
     */
    async destroyClient (key) {
        await this.runClientOperation(key, async () => {
            await this._destroyClientUnlocked(key)
        })
    }

    /**
     * Create or replace a connection safely.
     * @param {string} key - Logical connection identifier.
     * @param {MqttConnectionOptions} [options={}] - Connection settings and lifecycle callbacks.
     * @returns {Promise<MqttJsClient>} Newly created mqtt.js client instance.
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
                return await this.connectManagedClient(managed, false)
            } catch (error) {
                this.$clients.delete(key)
                throw error
            }
        })
    }

    /**
     * Publish a message only when the connection is alive.
     * @param {string} key - Logical connection identifier.
     * @param {MqttPublishRequest} [options={}] - Publish request details.
     * @returns {Promise<void>} Resolves after the broker accepts the publish request.
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
        waitForConnection = true,
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
     * @param {string} key - Logical connection identifier.
     * @param {string | string[]} topic - Topic filter or filters to subscribe to.
     * @param {MqttJsSubscribeOptions} [options={}] - mqtt.js subscribe options applied to each topic.
     * @returns {Promise<void>} Resolves after the broker acknowledges the subscription.
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
     * @param {string} key - Logical connection identifier.
     * @param {string | string[]} topic - Topic filter or filters to unsubscribe from.
     * @returns {Promise<void>} Resolves after the broker acknowledges the unsubscribe.
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
     * @param {string} key - Logical connection identifier.
     * @returns {Promise<void>} Resolves once the connection has been destroyed and deregistered.
     */
    async endConnection (key) {
        await this.destroyClient(key)
    }

    /**
     * Destroy all managed connections and prevent further use.
     * @returns {Promise<void>} Resolves after every managed connection has been cleaned up.
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
     * @returns {Promise<void>} Resolves after cleanup and module reinitialization complete.
     */
    async reset () {
        await this.destroy()
        this.$destroyed = false
        this.$mqtt = Mqtt
    }

    /**
     * Close an mqtt.js client and treat common double-close errors as harmless.
     * @param {MqttJsClient} client - Active mqtt.js client instance.
     * @param {boolean} [force=true] - Whether to force-close the client immediately.
     * @returns {Promise<void>} Resolves once the client finishes closing.
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
     * Cancel any pending reconnect timer for the managed connection.
     * @param {ManagedMqttClient} managed - Managed connection state to update.
     * @returns {void}
     */
    clearReconnectTimer (managed) {
        if (managed.reconnectTimer) {
            clearTimeout(managed.reconnectTimer)
            managed.reconnectTimer = null
        }
    }

    /**
     * Remove all event listeners currently registered for the managed connection.
     * @param {ManagedMqttClient} managed - Managed connection state to clean up.
     * @returns {void}
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
     * Resolve every pending caller waiting for this connection to become ready.
     * @param {ManagedMqttClient} managed - Managed connection state that owns the waiters.
     * @returns {void}
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
     * Reject every pending caller waiting for this connection to become ready.
     * @param {ManagedMqttClient} managed - Managed connection state that owns the waiters.
     * @param {Error} error - Error reported to each pending waiter.
     * @returns {void}
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
     * Wait until a managed connection becomes active or the timeout elapses.
     * @param {string} key - Logical connection identifier.
     * @param {MqttWaitForConnectionOptions} [options={}] - Wait behavior overrides.
     * @returns {Promise<void>} Resolves when the connection is active.
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
     * Create a fresh mqtt.js client for a managed connection and bind its listeners.
     * @param {ManagedMqttClient} managed - Managed connection state to connect.
     * @param {boolean} isReconnect - Whether this call is part of the reconnect flow.
     * @returns {Promise<MqttJsClient>} Fresh mqtt.js client instance bound to the managed state.
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
     * Bind lifecycle listeners for the active mqtt.js client.
     * @param {ManagedMqttClient} managed - Managed connection state that owns the client.
     * @param {MqttJsClient} client - Active mqtt.js client instance.
     * @returns {void}
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
     * Schedule a reconnect attempt using the managed connection's backoff policy.
     * @param {ManagedMqttClient} managed - Managed connection state to reconnect.
     * @returns {void}
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
     * Reconnect a managed client if it still exists and reconnects remain enabled.
     * @param {string} key - Logical connection identifier.
     * @returns {Promise<void>} Resolves after the reconnect attempt has been processed.
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
     * Store subscription details so they can be replayed after reconnecting.
     * @param {ManagedMqttClient} managed - Managed connection state that owns the subscriptions.
     * @param {string | string[]} topic - Topic filter or filters to remember.
     * @param {MqttJsSubscribeOptions} [options={}] - Subscribe options to store alongside each topic.
     * @returns {void}
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
     * Remove remembered subscriptions for the provided topic filters.
     * @param {ManagedMqttClient} managed - Managed connection state that owns the subscriptions.
     * @param {string | string[]} topic - Topic filter or filters to forget.
     * @returns {void}
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
     * Replay remembered subscriptions after the client reconnects.
     * @param {ManagedMqttClient} managed - Managed connection state that owns the subscriptions.
     * @param {MqttJsClient} client - Newly connected mqtt.js client instance.
     * @returns {Promise<void>} Resolves after all remembered subscriptions are restored.
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
     * Wrap the credential provider with validation so invalid credentials fail fast.
     * @param {string} key - Logical connection identifier.
     * @param {MqttCredentialProvider} getCredentials - Raw credential provider supplied by the caller.
     * @returns {MqttCredentialProvider} Validated credential provider.
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
     * @param {string} key - Logical connection identifier.
     * @returns {Promise<void>} Resolves once teardown for the keyed connection completes.
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
     * Check whether an MQTT client close error can be safely ignored during cleanup.
     * @param {unknown} error - Candidate close error.
     * @returns {boolean} `true` when the error matches a known harmless close condition.
     */
    _isIgnorableClientCloseError (error) {
        return (
            error instanceof Error &&
            typeof error.message === 'string' &&
            ['Connection closed', 'client disconnecting', 'client disconnected'].includes(error.message)
        )
    }

    /**
     * Check whether a value is a plain object suitable for JSON serialization or user properties.
     * @param {unknown} value - Value to inspect.
     * @returns {boolean} `true` when the value is a plain object.
     */
    _isPlainObject (value) {
        if (value === null || typeof value !== 'object') return false
        const prototype = Object.getPrototypeOf(value)
        return prototype === Object.prototype || prototype === null
    }

    /**
     * Validate that a value is a supported MQTT broker URL.
     * @param {unknown} url - Value to inspect.
     * @returns {boolean} `true` when the value is a supported MQTT broker URL.
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
     * Check whether a payload is already represented as binary data.
     * @param {unknown} payload - Payload candidate to inspect.
     * @returns {boolean} `true` when the payload is binary data accepted by mqtt.js.
     */
    _isBinaryPayload (payload) {
        return (
            (typeof Buffer !== 'undefined' && Buffer.isBuffer(payload)) ||
            payload instanceof Uint8Array ||
            payload instanceof ArrayBuffer
        )
    }

    /**
     * Normalize caller-provided reconnect settings into the internal reconnect policy shape.
     * @param {{reconnect?: MqttReconnectOptions, reconnectPeriod?: number, hasDynamicCredentials?: boolean}} [options={}] - Raw reconnect inputs.
     * @returns {MqttReconnectPolicy} Normalized reconnect policy.
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
     * Normalize a publish payload according to the requested serialization mode.
     * @param {unknown} payload - Raw payload supplied by the caller.
     * @param {'auto' | 'raw' | 'json' | 'string'} [serialize='auto'] - Serialization mode used to convert the payload.
     * @returns {string | Buffer | Uint8Array} Normalized payload ready for mqtt.js publishing.
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
     * Normalize MQTT v5 publish properties accepted by this service.
     * @param {{correlationData: unknown, userProperties: unknown}} properties - Raw publish properties to normalize.
     * @returns {MqttNormalizedPublishProperties | undefined} Normalized MQTT v5 publish properties, if any were provided.
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
     * Normalize correlation data into the binary form expected by mqtt.js.
     * @param {unknown} correlationData - Raw correlation data value.
     * @returns {Buffer | Uint8Array | undefined} Normalized correlation data or `undefined` when omitted.
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
     * Normalize MQTT v5 user properties and validate their value types.
     * @param {unknown} userProperties - Raw user properties object.
     * @returns {Record<string, string | string[]> | undefined} Normalized user properties or `undefined` when omitted.
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
     * Convert binary payload variants into a consistent representation for mqtt.js.
     * @param {Buffer | Uint8Array | ArrayBuffer} payload - Binary payload to normalize.
     * @returns {Buffer | Uint8Array} Normalized binary payload.
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
     * Serialize a payload to JSON while exposing the serialization mode in any thrown error.
     * @param {unknown} payload - Raw payload to serialize.
     * @param {'auto' | 'json'} mode - Serialization mode name used for error reporting.
     * @returns {string} JSON string representation of the payload.
     */
    _stringifyPayload (payload, mode) {
        try {
            return JSON.stringify(payload)
        } catch (error) {
            throw new TypeError(`Failed to serialize MQTT payload in "${mode}" mode: ${error.message}`)
        }
    }
}

/**
 * Singleton MQTT service instance shared across the frontend app.
 * @type {MqttService | null}
 */
let MqttServiceInstance = null

/**
 * Get or create the MQTT service singleton instance.
 * @param {MqttServiceOptions} [options={}] - Dependencies injected by the frontend service container.
 * @returns {MqttService} Shared MQTT service instance.
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
 * Destroy the MQTT service singleton and all managed connections.
 * @returns {Promise<void>} Resolves once the singleton has been fully destroyed.
 */
export async function destroyMqttService () {
    if (!MqttServiceInstance) return
    await MqttServiceInstance.destroy()
    MqttServiceInstance = null
}

/**
 * Default factory export for retrieving the shared MQTT service instance.
 * @returns {MqttService} Shared MQTT service instance.
 */
export default createMqttService
