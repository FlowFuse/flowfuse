<template>
    <div class="ff-instance-assets">
        <div class="banner-wrapper">
            <FeatureUnavailable v-if="!isStaticAssetFeatureEnabledForPlatform" />
            <FeatureUnavailableToTeam v-else-if="!isStaticAssetsFeatureEnabledForTeam" />
            <FeatureUnavailable
                v-else-if="!launcherSatisfiesVersion"
                :message="launcherVersionMessage"
                :only-custom-message="true"
            />
        </div>
        <FolderBreadcrumbs
            :breadcrumbs="breadcrumbs"
            :instance="instance"
            @go-back="goBack"
            @selected-visibility="onVisibilitySelected"
        />
        <FileBrowser
            :breadcrumbs="breadcrumbs"
            :items="sortedFiles"
            :instance="instance"
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
import Alerts from '../../services/alerts.js'

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
        return {
            breadcrumbs: [],
            files: [],
            launcherVersionMessage: 'You are using an incompatible Launcher Version. You need to upgrade to => 2.8.0 in order to use this feature.',
            instanceSuspendedMessage: 'The instance must be running to access its assets.'
        }
    },
    computed: {
        currentDirectory () {
            if (this.breadcrumbs.length) {
                return this.breadcrumbs[this.breadcrumbs.length - 1]
            }
            return null
        },
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
                this.loadContents(this.breadcrumbs, true)
            } else {
                this.files = []
            }
        },
        currentDirectory (currentDirectory, previousDirectory) {
            if (currentDirectory?.name !== previousDirectory?.name) {
                this.loadContents()
            }
        }
    },
    mounted () {
        this.loadContents()
    },
    methods: {
        loadContents (breadcrumbs = [], reloadDirectory = false) {
            if (this.isFeatureEnabled) {
                if (breadcrumbs.length === 0) {
                    breadcrumbs = this.breadcrumbs
                }

                const filepath = breadcrumbs.map(crumb => crumb.name).join('/')
                return AssetsAPI.getFiles(this.instance.id, filepath)
                    .then(payload => {
                        this.files = payload.files
                        if (payload.folder && reloadDirectory) {
                            this.breadcrumbs[this.breadcrumbs.length - 1] = payload.folder
                        }
                    })
                    .catch(error => {
                        console.error(error)
                    })
            }
        },
        changeDirectory (dir) {
            if (dir.name) {
                this.breadcrumbs.push(dir)
            }
        },
        goBack () {
            this.breadcrumbs.pop()
            if (this.breadcrumbs.length === 0) {
                this.changeDirectory(null)
            } else {
                this.changeDirectory(this.breadcrumbs.pop())
            }
        },
        onVisibilitySelected (payload) {
            const pwd = this.breadcrumbs
                .map(crumb => crumb.name)
                .join('/')
                .replace('//', '/')

            AssetsAPI.updateVisibility(
                this.instance.id,
                pwd,
                payload.visibility,
                payload.path
            )
                .then((res) => this.loadContents())
                .then((res) => Alerts.emit('Instance settings successfully updated. Restart the instance to apply the changes.', 'confirmation', 6000))
                .catch(err => console.warn(err))
        }
    }
}
</script>

<style lang="scss">
.banner-wrapper > div {
  margin-top: 0;
}
</style>
