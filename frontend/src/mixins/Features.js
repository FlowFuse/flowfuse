import { mapGetters, mapState } from 'vuex'

export default {
    computed: {
        ...mapState('account', ['features', 'team']),
        ...mapGetters('account', ['featuresCheck']),
        isSharedLibraryFeatureEnabledForTeam () {
            return this.featuresCheck.isSharedLibraryFeatureEnabledForTeam
        },
        isSharedLibraryFeatureEnabledForPlatform () {
            return this.featuresCheck.isSharedLibraryFeatureEnabledForPlatform
        },
        isSharedLibraryFeatureEnabled () {
            return this.featuresCheck.isSharedLibraryFeatureEnabled
        },
        isBlueprintsFeatureEnabledForTeam () {
            return this.featuresCheck.isBlueprintsFeatureEnabledForTeam
        },
        isBlueprintsFeatureEnabledForPlatform () {
            return this.featuresCheck.isBlueprintsFeatureEnabledForPlatform
        },
        isBlueprintsFeatureEnabled () {
            return this.featuresCheck.isBlueprintsFeatureEnabled
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
            return this.featuresCheck.isMqttBrokerFeatureEnabledForPlatform
        },
        isMqttBrokerFeatureEnabledForTeam () {
            return this.featuresCheck.isMqttBrokerFeatureEnabledForTeam
        },
        isMqttBrokerFeatureEnabled () {
            return this.featuresCheck.isMqttBrokerFeatureEnabled
        }
    }
}
