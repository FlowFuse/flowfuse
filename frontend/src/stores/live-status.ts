import { defineStore } from 'pinia'
import { ref } from 'vue'

type InstanceMetadata = { status: string, versions?: Record<string, string> }

export const useLiveStatusStore = defineStore('live-status', () => {
    const instanceMetadata = ref<Record<string, InstanceMetadata>>({})
    const deviceStatuses = ref<Record<string, string>>({})
    const live = ref(false)

    function setInstanceStatus (id: string, state: string, versions?: Record<string, string>): void {
        const existing = instanceMetadata.value[id]
        instanceMetadata.value[id] = { status: state, versions: versions ?? existing?.versions }
    }

    function setDeviceStatus (id: string, state: string): void {
        deviceStatuses.value[id] = state
    }

    function setLive (value: boolean): void {
        live.value = value
    }

    function clear (): void {
        instanceMetadata.value = {}
        deviceStatuses.value = {}
        live.value = false
    }

    return { instanceMetadata, deviceStatuses, live, setDeviceStatus, setInstanceStatus, setLive, clear }
})
