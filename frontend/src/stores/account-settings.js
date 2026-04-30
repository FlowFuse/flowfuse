import { defineStore } from 'pinia'

import settingsApi from '@/api/settings.js'
import { useAccountAuthStore } from '@/stores/account-auth.js'
import { useContextStore } from '@/stores/context.js'

const FEATURE_CONFIGS = [
    { name: 'SharedLibrary', platformKey: 'shared-library', teamKey: 'shared-library', optOut: true },
    { name: 'Blueprints', platformKey: 'flowBlueprints', teamKey: 'flowBlueprints', optOut: true },
    { name: 'CustomCatalogs', platformKey: 'customCatalogs', teamKey: 'customCatalogs', optOut: true },
    { name: 'PrivateRegistry', platformKey: 'npm', teamKey: 'npm' },
    { name: 'StaticAssets', platformKey: 'staticAssets', teamKey: 'staticAssets' },
    { name: 'HTTPBearerTokens', platformKey: 'httpBearerTokens', teamKey: 'teamHttpSecurity', platformSource: 'settings' },
    { name: 'BOM', platformKey: 'bom', teamKey: 'bom' },
    { name: 'Timeline', platformKey: 'projectHistory', teamKey: 'projectHistory' },
    { name: 'MqttBroker', platformKey: 'teamBroker', teamKey: 'teamBroker' },
    { name: 'GitIntegration', platformKey: 'gitIntegration', teamKey: 'gitIntegration' },
    { name: 'InstanceResources', platformKey: 'instanceResources', teamKey: 'instanceResources' },
    { name: 'Tables', platformKey: 'tables', teamKey: 'tables' },
    { name: 'GeneratedSnapshotDescription', platformKey: 'generatedSnapshotDescription', teamKey: 'generatedSnapshotDescription' },
    { name: 'ApplicationsRBAC', platformKey: 'rbacApplication', teamKey: 'rbacApplication' },

    // Platform-only
    { name: 'CertifiedNodes', platformKey: 'certifiedNodes' },
    { name: 'FlowFuseNodes', platformKey: 'ffNodes' },
    { name: 'ExpertAssistant', platformKey: 'expertAssistant' },
    { name: 'InstanceAutoStackUpdate', platformKey: 'autoStackUpdate' },
    { name: 'DevOpsPipelines', platformKey: 'devops-pipelines' },
    { name: 'ExternalMqttBroker', platformKey: 'externalBroker' }
]

function buildFeatureChecks (state, team) {
    const checks = {}

    for (const { name, platformKey, teamKey, optOut, platformSource } of FEATURE_CONFIGS) {
        if (platformKey) {
            const source = platformSource === 'settings' ? state.settings?.features : state.features
            checks[`is${name}FeatureEnabledForPlatform`] = !!source?.[platformKey]
        }

        if (teamKey) {
            if (optOut) {
                const flag = team?.type?.properties?.features?.[teamKey]
                checks[`is${name}FeatureEnabledForTeam`] = (flag === undefined || !!flag) || !!team?.type?.properties?.enableAllFeatures
            } else {
                checks[`is${name}FeatureEnabledForTeam`] = !!team?.type?.properties?.features?.[teamKey] || !!team?.type?.properties?.enableAllFeatures
            }
        }

        if (platformKey && teamKey) {
            checks[`is${name}FeatureEnabled`] = checks[`is${name}FeatureEnabledForPlatform`] && checks[`is${name}FeatureEnabledForTeam`]
        } else if (platformKey) {
            checks[`is${name}FeatureEnabled`] = checks[`is${name}FeatureEnabledForPlatform`]
        } else if (teamKey) {
            checks[`is${name}FeatureEnabled`] = checks[`is${name}FeatureEnabledForTeam`]
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

            // Instances (deprecated, use the isFreeTeamType getter)
            checks.isHostedInstancesEnabledForTeam = false

            // External broker: platform check is its own, team check reuses MqttBroker's
            // todo there's a disconnect in naming
            checks.isExternalMqttBrokerFeatureEnabled =
                checks.isExternalMqttBrokerFeatureEnabledForPlatform && checks.isMqttBrokerFeatureEnabledForTeam

            // Device Groups: team-only check
            checks.isDeviceGroupsFeatureEnabled =
                !!team?.type?.properties?.features?.deviceGroups || !!team?.type?.properties?.enableAllFeatures

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
