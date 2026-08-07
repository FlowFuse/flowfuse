import { onBeforeUnmount, onMounted } from 'vue'

import userApi from '@/api/user.js'
import { useMqttExpertTopicHelper } from '@/composables/services/MqttExpertTopicHelper'
import { useContextStore } from '@/stores/context.js'
import { useProductExpertStore } from '@/stores/product-expert.js'

// The gateway drops an entry not refreshed within ~135s, so republish well inside that.
const HEARTBEAT_INTERVAL = 45000

const CAPABILITIES = {
    platform: ['platform_ui'],
    editor: ['platform_ui', 'flow_building']
}

/**
 * Announce this browser tab's presence so third-party MCP tools can target it.
 * On mount the tab heartbeats Forge, which relays to the central MCP gateway.
 * @param {'platform'|'editor'} kind The kind of tab announcing presence
 */
export function useBrowserSessionPresence (kind) {
    const expertStore = useProductExpertStore()
    const contextStore = useContextStore()
    const topicHelper = useMqttExpertTopicHelper()

    let timer = null
    let announcedSessionId = null

    function collect () {
        const sessionId = expertStore.sessionId
        if (!sessionId) {
            return null
        }
        const { entityType, entityId } = topicHelper.getEntityTopicPaths()
        if (!entityType || !entityId) {
            return null
        }
        return {
            sessionId,
            kind,
            entityType,
            entityId,
            instanceId: kind === 'editor' ? (contextStore.instance?.id ?? null) : null,
            capabilities: CAPABILITIES[kind] ?? CAPABILITIES.platform
        }
    }

    function beat () {
        const payload = collect()
        // No session means MQTT targeting is not available for this tab (e.g. the
        // external-broker feature is off), so there is nothing to announce.
        if (!payload) {
            return
        }
        announcedSessionId = payload.sessionId
        userApi.heartbeatBrowserSession(payload).catch(() => {})
    }

    function clear () {
        if (!announcedSessionId) {
            return
        }
        const sessionId = announcedSessionId
        announcedSessionId = null
        userApi.clearBrowserSession(sessionId).catch(() => {})
    }

    function clearOnUnload () {
        if (!announcedSessionId) {
            return
        }
        // Fire during page unload: a keepalive fetch survives teardown where the
        // axios client would be cancelled. A DELETE rules out navigator.sendBeacon.
        try {
            fetch(`/api/v1/user/browser-sessions/${announcedSessionId}`, {
                method: 'DELETE',
                keepalive: true,
                credentials: 'same-origin'
            })
        } catch (err) {
            // best-effort
        }
    }

    onMounted(async () => {
        // Establish the session + inflight subscription up front so the tab is targetable
        // as soon as FlowFuse is open — the user does not need to open Expert or send a
        // message first (that would defeat the point of driving it from a 3rd-party agent).
        await expertStore.establishPresenceSession()
        beat()
        timer = setInterval(beat, HEARTBEAT_INTERVAL)
        window.addEventListener('beforeunload', clearOnUnload)
    })

    onBeforeUnmount(() => {
        if (timer) {
            clearInterval(timer)
            timer = null
        }
        window.removeEventListener('beforeunload', clearOnUnload)
        clear()
    })
}
