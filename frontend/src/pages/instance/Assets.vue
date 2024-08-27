<template>
    <div class="ff-instance-assets">
        <FeatureUnavailable v-if="!launcherSatisfiesVersion" :message="launcherVersionMessage" :only-custom-message="true" />
        <FeatureUnavailable v-else-if="!isStaticAssetFeatureEnabledForPlatform" />
        <FeatureUnavailableToTeam v-else-if="!isStaticAssetsFeatureEnabledForTeam" />
        <div class="ff-breadcrumbs disable-last mb-7">
            <template v-if="breadcrumbs.length > 0">
                <span v-for="(crumb, $index) in breadcrumbs" :key="$index" class="flex mr-1 gap-1 items-center">
                    <span>/</span>
                    <label @click="breadcrumbClicked($index)">{{ crumb || 'Storage' }}</label>
                </span>
            </template>
            <span class="flex gap-1 items-center">
                <span>/</span>
                <label>{{ currentDirectory.name || 'Storage' }}</label>
                <span>/</span>
            </span>
        </div>
        <FileBrowser
            :breadcrumbs="breadcrumbs"
            :folder="currentDirectory" :items="files"
            :disabled="!isFeatureEnabled"
            @items-updated="loadContents"
            @change-directory="changeDirectory"
        />
    </div>
</template>

<script>
import SemVer from 'semver'

import AssetsAPI from '../../api/assets.js'
import FeatureUnavailable from '../../components/banners/FeatureUnavailable.vue'
import FeatureUnavailableToTeam from '../../components/banners/FeatureUnavailableToTeam.vue'
import FileBrowser from '../../components/file-browser/FileBrowser.vue'
import featuresMixin from '../../mixins/Features.js'
import permissionsMixin from '../../mixins/Permissions.js'

export default {
    name: 'InstanceAssets',
    components: {
        FeatureUnavailable,
        FeatureUnavailableToTeam,
        FileBrowser
    },
    mixins: [permissionsMixin, featuresMixin],
    inheritAttrs: false,
    props: {
        instance: {
            required: true,
            type: Object
        }
    },
    data () {
        // const breadcrumbs = this.$route.params.filePath
        // const dir = breadcrumbs.pop() || '/'
        return {
            breadcrumbs: [],
            // default current directory
            currentDirectory: {
                name: null
            },
            files: [],
            launcherVersionMessage: 'You are using an incompatible Launcher Version. You need to upgrade to => 2.8.0 in order to use this feature.'
        }
    },
    computed: {
        launcherSatisfiesVersion () {
            const nrLauncherVersion = SemVer.coerce(this.instance?.meta?.versions?.launcher)
            return SemVer.satisfies(nrLauncherVersion, '>=2.8.0')
        },
        isFeatureEnabled () {
            return this.isStaticAssetFeatureEnabledForPlatform &&
                this.isStaticAssetsFeatureEnabledForTeam &&
                this.launcherSatisfiesVersion
        }
    },
    mounted () {
        if (this.isFeatureEnabled) {
            this.loadContents()
        }
    },
    methods: {
        loadContents () {
            const breadcrumbs = this.breadcrumbs.join('/')
            const path = breadcrumbs + (breadcrumbs.length > 0 ? '/' : '') + (this.currentDirectory.name || '')
            AssetsAPI.getFiles(this.instance.id, path)
                .then(files => {
                    this.files = files
                })
                .catch(error => {
                    console.error(error)
                })
        },
        changeDirectory (dir) {
            this.breadcrumbs.push(this.currentDirectory.name || '')
            this.currentDirectory.name = dir.name
            this.loadContents()
        },
        breadcrumbClicked ($index) {
            this.currentDirectory.name = this.breadcrumbs[$index] || ''
            this.breadcrumbs = this.breadcrumbs.slice(0, $index)
            this.loadContents()
        }
    }
}
</script>

<style>
</style>
