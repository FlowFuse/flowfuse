import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import applicationApi from '@/api/application.js'
import teamApi from '@/api/team.js'
import Alerts from '@/services/alerts.js'
import { useAccountStore } from '@/stores/account.js'
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

type DashboardsResponse = { projects: DashboardInstance[] }

export function useDashboards (fetchProjects: () => Promise<DashboardsResponse> | null) {
    const liveStatusStore = useLiveStatusStore()

    const loading = ref(false)
    const instancesMap = ref<Map<string, DashboardInstance>>(new Map())

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
        const request = fetchProjects()
        if (!request) return
        loading.value = true
        try {
            const response = await request
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

    watch(liveInstanceMetadata, applyLiveStatus, { deep: true })

    return { instances, instancesMap, loading, statusChannelLive, fetchData, instanceUpdated }
}

export function useDashboardScope (scope: string) {
    const contextStore = useContextStore()
    const route = useRoute()

    if (scope === 'application') {
        return {
            context: computed(() => contextStore.application),
            fetch: () => {
                const id = contextStore.application?.id
                return id ? applicationApi.getApplicationDashboards(id) : null
            },
            viewerRouteName: 'application-dashboards-view',
            homeRoute: computed(() => {
                const app = contextStore.application
                if (!app) return null
                return { name: 'ApplicationDashboards', params: { team_slug: route.params.team_slug, id: app.id } }
            }),
            ensureContext: () => {
                const slug = route.params.team_slug as string
                if (slug && contextStore.team?.slug !== slug) {
                    useAccountStore().setTeam(slug)
                }
                const id = route.params.id as string
                if (id && contextStore.application?.id !== id) {
                    return applicationApi.getApplication(id).then(app => contextStore.setApplication(app))
                }
            }
        }
    }

    return {
        context: computed(() => contextStore.team),
        fetch: () => {
            const id = contextStore.team?.id
            return id ? teamApi.getTeamDashboards(id) : null
        },
        viewerRouteName: 'team-dashboards-view',
        homeRoute: computed(() => {
            const team = contextStore.team
            if (!team) return null
            return { name: 'team-dashboards', params: { team_slug: team.slug } }
        }),
        ensureContext: () => {
            const slug = route.params.team_slug as string
            if (slug && contextStore.team?.slug !== slug) {
                useAccountStore().setTeam(slug)
            }
        }
    }
}
