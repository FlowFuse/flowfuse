import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import instanceApi from '@/api/instances.js'
import teamApi from '@/api/team.js'
import { useInstanceStates } from '@/composables/InstanceStates.js'
import { useLiveStatusStore } from '@/stores/live-status'
import type { InstanceStatus, InstanceSummary, PaginationParams } from '@/types'
import { InstanceStateMutator } from '@/utils/InstanceStateMutator'
import { applyLiveState } from '@/utils/applyLiveState.js'

type StoreInstance = InstanceSummary & Pick<InstanceStatus, 'meta' | 'flowLastUpdatedAt'> & {
    status?: string
    optimisticStateChange?: boolean
    pendingStateChange?: boolean
    running?: boolean
    notSuspended?: boolean
    flowLastUpdatedSince?: string
}

type MutatorInstance = ConstructorParameters<typeof InstanceStateMutator>[0]

type PageQuery = PaginationParams & {
    states?: string[] | null
    signal?: AbortSignal | null
}

export const useDataFarmHostedInstancesStore = defineStore('data-farm-hosted-instances', () => {
    const instancesById = ref<Record<string, StoreInstance>>({})
    const currentPageIds = ref<string[]>([])
    const total = ref(0)

    const { isRunningState } = useInstanceStates()

    const currentPageInstanceRefs = computed(() =>
        currentPageIds.value.map(id => instancesById.value[id]).filter(Boolean)
    )

    const currentPageInstances = computed(() =>
        currentPageInstanceRefs.value.map(instance => {
            const state = instance.meta?.state || instance.status
            return { ...instance, running: isRunningState(state), notSuspended: state !== 'suspended' }
        })
    )

    function removeInstance (id: string): void {
        delete instancesById.value[id]
        currentPageIds.value = currentPageIds.value.filter(instanceId => instanceId !== id)
    }

    async function fetchTeamInstancesPage (teamId: string, query: PageQuery = {}): Promise<void> {
        if (!teamId) return
        const response = await teamApi.getInstances(teamId, {
            pagination: {
                page: query.page ?? 1,
                limit: query.limit ?? 25,
                query: query.query ?? null,
                sort: query.sort ?? null,
                dir: query.dir ?? null
            },
            includeMeta: true,
            states: query.states ?? null,
            signal: query.signal ?? null
        })
        const projects: StoreInstance[] = response?.projects || []
        const byId: Record<string, StoreInstance> = {}
        const ids: string[] = []
        projects.forEach(instance => {
            instance.pendingStateChange = false
            instance.optimisticStateChange = false
            byId[instance.id] = instance
            ids.push(instance.id)
        })
        instancesById.value = byId
        currentPageIds.value = ids
        total.value = response?.meta?.total ?? response?.count ?? projects.length
    }

    function applyLiveStatus (): void {
        const metadata = useLiveStatusStore().instanceMetadata
        for (const id of currentPageIds.value) {
            const meta = metadata[id]
            if (!meta?.status) continue
            const state = meta.status
            const row = instancesById.value[id]
            if (!row) continue
            if (row.status === state && row.meta?.state === state) continue
            instancesById.value[id] = {
                ...applyLiveState(row, state, { versions: meta.versions, clearFlags: true }),
                running: isRunningState(state),
                notSuspended: state !== 'suspended'
            }
        }
    }

    function applyPolledStatus (newData: StoreInstance): void {
        if (!newData?.id) return
        const existing = instancesById.value[newData.id]
        if (!existing) return
        const state = newData.meta?.state as string | undefined
        instancesById.value[newData.id] = {
            ...existing,
            ...newData,
            ...(state ? { status: state } : {}),
            optimisticStateChange: false,
            pendingStateChange: false
        }
    }

    async function transition (id: string, optimisticState: string, apiCall: (instance: StoreInstance) => Promise<unknown>): Promise<void> {
        const instance = instancesById.value[id]
        if (!instance) return
        const mutator = new InstanceStateMutator(instance as unknown as MutatorInstance)
        mutator.setStateOptimistically(optimisticState)
        try {
            await apiCall(instance)
            mutator.setStateAsPendingFromServer()
        } catch (err) {
            mutator.restoreState()
            throw err
        }
    }

    function startInstance (id: string): Promise<void> {
        return transition(id, 'starting', instance => instanceApi.startInstance(instance))
    }

    function restartInstance (id: string): Promise<void> {
        return transition(id, 'restarting', instance => instanceApi.restartInstance(instance))
    }

    function suspendInstance (id: string): Promise<void> {
        return transition(id, 'suspending', instance => instanceApi.suspendInstance(instance))
    }

    function reset (): void {
        instancesById.value = {}
        currentPageIds.value = []
        total.value = 0
    }

    return {
        instancesById,
        currentPageIds,
        total,
        currentPageInstanceRefs,
        currentPageInstances,
        fetchTeamInstancesPage,
        removeInstance,
        applyLiveStatus,
        applyPolledStatus,
        startInstance,
        restartInstance,
        suspendInstance,
        reset
    }
})
