import { mapState } from 'vuex'

export default {
    computed: {
        ...mapState('account', ['features']),
        isSharedLibraryFeatureEnabledForTeam () {
            const flag = this.team.type.properties.features?.['shared-library']
            return flag === undefined || flag
        },
        isSharedLibraryFeatureEnabledForPlatform () {
            return this.features['shared-library']
        },
        isSharedLibraryFeatureEnabled () {
            return this.isSharedLibraryFeatureEnabledForTeam && this.isSharedLibraryFeatureEnabledForPlatform
        }
    }
}
