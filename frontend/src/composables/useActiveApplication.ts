import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'

import { useDataFarmApplicationsStore } from '@/stores/data-farm-applications'
import type { ApplicationSummary } from '@/types'

export function useActiveApplication () {
    const router = useRouter()
    const applicationsStore = useDataFarmApplicationsStore()
    const { activeApplication, applicationHydrated } = storeToRefs(applicationsStore)

    async function loadActiveApplication (id: string): Promise<ApplicationSummary | null> {
        if (!id) return null
        try {
            return await applicationsStore.loadActiveApplication(id)
        } catch {
            const current = router.currentRoute.value
            router.push({
                name: 'page-not-found',
                params: { pathMatch: current.path.substring(1).split('/') },
                query: current.query,
                hash: current.hash
            })
            return null
        }
    }

    function clearActiveApplication (): void {
        applicationsStore.setActiveApplication(null)
    }

    return { application: activeApplication, applicationHydrated, loadActiveApplication, clearActiveApplication }
}
