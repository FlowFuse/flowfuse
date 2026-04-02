import { defineStore } from 'pinia'

import settingsApi from '@/api/settings.js'
import { getTeamProperty } from '@/composables/TeamProperties.js'
import { useAccountAuthStore } from '@/stores/account-auth.js'
import { useContextStore } from '@/stores/context.js'

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
            const teamMembership = contextStore.teamMembership

            const preCheck = {
                // Instances
                // deprecated, use the isFreeTeamType getter
                isHostedInstancesEnabledForTeam: (() => {
                    if (!team) {
                        return false
                    }

                    // dashboard users don't receive the team.type in the response payload
                    if (teamMembership?.role === 5 && !team?.type?.properties) {
                        return true
                    }

                    let available = false

                    // loop over the different instance types. Reference the team type properties to get the list
                    // of instance types, but use getTeamProperty to check the individual types to take into account
                    // any team level overrides
                    for (const instanceType of Object.keys(team.type.properties?.instances) || []) {
                        if (getTeamProperty(team, `instances.${instanceType}.active`)) {
                            available = true
                            break
                        }
                    }
                    return available
                })(),

                // Shared Library
                isSharedLibraryFeatureEnabledForTeam: (() => {
                    const flag = team?.type?.properties?.features?.['shared-library']
                    return (flag === undefined || flag) || team?.type?.properties?.enableAllFeatures
                })(),
                isSharedLibraryFeatureEnabledForPlatform: state.features?.['shared-library'],

                // Blueprints
                isBlueprintsFeatureEnabledForTeam: (() => {
                    const flag = team?.type?.properties?.features?.flowBlueprints
                    return (flag === undefined || flag) || team?.type?.properties?.enableAllFeatures
                })(),
                isBlueprintsFeatureEnabledForPlatform: !!state.features?.flowBlueprints,

                // Custom Catalogs
                isCustomCatalogsFeatureEnabledForPlatform: !!state.features?.customCatalogs,
                isCustomCatalogsFeatureEnabledForTeam: (() => {
                    const flag = team?.type?.properties?.features?.customCatalogs
                    return (flag === undefined || flag) || team?.type?.properties?.enableAllFeatures
                })(),

                // Private NPM Registry (Custom Nodes)
                isPrivateRegistryFeatureEnabledForPlatform: !!state.features?.npm,
                isPrivateRegistryFeatureEnabledForTeam: !!team?.type?.properties?.features?.npm || team?.type?.properties?.enableAllFeatures,

                // Certified Nodes
                isCertifiedNodesFeatureEnabledForPlatform: !!state.features?.certifiedNodes,
                // FlowFuse Nodes
                isFlowFuseNodesFeatureEnabledForPlatform: !!state.features?.ffNodes,

                // Static Assets
                isStaticAssetFeatureEnabledForPlatform: !!state.features?.staticAssets,
                isStaticAssetsFeatureEnabledForTeam: !!team?.type?.properties?.features?.staticAssets || team?.type?.properties?.enableAllFeatures,

                // HTTP BearerTokens
                isHTTPBearerTokensFeatureEnabledForPlatform: !!state.settings?.features?.httpBearerTokens,
                isHTTPBearerTokensFeatureEnabledForTeam: !!team?.type?.properties?.features?.teamHttpSecurity || team?.type?.properties?.enableAllFeatures,

                // BOM
                isBOMFeatureEnabledForPlatform: !!state.features?.bom,
                isBOMFeatureEnabledForTeam: !!team?.type?.properties?.features?.bom || team?.type?.properties?.enableAllFeatures,

                // Timeline
                isTimelineFeatureEnabledForPlatform: !!state.features?.projectHistory,
                isTimelineFeatureEnabledForTeam: !!team?.type?.properties?.features?.projectHistory || team?.type?.properties?.enableAllFeatures,

                // Mqtt Broker
                isMqttBrokerFeatureEnabledForPlatform: !!state.features?.teamBroker,
                isMqttBrokerFeatureEnabledForTeam: !!team?.type?.properties?.features?.teamBroker || team?.type?.properties?.enableAllFeatures,

                isExternalMqttBrokerFeatureEnabledForPlatform: !!state.features?.externalBroker,

                // DevOps Pipelines
                devOpsPipelinesFeatureEnabledForPlatform: !!state.features?.['devops-pipelines'],

                isGitIntegrationFeatureEnabledForPlatform: !!state.features?.gitIntegration,

                // Instance Resources
                isInstanceResourcesFeatureEnabledForPlatform: !!state.features?.instanceResources,
                isInstanceResourcesFeatureEnabledForTeam: !!team?.type?.properties?.features?.instanceResources || team?.type?.properties?.enableAllFeatures,

                // Tables
                isTablesFeatureEnabledForPlatform: !!state.features?.tables,
                isTablesFeatureEnabledForTeam: !!team?.type?.properties?.features?.tables || team?.type?.properties?.enableAllFeatures,

                // Generate Snapshot Descriptions with AI
                isGeneratedSnapshotDescriptionFeatureEnabledForPlatform: !!state.features?.generatedSnapshotDescription,
                isGeneratedSnapshotDescriptionFeatureEnabledForTeam: !!team?.type?.properties?.features?.generatedSnapshotDescription || team?.type?.properties?.enableAllFeatures,

                // Applications Role Based Access Control
                isApplicationsRBACFeatureEnabledForPlatform: !!state.features?.rbacApplication,
                isApplicationsRBACFeatureEnabledForTeam: !!team?.type?.properties?.features?.rbacApplication || team?.type?.properties?.enableAllFeatures,

                // Expert Assistant
                isExpertAssistantFeatureEnabledForPlatform: !!state.features?.expertAssistant,

                // Instance Maintenance
                isInstanceAutoStackUpdateFeatureEnabledForPlatform: !!state.features?.autoStackUpdate
            }
            return {
                ...preCheck,
                isSharedLibraryFeatureEnabled: preCheck.isSharedLibraryFeatureEnabledForTeam && preCheck.isSharedLibraryFeatureEnabledForPlatform,
                isBlueprintsFeatureEnabled: preCheck.isBlueprintsFeatureEnabledForTeam && preCheck.isBlueprintsFeatureEnabledForPlatform,
                isCustomCatalogsFeatureEnabled: preCheck.isCustomCatalogsFeatureEnabledForPlatform && preCheck.isCustomCatalogsFeatureEnabledForTeam,
                isStaticAssetFeatureEnabled: preCheck.isStaticAssetFeatureEnabledForPlatform && preCheck.isStaticAssetsFeatureEnabledForTeam,
                isHTTPBearerTokensFeatureEnabled: preCheck.isHTTPBearerTokensFeatureEnabledForPlatform && preCheck.isHTTPBearerTokensFeatureEnabledForTeam,
                isBOMFeatureEnabled: preCheck.isBOMFeatureEnabledForPlatform && preCheck.isBOMFeatureEnabledForTeam,
                isTimelineFeatureEnabled: preCheck.isTimelineFeatureEnabledForPlatform && preCheck.isTimelineFeatureEnabledForTeam,
                isMqttBrokerFeatureEnabled: preCheck.isMqttBrokerFeatureEnabledForPlatform && preCheck.isMqttBrokerFeatureEnabledForTeam,
                // external broker must be enabled for platform, and share the same team-level feature flag as the team broker
                isExternalMqttBrokerFeatureEnabled: preCheck.isExternalMqttBrokerFeatureEnabledForPlatform && preCheck.isMqttBrokerFeatureEnabledForTeam,
                devOpsPipelinesFeatureEnabled: preCheck.devOpsPipelinesFeatureEnabledForPlatform,
                isDeviceGroupsFeatureEnabled: !!team?.type?.properties?.features?.deviceGroups || !!team?.type?.properties?.enableAllFeatures,
                isGitIntegrationFeatureEnabled: preCheck.isGitIntegrationFeatureEnabledForPlatform && !!team?.type?.properties?.features?.gitIntegration,
                isInstanceResourcesFeatureEnabled: preCheck.isInstanceResourcesFeatureEnabledForPlatform && preCheck.isInstanceResourcesFeatureEnabledForTeam,
                isTablesFeatureEnabled: preCheck.isTablesFeatureEnabledForPlatform && preCheck.isTablesFeatureEnabledForTeam,
                isGeneratedSnapshotDescriptionEnabled: preCheck.isGeneratedSnapshotDescriptionFeatureEnabledForPlatform && preCheck.isGeneratedSnapshotDescriptionFeatureEnabledForTeam,
                isRBACApplicationFeatureEnabled: preCheck.isApplicationsRBACFeatureEnabledForPlatform && preCheck.isApplicationsRBACFeatureEnabledForTeam,
                isExpertAssistantFeatureEnabled: preCheck.isExpertAssistantFeatureEnabledForPlatform
            }
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
