import { useRoute, useRouter } from 'vue-router'

import { useAccountSettingsStore } from '@/stores/account-settings.js'

/**
 * The immersive editor routes choose their landing tab (Expert or Overview) in a route
 * redirect, which runs before the instance or device has been loaded. At that point the
 * active team is whatever the session last had, or nothing at all, rather than the team
 * that owns the entity being opened.
 *
 * Call `syncLandingTab` once the entity and its team are loaded. It moves away from the
 * Expert tab when the owning team has Expert disabled, and onto it when the redirect
 * landed on Overview only because the owning team was not yet known.
 */
export function useEditorLandingTab ({ editorRouteName, expertRouteName, overviewRouteName }) {
    const route = useRoute()
    const router = useRouter()
    const accountSettings = useAccountSettingsStore()

    function syncLandingTab () {
        const { isExpertAssistantFeatureEnabled, isExpertInsightsFeatureEnabled } = accountSettings.featuresCheck
        const expertEnabled = isExpertAssistantFeatureEnabled || isExpertInsightsFeatureEnabled
        const onExpert = route.name === expertRouteName
        const landedViaRedirect = route.redirectedFrom?.name === editorRouteName

        if (onExpert && !expertEnabled) {
            return router.replace({ name: overviewRouteName, params: route.params })
        }
        if (!onExpert && expertEnabled && landedViaRedirect) {
            return router.replace({ name: expertRouteName, params: route.params })
        }
    }

    return { syncLandingTab }
}
