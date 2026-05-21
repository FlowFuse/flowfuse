import { defineStore } from 'pinia'

import settingsApi from '@/api/settings.js'
import { buildFeatureChecks } from '@/composables/FeatureChecks.js'
import { useAccountAuthStore } from '@/stores/account-auth.js'
import { useContextStore } from '@/stores/context.js'

export const POSTHOG_FLAGS = {
    FF_FEATURE_FLAGS: 'FF_FEATURE_FLAGS',
    EXPERT_COMMS_BETA_ENABLED: 'EXPERT_COMMS_BETA_ENABLED'
}

export const useAccountSettingsStore = defineStore('account-settings', {
    state: () => ({
        settings: null,
        features: {},
        posthogFlags: {}
    }),
    getters: {
        isBillingEnabled: state => !!state.features.billing,
        requiresBilling (state) {
            const authStore = useAccountAuthStore()
            const contextStore = useContextStore()
            const isNotAdmin = authStore.user && !authStore.user.admin
            return isNotAdmin &&
                state.features.billing &&
                !contextStore.team?.billing?.unmanaged &&
                (!contextStore.isTrialAccount || contextStore.team?.billing?.trialEnded) &&
                !contextStore.team?.type?.properties?.billing?.disabled &&
                !contextStore.team?.billing?.active
        },
        canCreateTeam (state) {
            if (useAccountAuthStore().isAdminUser) {
                return true
            }
            return Object.prototype.hasOwnProperty.call(state.settings, 'team:create') &&
                state.settings['team:create']
        },
        featuresCheck (state) {
            const contextStore = useContextStore()
            const team = contextStore.team
            const checks = buildFeatureChecks(state, team)

            // Instances (deprecated, used for the free team type)
            checks.isHostedInstancesEnabledForTeam = true

            // External broker: platform check is its own, team check reuses MqttBroker's
            checks.isExternalMqttBrokerFeatureEnabled =
                checks.isExternalMqttBrokerFeatureEnabledForPlatform && checks.isMqttBrokerFeatureEnabledForTeam

            // adding in PostHog Feature Flags
            checks.isExpertCommsBetaEnabled = !!state.posthogFlags[POSTHOG_FLAGS.EXPERT_COMMS_BETA_ENABLED]
            checks.isPostHogFeatureFlagsEnabled = !!state.posthogFlags[POSTHOG_FLAGS.FF_FEATURE_FLAGS]

            return checks
        }
    },
    actions: {
        setSettings (settings) {
            this.settings = settings
            this.features = settings.features || {}
        },
        async refreshSettings () {
            const settings = await settingsApi.getSettings()
            this.setSettings(settings)
        },
        loadPosthogFlags () {
            try {
                window.posthog?.onFeatureFlags((_flags, values) => {
                    this.posthogFlags = values || {}
                })
            } catch (err) {
                console.error('Error loading PostHog feature flags', err)
            }
        }
    },
    persist: {
        pick: ['settings', 'features'],
        storage: localStorage
    }
})
