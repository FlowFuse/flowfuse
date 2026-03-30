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
            await client.end(true)
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

            register('connect', onConnect)
            register('close', onClose)
            register('offline', onOffline)
            register('error', onError)
            register('message', onMessage)

            this.$clients.set(key, managed)

            return client
        })
    }

    /**
     * Publish a message only when the connection is alive.
     * @param {string} key
     * @param {{topic: string, payload: string | Buffer | object, qos?: number, retain?: boolean, onError?: Function}} options
     * @returns {Promise<void>}
     */
    publishMessage (key, {
        topic,
        payload,
        qos,
        retain,
        onError = null,
        correlationData = null,
        userProperties = null
    } = {}) {
        const managed = this.getManagedClient(key)

        if (!managed || managed.destroyed) {
            return Promise.reject(new Error(`MQTT connection "${key}" does not exist`))
        }

        const { client } = managed
        if (!client.connected) {
            return Promise.reject(new Error(`MQTT connection "${key}" is not connected`))
        }

        if (!topic || typeof topic !== 'string') {
            return Promise.reject(new Error('MQTT publish topic is required'))
        }

        if (typeof payload !== 'string') {
            payload = JSON.stringify(payload)
        }

        /** @type {Mqtt.IClientPublishOptions} */
        const options = {
            qos,
            retain,
            properties: { correlationData, userProperties }
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
     * @param {Mqtt.IClientSubscribeOptions} [options]
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
