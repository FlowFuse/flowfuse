import { inject, ref } from 'vue'

export function useMqttAvailability () {
    const services = inject('$services', null)
    const mqttAvailable = ref(false)

    async function resolveMqttAvailability () {
        const teamChannel = services?.teamChannel
        if (!teamChannel) {
            mqttAvailable.value = false
            return false
        }
        try {
            mqttAvailable.value = await teamChannel.ready()
        } catch {
            mqttAvailable.value = false
        }
        return mqttAvailable.value
    }

    return { mqttAvailable, resolveMqttAvailability }
}

function subscribeFor (teamChannel, kind, id, onPayload) {
    return kind === 'instance'
        ? teamChannel.subscribeInstance(id, onPayload)
        : teamChannel.subscribeDevice(id, onPayload)
}

export function useMqttResourceSubscription (kind) {
    const services = inject('$services', null)
    let unsubscriber = null

    function setupMqttSubscription (id, onPayload) {
        teardownMqttSubscription()
        if (!id || typeof onPayload !== 'function') return
        const teamChannel = services?.teamChannel
        if (!teamChannel) return
        unsubscriber = subscribeFor(teamChannel, kind, id, onPayload)
    }

    function teardownMqttSubscription () {
        if (!unsubscriber) return
        try { unsubscriber() } catch {}
        unsubscriber = null
    }

    return { setupMqttSubscription, teardownMqttSubscription }
}

export function useMqttResourceList (kind) {
    const services = inject('$services', null)
    const unsubscribers = new Map()

    function syncMqttSubscriptions (visibleIds, available, onPayload) {
        if (!available) {
            teardownMqttSubscriptions()
            return
        }
        const teamChannel = services?.teamChannel
        if (!teamChannel) return
        const visible = new Set(visibleIds)
        for (const [id, unsub] of unsubscribers) {
            if (!visible.has(id)) {
                try { unsub() } catch {}
                unsubscribers.delete(id)
            }
        }
        for (const id of visible) {
            if (!unsubscribers.has(id)) {
                unsubscribers.set(id, subscribeFor(teamChannel, kind, id, (payload) => onPayload(id, payload)))
            }
        }
    }

    function dropMqttSubscription (id) {
        const unsub = unsubscribers.get(id)
        if (!unsub) return
        try { unsub() } catch {}
        unsubscribers.delete(id)
    }

    function teardownMqttSubscriptions () {
        for (const unsub of unsubscribers.values()) {
            try { unsub() } catch {}
        }
        unsubscribers.clear()
    }

    return { syncMqttSubscriptions, dropMqttSubscription, teardownMqttSubscriptions }
}
