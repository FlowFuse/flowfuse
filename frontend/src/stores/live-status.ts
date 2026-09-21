import { defineStore } from 'pinia'
import { ref } from 'vue'

type InstanceMetadata = { status: string, versions?: Record<string, string> }
type DeviceMetadata = { status: string, onlineStatus?: string }

export const useLiveStatusStore = defineStore('live-status', () => {
    const instanceMetadata = ref<Record<string, InstanceMetadata>>({})
    const deviceMetadata = ref<Record<string, DeviceMetadata>>({})
    const live = ref(false)

    // Returns whether this call is the transition into running, so callers can announce it
    // once per transition rather than on every message a running instance still emits.
    function setInstanceStatus (id: string, state: string, versions?: Record<string, string>): boolean {
        const existing = instanceMetadata.value[id]
        const transitionedToRunning = state === 'running' && existing?.status !== 'running'
        instanceMetadata.value[id] = { status: state, versions: versions ?? existing?.versions }
        return transitionedToRunning
    }

    function setDeviceStatus (id: string, state: string, onlineStatus?: string): void {
        const existing = deviceMetadata.value[id]
        deviceMetadata.value[id] = { status: state, onlineStatus: onlineStatus ?? existing?.onlineStatus }
    }

    function setLive (value: boolean): void {
        live.value = value
    }

    function clear (): void {
        instanceMetadata.value = {}
        deviceMetadata.value = {}
        live.value = false
    }

    return { instanceMetadata, deviceMetadata, live, setDeviceStatus, setInstanceStatus, setLive, clear }
})
