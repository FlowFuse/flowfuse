<template>
    <div class="ff-instance-assets">
        <div class="banner-wrapper">
            <FeatureUnavailable v-if="!isStaticAssetFeatureEnabledForPlatform" />
            <FeatureUnavailableToTeam v-else-if="!isStaticAssetsFeatureEnabledForTeam" />
            <FeatureUnavailable v-else-if="!launcherSatisfiesVersion" :message="launcherVersionMessage" :only-custom-message="true" />
        </div>
        <FolderBreadcrumbs
            :breadcrumbs="breadcrumbs"
            @clicked="breadcrumbClicked"
            @go-back="goBack"
            @selected-visibility="onVisibilitySelected"
        />
        <FileBrowser
            :breadcrumbs="breadcrumbs"
            :folder="currentDirectory" :items="sortedFiles"
            :disabled="!isFeatureEnabled"
            :no-data-message="!isInstanceRunning ? instanceSuspendedMessage : ''"
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

import FolderBreadcrumbs from './components/FolderBreadcrumbs.vue'

export default {
    name: 'InstanceAssets',
    components: {
        FolderBreadcrumbs,
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
            launcherVersionMessage: 'You are using an incompatible Launcher Version. You need to upgrade to => 2.8.0 in order to use this feature.',
            instanceSuspendedMessage: 'The instance must be running to access its assets.'
        }
    },
    computed: {
        launcherSatisfiesVersion () {
            if (!this.isInstanceRunning) {
                return true
            }

            const nrLauncherVersion = SemVer.coerce(this.instance?.meta?.versions?.launcher)
            return SemVer.satisfies(nrLauncherVersion, '>=2.8.0')
        },
        isFeatureEnabled () {
            return this.isStaticAssetFeatureEnabledForPlatform &&
                this.isStaticAssetsFeatureEnabledForTeam &&
                this.launcherSatisfiesVersion &&
                this.isInstanceRunning
        },
        isInstanceRunning () {
            return this.instance?.meta?.state === 'running'
        },
        sortedFiles () {
            const files = this.files.filter(file => file.type === 'file').sort()
            const folders = this.files.filter(file => file.type === 'directory').sort()

            return [...folders, ...files]
        }
    },
    watch: {
        isInstanceRunning (newState, oldState) {
            if (newState && !oldState) {
                this.loadContents()
            } else {
                this.files = []
            }
        }
    },
    mounted () {
        this.loadContents()
    },
    methods: {
        loadContents () {
            if (this.isFeatureEnabled) {
                const filepath = this.breadcrumbs.join('/')
                AssetsAPI.getFiles(this.instance.id, filepath)
                    .then(files => {
                        this.files = files
                    })
                    .catch(error => {
                        console.error(error)
                    })
            }
        },
        changeDirectory (dir) {
            this.currentDirectory.name = dir.name
            if (this.currentDirectory.name) {
                this.breadcrumbs.push(this.currentDirectory.name)
            }
            this.loadContents()
        },
        breadcrumbClicked ($index) {
            this.currentDirectory.name = this.breadcrumbs[$index] || ''
            this.breadcrumbs = this.breadcrumbs.slice(0, $index)
            this.loadContents()
        },
        goBack (dir) {
            this.breadcrumbs.pop()
            if (this.breadcrumbs.length === 0) {
                this.changeDirectory({ name: null })
            } else {
                this.changeDirectory({ name: this.breadcrumbs.pop() })
            }
        },
        onVisibilitySelected (payload) {
            AssetsAPI.updateVisibility(
                this.instance.id,
                this.breadcrumbs.join('/').replace('//', '/'),
                payload.visibility,
                payload.path
            ).then((res) => {
                this.loadContents()
            }).catch(err => {
                console.log(err)
            })
        }
    }
}
</script>

<style lang="scss">
.banner-wrapper > div{
  margin-top: 0;
}
</style>
