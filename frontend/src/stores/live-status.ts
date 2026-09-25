import { defineStore } from 'pinia'
import { ref } from 'vue'

import { useInstanceStates } from '@/composables/InstanceStates.js'

type InstanceMetadata = { status: string, versions?: Record<string, string> }
type DeviceMetadata = { status: string, onlineStatus?: string }
type InstanceStatusTransition = { toRunning: boolean, toFailed: boolean }

export const useLiveStatusStore = defineStore('live-status', () => {
    const instanceMetadata = ref<Record<string, InstanceMetadata>>({})
    const deviceMetadata = ref<Record<string, DeviceMetadata>>({})
    const live = ref(false)
    const { isErrorState } = useInstanceStates()

    // Returns which edge this call crossed, so callers announce each transition once.
    function setInstanceStatus (id: string, state: string, versions?: Record<string, string>): InstanceStatusTransition {
        const existing = instanceMetadata.value[id]
        const toRunning = state === 'running' && existing?.status !== 'running'
        const toFailed = isErrorState(state) && !isErrorState(existing?.status ?? '')
        instanceMetadata.value[id] = { status: state, versions: versions ?? existing?.versions }
        return { toRunning, toFailed }
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
