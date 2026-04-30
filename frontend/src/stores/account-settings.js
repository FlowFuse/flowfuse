import { defineStore } from 'pinia'

import settingsApi from '@/api/settings.js'
import { useAccountAuthStore } from '@/stores/account-auth.js'
import { useContextStore } from '@/stores/context.js'

const FEATURE_CONFIGS = [
    { output: 'isSharedLibraryFeatureEnabled', platformKey: 'shared-library', teamKey: 'shared-library', optOut: true },
    { output: 'isBlueprintsFeatureEnabled', platformKey: 'flowBlueprints', teamKey: 'flowBlueprints', optOut: true },
    { output: 'isCustomCatalogsFeatureEnabled', platformKey: 'customCatalogs', teamKey: 'customCatalogs', optOut: true },
    { output: 'isPrivateRegistryFeatureEnabled', platformKey: 'npm', teamKey: 'npm' },
    { output: 'isStaticAssetsFeatureEnabled', platformKey: 'staticAssets', teamKey: 'staticAssets' },
    { output: 'isHTTPBearerTokensFeatureEnabled', platformKey: 'httpBearerTokens', teamKey: 'teamHttpSecurity', platformSource: 'settings' },
    { output: 'isBOMFeatureEnabled', platformKey: 'bom', teamKey: 'bom' },
    { output: 'isTimelineFeatureEnabled', platformKey: 'projectHistory', teamKey: 'projectHistory' },
    { output: 'isMqttBrokerFeatureEnabled', platformKey: 'teamBroker', teamKey: 'teamBroker' },
    { output: 'isGitIntegrationFeatureEnabled', platformKey: 'gitIntegration', teamKey: 'gitIntegration' },
    { output: 'isInstanceResourcesFeatureEnabled', platformKey: 'instanceResources', teamKey: 'instanceResources' },
    { output: 'isTablesFeatureEnabled', platformKey: 'tables', teamKey: 'tables' },
    { output: 'isGeneratedSnapshotDescriptionFeatureEnabled', platformKey: 'generatedSnapshotDescription', teamKey: 'generatedSnapshotDescription' },
    { output: 'isApplicationsRBACFeatureEnabled', platformKey: 'rbacApplication', teamKey: 'rbacApplication' },

    // Team-only
    { output: 'isDeviceGroupsFeatureEnabled', teamKey: 'deviceGroups' },

    // Platform-only
    { output: 'isCertifiedNodesFeatureEnabled', platformKey: 'certifiedNodes' },
    { output: 'isFlowFuseNodesFeatureEnabled', platformKey: 'ffNodes' },
    { output: 'isExpertAssistantFeatureEnabled', platformKey: 'expertAssistant' },
    { output: 'isInstanceAutoStackUpdateFeatureEnabled', platformKey: 'autoStackUpdate' },
    { output: 'isDevOpsPipelinesFeatureEnabled', platformKey: 'devops-pipelines' },
    { output: 'isExternalMqttBrokerFeatureEnabled', platformKey: 'externalBroker' }
]

function buildFeatureChecks (state, team) {
    const checks = {}

    for (const { output, platformKey, teamKey, optOut, platformSource } of FEATURE_CONFIGS) {
        const platformCheckKey = `${output}ForPlatform`
        const teamCheckKey = `${output}ForTeam`

        if (platformKey) {
            const source = platformSource === 'settings' ? state.settings?.features : state.features
            checks[platformCheckKey] = !!source?.[platformKey]
        }

        if (teamKey) {
            if (optOut) {
                const flag = team?.type?.properties?.features?.[teamKey]
                checks[teamCheckKey] = (flag === undefined || !!flag) || !!team?.type?.properties?.enableAllFeatures
            } else {
                checks[teamCheckKey] = !!team?.type?.properties?.features?.[teamKey] || !!team?.type?.properties?.enableAllFeatures
            }
        }

        if (platformKey && teamKey) {
            checks[output] = checks[platformCheckKey] && checks[teamCheckKey]
        } else if (platformKey) {
            checks[output] = checks[platformCheckKey]
        } else if (teamKey) {
            checks[output] = checks[teamCheckKey]
        }
    }

    return checks
}

export const useAccountSettingsStore = defineStore('account-settings', {
    state: () => ({
        settings: null,
        features: {}
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
            checks.isHostedInstancesEnabledForTeam = false

            // External broker: platform check is its own, team check reuses MqttBroker's
            checks.isExternalMqttBrokerFeatureEnabled =
                checks.isExternalMqttBrokerFeatureEnabledForPlatform && checks.isMqttBrokerFeatureEnabledForTeam

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
        }
    },
    persist: {
        pick: ['settings', 'features'],
        storage: localStorage
    }
})
