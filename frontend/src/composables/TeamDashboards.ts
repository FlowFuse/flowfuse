import { computed, ref, watch } from 'vue'

import teamApi from '@/api/team.js'
import Alerts from '@/services/alerts.js'
import { useContextStore } from '@/stores/context.js'
import { useLiveStatusStore } from '@/stores/live-status'
import { applyLiveState } from '@/utils/applyLiveState.js'

interface DashboardInstance {
    id: string
    status?: string
    meta?: { state?: string, [key: string]: unknown }
    settings?: { dashboard2UI?: string, [key: string]: unknown }
    [key: string]: unknown
}

export function useTeamDashboards () {
    const contextStore = useContextStore()
    const liveStatusStore = useLiveStatusStore()

    const loading = ref(false)
    const instancesMap = ref<Map<string, DashboardInstance>>(new Map())

    const team = computed(() => contextStore.team)
    const statusChannelLive = computed(() => liveStatusStore.live)
    const liveInstanceMetadata = computed(() => liveStatusStore.instanceMetadata)
    const instances = computed(() => Array.from(instancesMap.value.values()))

    function seedMeta (instance: DashboardInstance) {
        if (!instance.meta) {
            instance.meta = { state: instance.status }
        }
        return instance
    }

    function applyLiveStatus () {
        const metadata = liveInstanceMetadata.value
        for (const id of instancesMap.value.keys()) {
            const meta = metadata[id]
            if (!meta?.status) continue
            const state = meta.status
            const row = instancesMap.value.get(id)
            if (!row) continue
            if (row.status === state && row.meta?.state === state) continue
            const updated = applyLiveState(row, state, { versions: meta.versions, clearFlags: true })
            updated.meta = { ...(updated.meta || {}), state }
            instancesMap.value.set(id, updated)
        }
    }

    async function fetchData () {
        if (!team.value?.id) {
            loading.value = false
            return
        }
        loading.value = true
        try {
            const response = await teamApi.getTeamDashboards(team.value.id)
            const projects = response?.projects || []
            const nextMap = new Map<string, DashboardInstance>()
            projects.forEach((instance: DashboardInstance) => nextMap.set(instance.id, seedMeta(instance)))
            instancesMap.value = nextMap
            applyLiveStatus()
        } catch {
            Alerts.emit('Failed to load dashboards.', 'warning')
        } finally {
            loading.value = false
        }
    }

    function instanceUpdated (newData: DashboardInstance) {
        const existing = instancesMap.value.get(newData.id)
        if (!existing) return
        const state = newData.meta?.state || newData.status
        instancesMap.value.set(newData.id, {
            ...existing,
            ...newData,
            status: state,
            meta: { ...(existing.meta || {}), ...(newData.meta || {}), state }
        })
    }

    watch(team, fetchData)
    watch(liveInstanceMetadata, applyLiveStatus, { deep: true })

    return { instances, instancesMap, loading, statusChannelLive, fetchData, instanceUpdated }
}
