import { mapGetters, mapState } from 'vuex'

export default {
    // todo The account store's featuresCheck getter should be used instead of this mixin
    //  Currently keeping it for backwards compat, as all permissions checks should use the accounts featuresCheck getter
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
            return this.featuresCheck.isCustomCatalogsFeatureEnabledForPlatform
        },
        isCustomCatalogsFeatureEnabledForTeam () {
            return this.featuresCheck.isCustomCatalogsFeatureEnabledForTeam
        },
        isCustomCatalogsFeatureEnabled () {
            return this.featuresCheck.isCustomCatalogsFeatureEnabled
        },
        isStaticAssetFeatureEnabledForPlatform () {
            return this.featuresCheck.isStaticAssetFeatureEnabledForPlatform
        },
        isStaticAssetsFeatureEnabledForTeam () {
            return this.featuresCheck.isStaticAssetsFeatureEnabledForTeam
        },
        isStaticAssetFeatureEnabled () {
            return this.featuresCheck.isStaticAssetFeatureEnabled
        },
        isHTTPBearerTokensFeatureEnabledForPlatform () {
            return this.featuresCheck.isHTTPBearerTokensFeatureEnabledForPlatform
        },
        isHTTPBearerTokensFeatureEnabledForTeam () {
            return this.featuresCheck.isHTTPBearerTokensFeatureEnabledForTeam
        },
        isHTTPBearerTokensFeatureEnabled () {
            return this.featuresCheck.isHTTPBearerTokensFeatureEnabled
        },
        isBOMFeatureEnabledForPlatform () {
            return this.featuresCheck.isBOMFeatureEnabledForPlatform
        },
        isBOMFeatureEnabledForTeam () {
            return this.featuresCheck.isBOMFeatureEnabledForTeam
        },
        isBOMFeatureEnabled () {
            return this.featuresCheck.isBOMFeatureEnabled
        },
        isTimelineFeatureEnabledForPlatform () {
            return this.featuresCheck.isTimelineFeatureEnabledForPlatform
        },
        isTimelineFeatureEnabledForTeam () {
            return this.featuresCheck.isTimelineFeatureEnabledForTeam
        },
        isTimelineFeatureEnabled () {
            return this.featuresCheck.isTimelineFeatureEnabled
        },
        isMqttBrokerFeatureEnabledForPlatform () {
            return this.featuresCheck.isMqttBrokerFeatureEnabledForPlatform
        },
        isMqttBrokerFeatureEnabledForTeam () {
            return this.featuresCheck.isMqttBrokerFeatureEnabledForTeam
        },
        isMqttBrokerFeatureEnabled () {
            return this.featuresCheck.isMqttBrokerFeatureEnabled
        },
        isInstanceResourcesFeatureEnabledForPlatform () {
            return this.featuresCheck.isInstanceResourcesFeatureEnabledForPlatform
        },
        isInstanceResourcesFeatureEnabledForTeam () {
            return this.featuresCheck.isInstanceResourcesFeatureEnabledForTeam
        }
    }
}
