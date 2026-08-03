import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import applicationApi from '@/api/application.js'
import teamApi from '@/api/team.js'
import type { ApplicationSummary } from '@/types'

export const useDataFarmApplicationsStore = defineStore('data-farm-applications', () => {
    const applicationsById = ref<Record<string, ApplicationSummary>>({})
    const teamApplicationIds = ref<string[]>([])
    const loadedTeamId = ref<string | null>(null)
    const isLoadingTeamApplications = ref(false)
    const activeApplicationId = ref<string | null>(null)

    const teamApplications = computed(() => teamApplicationIds.value
        .map(id => applicationsById.value[id]))

    const activeApplication = computed(() => (activeApplicationId.value
        ? applicationsById.value[activeApplicationId.value] ?? null
        : null))

    function upsertApplication (application: ApplicationSummary): void {
        if (!application?.id) return
        const existing = applicationsById.value[application.id]
        applicationsById.value[application.id] = { ...existing, ...application }
        if (!teamApplicationIds.value.includes(application.id)) {
            teamApplicationIds.value.push(application.id)
        }
    }

    function removeApplication (id: string): void {
        delete applicationsById.value[id]
        teamApplicationIds.value = teamApplicationIds.value.filter(applicationId => applicationId !== id)
    }

    async function ensureTeamApplicationsLoaded (teamId: string, { force = false } = {}): Promise<void> {
        if (!teamId) return
        if (!force && loadedTeamId.value === teamId) return

        isLoadingTeamApplications.value = true
        try {
            const response = await teamApi.getTeamApplications(teamId, {
                includeApplicationSummary: true,
                includeInstances: false,
                includeApplicationDevices: false
            })
            const applications: ApplicationSummary[] = response.applications ?? []
            const byId: Record<string, ApplicationSummary> = {}
            const ids: string[] = []
            applications.forEach(application => {
                byId[application.id] = application
                ids.push(application.id)
            })
            applicationsById.value = byId
            teamApplicationIds.value = ids
            loadedTeamId.value = teamId
        } finally {
            isLoadingTeamApplications.value = false
        }
    }

    async function createApplication (payload: { name?: string, description?: string, teamId: string }): Promise<ApplicationSummary> {
        const application = await applicationApi.createApplication(payload)
        upsertApplication(application)
        return application
    }

    async function updateApplication (id: string, changes: { name?: string, description?: string }): Promise<ApplicationSummary> {
        const application = await applicationApi.updateApplication(id, changes.name, changes.description)
        upsertApplication(application)
        return application
    }

    async function deleteApplication (id: string, teamId: string): Promise<void> {
        await applicationApi.deleteApplication(id, teamId)
        removeApplication(id)
    }

    function setActiveApplication (application: ApplicationSummary | null): void {
        if (!application?.id) {
            activeApplicationId.value = null
            return
        }
        const existing = applicationsById.value[application.id]
        applicationsById.value[application.id] = { ...existing, ...application }
        activeApplicationId.value = application.id
    }

    function applyRealtimeEvent (event: { id?: string, action?: string, data?: ApplicationSummary }): void {
        if (!event?.id || !event.action) return
        if (event.action === 'deleted') {
            removeApplication(event.id)
        } else if (event.data) {
            upsertApplication(event.data)
        }
    }

    function reset (): void {
        applicationsById.value = {}
        teamApplicationIds.value = []
        loadedTeamId.value = null
        isLoadingTeamApplications.value = false
        activeApplicationId.value = null
    }

    return {
        applicationsById,
        teamApplicationIds,
        loadedTeamId,
        isLoadingTeamApplications,
        activeApplicationId,
        teamApplications,
        activeApplication,
        upsertApplication,
        removeApplication,
        ensureTeamApplicationsLoaded,
        createApplication,
        updateApplication,
        deleteApplication,
        setActiveApplication,
        applyRealtimeEvent,
        reset
    }
})
