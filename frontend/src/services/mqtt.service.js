import Mqtt from 'mqtt'

/**
 * @typedef {Object} MqttConnectionOptions
 * @property {string} url
 * @property {string} [username]
 * @property {string} [password]
 * @property {number} [reconnectPeriod=0]
 * @property {string} [clientId]
 * @property {(client: import('mqtt').Client) => void} [onConnect]
 * @property {(client: import('mqtt').Client) => void} [onClose]
 * @property {(client: import('mqtt').Client) => void} [onOffline]
 * @property {(error: Error, client: import('mqtt').MqttClient) => void} [onError]
 * @property {(topic: string, message: Buffer, packet: any, client: import('mqtt').MqttClient) => void} [onMessage]
 */

/**
 * @typedef {Object} ManagedMqttClient
 * @property {string} key
 * @property {import('mqtt').Client} client
 * @property {Set<Function>} listeners
 * @property {boolean} destroyed
 */

class MqttService {
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

    /**
     * @param {unknown} url
     * @returns {boolean}
     */
    isValidUrl (url) {
        if (typeof url !== 'string' || !url.trim()) return false

        try {
            const parsed = new URL(url)
            return ['mqtt:', 'mqtts:', 'ws:', 'wss:'].includes(parsed.protocol)
        } catch (_) {
            return false
        }
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
     * Internal destroy helper that assumes per-key serialization is already handled.
     * @param {string} key
     */
    async _destroyClientUnlocked (key) {
        const managed = this.$clients.get(key)
        if (!managed) return

        managed.destroyed = true

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

        try {
            await new Promise((resolve, reject) => {
                client.end(true, undefined, (error) => {
                    if (error) {
                        reject(error)
                        return
                    }
                    resolve()
                })
            })
        } catch (_) {
            // ignore close failures during cleanup
        }

        this.$clients.delete(key)
    }

    /**
     * Create or replace a connection safely.
     * @param {string} key
     * @param {MqttConnectionOptions} options
     * @returns {Promise<import('mqtt').MqttClient>}
     */
    async createClient (key, options = {}) {
        const {
            url,
            username,
            password,
            reconnectPeriod = 0,
            onConnect,
            onClose,
            onOffline,
            onError,
            onMessage,
            clientId
        } = options

        if (!key || typeof key !== 'string') {
            throw new Error('MQTT connection key is required')
        }

        if (!this.isValidUrl(url)) {
            throw new Error(`Invalid MQTT url for connection "${key}"`)
        }

        return this.runClientOperation(key, async () => {
            if (this.$destroyed) {
                throw new Error('MqttService has been destroyed')
            }

            // Replace the existing connection cleanly
            if (this.hasClient(key)) {
                await this._destroyClientUnlocked(key)
            }

            const client = this.$mqtt.connect(url, {
                username,
                password,
                reconnectPeriod,
                clientId,
                protocolVersion: 5
            })

            /** @type {ManagedMqttClient} */
            const managed = {
                key,
                client,
                listeners: new Set(),
                destroyed: false
            }

            const register = (eventName, handler) => {
                if (typeof handler !== 'function') return
                const wrapped = (...args) => {
                    if (managed.destroyed || this.$destroyed) return
                    handler(...args, client)
                }
                client.on(eventName, wrapped)
                managed.listeners.add(() => client.off(eventName, wrapped))
            }

            if (onConnect) register('connect', onConnect)
            if (onClose) register('close', onClose)
            if (onOffline) register('offline', onOffline)
            if (onError) register('error', onError)
            if (onMessage) register('message', onMessage)

            this.$clients.set(key, managed)

            return client
        })
    }

    /**
     * Publish a message only when the connection is alive.
     * @param {string} key
     * @param {{topic: string, payload: unknown, qos?: number, retain?: boolean, onError?: Function | null, correlationData?: string | Buffer | Uint8Array | ArrayBuffer | null, userProperties?: Record<string, string | string[]> | null, serialize?: 'auto' | 'raw' | 'json' | 'string'}} options
     * @returns {Promise<void>}
     */
    publishMessage (key, {
        topic,
        payload,
        qos = 2,
        retain,
        onError = null,
        correlationData = null,
        userProperties = null,
        serialize = 'auto'
    } = {}) {
        const managed = this.getManagedClient(key)

        if (!managed || managed.destroyed) {
            return Promise.reject(new Error(`MQTT connection "${key}" does not exist`))
        }

        const { client } = managed

        if (!client.connected) {
            return Promise.reject(new Error(`MQTT connection "${key}" is not connected`))
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

        let properties
        try {
            payload = this.normalizePublishPayload(payload, serialize)
            properties = this.normalizePublishProperties({ correlationData, userProperties })
        } catch (error) {
            return Promise.reject(error)
        }

        const options = { qos, retain }

        if (properties) {
            options.properties = properties
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
     * @param {unknown} value
     * @returns {boolean}
     */
    isPlainObject (value) {
        if (value === null || typeof value !== 'object') return false
        const prototype = Object.getPrototypeOf(value)
        return prototype === Object.prototype || prototype === null
    }

    /**
     * @param {unknown} payload
     * @returns {boolean}
     */
    isBinaryPayload (payload) {
        return (
            (typeof Buffer !== 'undefined' && Buffer.isBuffer(payload)) ||
            payload instanceof Uint8Array ||
            payload instanceof ArrayBuffer
        )
    }

    /**
     * @param {Buffer | Uint8Array | ArrayBuffer} payload
     * @returns {Buffer | Uint8Array}
     */
    normalizeBinaryPayload (payload) {
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
    stringifyPayload (payload, mode) {
        try {
            return JSON.stringify(payload)
        } catch (error) {
            throw new TypeError(`Failed to serialize MQTT payload in "${mode}" mode: ${error.message}`)
        }
    }

    /**
     * @param {unknown} payload
     * @param {'auto' | 'raw' | 'json' | 'string'} [serialize='auto']
     * @returns {string | Buffer | Uint8Array}
     */
    normalizePublishPayload (payload, serialize = 'auto') {
        if (!['auto', 'raw', 'json', 'string'].includes(serialize)) {
            throw new TypeError(`Invalid MQTT payload serialization mode: "${serialize}"`)
        }

        if (serialize === 'json') {
            return this.stringifyPayload(payload, 'json')
        }

        if (serialize === 'string') {
            return String(payload)
        }

        if (serialize === 'raw') {
            if (typeof payload === 'string' || this.isBinaryPayload(payload)) {
                return this.isBinaryPayload(payload)
                    ? this.normalizeBinaryPayload(payload)
                    : payload
            }
            throw new TypeError('MQTT raw payload must be a string or binary value')
        }

        // auto
        if (typeof payload === 'string' || this.isBinaryPayload(payload)) {
            return this.isBinaryPayload(payload)
                ? this.normalizeBinaryPayload(payload)
                : payload
        }

        if (Array.isArray(payload) || this.isPlainObject(payload)) {
            return this.stringifyPayload(payload, 'auto')
        }

        throw new TypeError('Unsupported MQTT payload type for auto serialization')
    }

    /**
     * @param {unknown} correlationData
     * @returns {Buffer | Uint8Array | undefined}
     */
    normalizeCorrelationData (correlationData) {
        if (correlationData === null || correlationData === undefined) {
            return undefined
        }

        if (typeof correlationData === 'string') {
            return typeof Buffer !== 'undefined'
                ? Buffer.from(correlationData)
                : new TextEncoder().encode(correlationData)
        }

        if (this.isBinaryPayload(correlationData)) {
            return this.normalizeBinaryPayload(correlationData)
        }

        throw new TypeError('MQTT publish correlationData must be a string or binary value')
    }

    /**
     * @param {unknown} userProperties
     * @returns {Record<string, string | string[]> | undefined}
     */
    normalizeUserProperties (userProperties) {
        if (userProperties === null || userProperties === undefined) {
            return undefined
        }

        if (!this.isPlainObject(userProperties)) {
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
     * @param {{correlationData: unknown, userProperties: unknown}} properties
     * @returns {{correlationData?: Buffer | Uint8Array, userProperties?: Record<string, string | string[]>} | undefined}
     */
    normalizePublishProperties ({ correlationData, userProperties }) {
        const normalizedCorrelationData = this.normalizeCorrelationData(correlationData)
        const normalizedUserProperties = this.normalizeUserProperties(userProperties)

        if (!normalizedCorrelationData && !normalizedUserProperties) {
            return undefined
        }

        return {
            correlationData: normalizedCorrelationData,
            userProperties: normalizedUserProperties
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
