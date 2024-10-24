import { mapState } from 'vuex'

export default {
    computed: {
        ...mapState('account', ['features', 'team']),
        isSharedLibraryFeatureEnabledForTeam () {
            const flag = this.team.type.properties.features?.['shared-library']
            return flag === undefined || flag
        },
        isSharedLibraryFeatureEnabledForPlatform () {
            return this.features['shared-library']
        },
        isSharedLibraryFeatureEnabled () {
            return this.isSharedLibraryFeatureEnabledForTeam && this.isSharedLibraryFeatureEnabledForPlatform
        },
        isBlueprintsFeatureEnabledForTeam () {
            const flag = this.team.type.properties.features?.flowBlueprints
            return flag === undefined || flag
        },
        isBlueprintsFeatureEnabledForPlatform () {
            return this.features.flowBlueprints
        },
        isBlueprintsFeatureEnabled () {
            return this.isBlueprintsFeatureEnabledForTeam && this.isBlueprintsFeatureEnabledForPlatform
        },
        isCustomCatalogsFeatureEnabledForPlatform () {
            return !!this.features.customCatalogs
        },
        isCustomCatalogsFeatureEnabledForTeam () {
            const flag = this.team.type.properties.features?.customCatalogs
            return flag === undefined || flag
        },
        isCustomCatalogsFeatureEnabled () {
            return this.isCustomCatalogsFeatureEnabledForPlatform && this.isCustomCatalogsFeatureEnabledForTeam
        },
        isStaticAssetFeatureEnabledForPlatform () {
            return !!this.features.staticAssets
        },
        isStaticAssetsFeatureEnabledForTeam () {
            return !!this.team?.type?.properties?.features?.staticAssets
        },
        isStaticAssetFeatureEnabled () {
            return this.isStaticAssetFeatureEnabledForPlatform && this.isStaticAssetsFeatureEnabledForTeam
        },
        isHTTPBearerTokensFeatureEnabledForTeam () {
            return this.settings?.features.httpBearerTokens && this.team.type.properties.features.teamHttpSecurity
        },
        isBOMFeatureEnabledForPlatform () {
            return !!this.features.bom
        },
        isBOMFeatureEnabledForTeam () {
            return !!this.team?.type?.properties?.features?.bom
        },
        isBOMFeatureEnabled () {
            return this.isBOMFeatureEnabledForPlatform && this.isBOMFeatureEnabledForTeam
        },
        isTimelineFeatureEnabledForPlatform () {
            return !!this.features.projectHistory
        },
        isTimelineFeatureEnabledForTeam () {
            return !!this.team?.type?.properties?.features?.projectHistory
        },
        isTimelineFeatureEnabled () {
            return this.isTimelineFeatureEnabledForPlatform && this.isTimelineFeatureEnabledForTeam
        },
        isMqttBrokerFeatureEnabledForPlatform () {
            return !!this.features.teamBroker
        },
        isMqttBrokerFeatureEnabledForTeam () {
            return !!this.team?.type?.properties?.features?.teamBroker
        },
        isMqttBrokerFeatureEnabled () {
            return this.isMqttBrokerFeatureEnabledForPlatform && this.isMqttBrokerFeatureEnabledForTeam
        }
    }
}
