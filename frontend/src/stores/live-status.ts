import { defineStore } from 'pinia'
import { ref } from 'vue'

type InstanceMetadata = { status: string, versions?: Record<string, string> }
type DeviceMetadata = { status: string, onlineStatus?: string }

export const useLiveStatusStore = defineStore('live-status', () => {
    const instanceMetadata = ref<Record<string, InstanceMetadata>>({})
    const deviceMetadata = ref<Record<string, DeviceMetadata>>({})
    const live = ref(false)

    function setInstanceStatus (id: string, state: string, versions?: Record<string, string>): void {
        const existing = instanceMetadata.value[id]
        instanceMetadata.value[id] = { status: state, versions: versions ?? existing?.versions }
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
