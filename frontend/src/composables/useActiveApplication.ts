import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'

import applicationApi from '@/api/application.js'
import { useDataFarmApplicationsStore } from '@/stores/data-farm-applications'
import type { ApplicationSummary } from '@/types'

export function useActiveApplication () {
    const router = useRouter()
    const applicationsStore = useDataFarmApplicationsStore()
    const { activeApplication } = storeToRefs(applicationsStore)

    async function loadActiveApplication (id: string): Promise<ApplicationSummary | null> {
        if (!id) return null
        try {
            const application = await applicationApi.getApplication(id)
            applicationsStore.setActiveApplication(application)
            return application
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

    return { application: activeApplication, loadActiveApplication, clearActiveApplication }
}
