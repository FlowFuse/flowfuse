import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

type ConsentDecision = 'accepted' | 'rejected' | null

export const useCookieConsentStore = defineStore('cookie-consent', () => {
    const decision = ref<ConsentDecision>(null)

    const analyticsEnabled = computed(() => {
        return !!(window.posthog || window._ffLoadHubSpot || window._ffLoadGoogleAnalytics)
    })
    const shouldShowBanner = computed(() => decision.value === null && analyticsEnabled.value)

    function applyDecision () {
        if (decision.value === 'accepted') {
            try {
                window.posthog?.opt_in_capturing()
            } catch (err) {
                console.error('posthog error opting in', err)
            }
            window._ffLoadHubSpot?.()
            window._ffLoadGoogleAnalytics?.()
        } else if (decision.value === 'rejected') {
            try {
                window.posthog?.opt_out_capturing()
            } catch (err) {
                console.error('posthog error opting out', err)
            }
        }
    }

    function accept () {
        decision.value = 'accepted'
        applyDecision()
    }

    function reject () {
        decision.value = 'rejected'
        applyDecision()
    }

    function reset () {
        decision.value = null
    }

    return { decision, analyticsEnabled, shouldShowBanner, accept, reject, applyDecision, reset }
}, {
    persist: {
        pick: ['decision'],
        storage: localStorage
    }
})
