import Mqtt from 'mqtt'

class MqttService {
    /**
     * @type {import('vue').App} - Vue app instance
     */
    $app

    /**
     * @type {import('vuex').Store} - Vuex store instance
     */
    $store

    /**
     * @type {import('vue-router').Router} - Vue router instance
     */
    $router

    /**
     * @type {Object} - Map of all services for dependency injection
     */
    $services

    /**
     * @type {typeof import('mqtt') || null} - MQTT library/client used to create and manage connections
     */
    $mqttClient = null

    /**
     * @type {Map<string, import('./types').MqttConnection>}
     */
    $connections = new Map()

    /**
     * @param {{app: import('vue').App, store: import('vuex').Store, router: import('vue-router').Router, services?: Object}} options - Constructor options
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
        this.$mqttClient = Mqtt
    }

    /**
     * @param key
     * @return import('./types').MqttConnection
     */
    getConnection (key) {
        return this.$connections.get(key)
    }

    /**
     * @param key
     * @return Boolean
     */
    hasConnection (key) {
        return this.$connections.has(key)
    }

    createConnection (key, {
        url,
        username,
        password,
        reconnectPeriod = 0,
        onConnect = null,
        onClose = null,
        onOffline = null,
        onError = null,
        onMessage = null
    } = {}) {
        const connection = this.$mqttClient.connect(url, {
            username,
            password,
            reconnectPeriod
        })

        this.$connections.set(key, connection)

        if (onConnect && typeof onConnect === 'function') connection.on('connect', onConnect)
        if (onClose && typeof onClose === 'function') connection.on('close', onClose)
        if (onOffline && typeof onOffline === 'function') connection.on('offline', onOffline)
        if (onError && typeof onError === 'function') connection.on('error', onError)
        if (onMessage && typeof onMessage === 'function') connection.on('message', onMessage)

        return connection
    }

    publishMessage (key, {
        topic,
        payload,
        onError = null
    } = {}) {
        if (!this.hasConnection(key)) return
        if (!this.getConnection(key).connected) return

        return this.getConnection(key).publish(
            topic,
            payload,
            typeof onError === 'function'
                ? onError
                : (err) => err
        )
    }

    endConnection (key) {
        if (!this.hasConnection(key)) return

        this.getConnection(key).end()
        this.$connections.delete(key)
    }

    destroy () {
        for (const key of this.$connections.keys()) {
            this.endConnection(key)
        }
        this.$connections.clear()
    }
}

let MqttServiceInstance = null

/**
 * Get or create the MessagingService singleton instance
 * @param {{app: import('vue').App, store: import('vuex').Store, router: import('vue-router').Router, services?: Object}} options - Constructor options
 * @returns {MessagingService}
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
 * @returns {MessagingService}
 */
export default createMqttService
