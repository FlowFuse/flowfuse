import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useLiveStatusStore = defineStore('live-status', () => {
    const instanceStatuses = ref<Record<string, string>>({})
    const deviceStatuses = ref<Record<string, string>>({})
    const live = ref(false)

    function setInstanceStatus (id: string, state: string): void {
        instanceStatuses.value[id] = state
    }

    function setDeviceStatus (id: string, state: string): void {
        deviceStatuses.value[id] = state
    }

    function setLive (value: boolean): void {
        live.value = value
    }

    function clear (): void {
        instanceStatuses.value = {}
        deviceStatuses.value = {}
        live.value = false
    }

    return { instanceStatuses, deviceStatuses, live, setDeviceStatus, setInstanceStatus, setLive, clear }
})
