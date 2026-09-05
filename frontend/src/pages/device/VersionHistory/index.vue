<template>
    <SectionTopMenu>
        <template #hero>
            <toggle-button-group :buttons="pageToggle" data-nav="page-toggle" :title="$t('ui.view')" :visually-hide-title="true" />
        </template>
        <template v-if="!isInImmersiveMode" #pictogram>
            <img v-if="$route.name.includes('timeline')" alt="info" src="../../../images/pictograms/timeline_red.png">
            <img v-else-if="$route.name.includes('snapshots')" alt="info" src="../../../images/pictograms/snapshot_red.png">
        </template>
        <template v-if="!isInImmersiveMode" #helptext>
            <template v-if="$route.name.includes('timeline')">
                <p>{{ $t('ui.the') }}<b>{{ $t('ui.timeline') }}</b> {{ $t('ui.providesAConciseChronologicalViewOfKeyActivities') }}</p>
                <p>{{ $t('ui.itTracksVariousEventsSuchAsPipelineStageDeployme') }}</p>
                <p>{{ $t('ui.thisCompactViewHelpsYouQuicklyUnderstandTheHisto') }}</p>
            </template>
            <template v-else-if="$route.name.includes('snapshots')">
                <p><b>{{ $t('ui.snapshots') }}</b> {{ $t('ui.generateAPointInTimeBackupOfYourNodeRedFlowCrede') }}</p>
                <p>Snapshots are also required for deploying to devices. In the Deployments page of a Project, you can define your “Target Snapshot”, which will then be deployed to all connected devices.</p>
                <p>{{ $t('ui.youCanAlsoGenerateSnapshotsDirectlyFromAnyInstan') }} <a target="_blank" href="https://github.com/FlowFuse/nr-tools-plugin">{{ $t('ui.flowfuseNrToolsPlugin') }}</a></p>
            </template>
        </template>
        <template #tools>
            <section class="flex gap-2 items-center self-center flex-wrap">
                <ff-checkbox
                    v-model="showDeviceSnapshotsOnly"
                    v-ff-tooltip:left="$t('ui.untickThisToShowSnapshotsFromOtherInstancesWithi')"
                    data-form="device-only-snapshots"
                    :label="$t('ui.instanceSnapshotsOnly')"
                    class="truncate"
                />
                <ff-button
                    v-if="hasPermission('snapshot:import', { application: device.application })"
                    kind="secondary"
                    data-action="import-snapshot"
                    :disabled="busy || isOwnedByAnInstance || isUnassigned"
                    @click="showImportSnapshotDialog"
                >
                    <template #icon-left><ArrowUpTrayIcon /></template>
                    <span class="hidden sm:inline upload-snapshot-text">{{ $t('ui.uploadSnapshot') }}</span>
                </ff-button>
                <ff-button
                    v-if="hasPermission('device:snapshot:create', { application: device.application })"
                    :key="disabledSnapshotTooltipText"
                    v-ff-tooltip:left="disabledSnapshotTooltipText"
                    kind="primary"
                    data-action="create-snapshot"
                    :disabled="!canCreateSnapshot"
                    @click="showCreateSnapshotDialog"
                >
                    <template #icon-left><PlusSmallIcon /></template>
                    <span class="hidden sm:inline create-snapshot-text">{{ $t('ui.createSnapshot') }}</span>
                </ff-button>
            </section>
        </template>
    </SectionTopMenu>

    <router-view v-slot="{ Component }">
        <transition name="page-fade" mode="out-in">
            <component
                :is="Component"
                :reloadHooks="reloadHooks"
                :device="device"
                :showDeviceSnapshotsOnly="showDeviceSnapshotsOnly"
                @show-import-snapshot-dialog="showImportSnapshotDialog"
                @show-create-snapshot-dialog="showCreateSnapshotDialog"
                @instance-updated="$emit('instance-updated')"
                @device-updated="$emit('device-updated')"
            />
        </transition>
    </router-view>

    <SnapshotCreateDialog
        v-if="device"
        ref="snapshotCreateDialog"
        :title="$t('ui.createDeviceSnapshot')"
        data-el="dialog-create-device-snapshot"
        :show-set-as-target="true"
        :device="device"
        @device-upload-success="onSnapshotCreated"
        @device-upload-failed="onSnapshotFailed"
        @canceled="onSnapshotCancel"
    />
    <SnapshotImportDialog
        v-if="device"
        ref="snapshotImportDialog"
        :title="$t('ui.uploadSnapshot')"
        data-el="dialog-import-snapshot"
        :show-owner-select="false"
        :owner="device"
        owner-type="device"
        @snapshot-import-success="onSnapshotImportSuccess"
        @snapshot-import-failed="onSnapshotImportFailed"
        @canceled="onSnapshotImportCancel"
    />
</template>

<script>
import { ArrowUpTrayIcon, PlusSmallIcon } from '@heroicons/vue/24/outline'

import SectionTopMenu from '../../../components/SectionTopMenu.vue'
import SnapshotImportDialog from '../../../components/dialogs/SnapshotImportDialog.vue'
import ToggleButtonGroup from '../../../components/elements/ToggleButtonGroup.vue'
import usePermissions from '../../../composables/Permissions.js'

import { t } from '../../../i18n.js'
import Alerts from '../../../services/alerts.js'

import SnapshotCreateDialog from '../dialogs/SnapshotCreateDialog.vue'

export default {
    name: 'VersionHistory',
    components: {
        ToggleButtonGroup,
        SnapshotImportDialog,
        SnapshotCreateDialog,
        PlusSmallIcon,
        ArrowUpTrayIcon,
        SectionTopMenu
    },
    inheritAttrs: false,
    props: {
        device: {
            type: Object,
            required: true
        }
    },
    emits: ['instance-updated', 'device-updated'],
    setup () {
        const { hasPermission } = usePermissions()

        return { hasPermission }
    },
    data () {
        return {
            reloadHooks: [],
            pageToggle: [
                {
                    title: t('ui.snapshots'),
                    to: {
                        name: (() => (this.$route.name.startsWith('device-editor')
                            ? 'device-editor-snapshots'
                            : 'device-snapshots'))(),
                        params: this.$route.params
                    }
                },
                {
                    title: t('ui.timeline'),
                    to: {
                        name: (() => (this.$route.name.startsWith('device-editor')
                            ? 'device-editor-version-history-timeline'
                            : 'device-version-history-timeline'))(),
                        params: this.$route.params
                    }
                }
            ],
            showDeviceSnapshotsOnly: true,
            busyMakingSnapshot: false,
            busyImportingSnapshot: false
        }
    },
    computed: {
        developerMode () {
            return this.device?.mode === 'developer'
        },
        busy () {
            return this.busyMakingSnapshot || this.busyImportingSnapshot
        },
        isOwnedByAnInstance () {
            return this.device?.ownerType === 'instance'
        },
        isOwnedByAnApplication () {
            return this.device?.ownerType === 'application'
        },
        isUnassigned () {
            return !this.device?.ownerType
        },
        canCreateSnapshot () {
            if (!this.developerMode || this.busy) {
                return false
            }
            return this.isOwnedByAnApplication
        },
        disabledSnapshotTooltipText () {
            if (this.isOwnedByAnInstance) {
                return 'Instance must be owned by an Application to create a Snapshot'
            }
            return !this.canCreateSnapshot ? 'Instance must be in \'Developer Mode\' to create a Snapshot' : 'Capture a Snapshot of this Instance.'
        },
        isInImmersiveMode () {
            return this.$route.name.startsWith('device-editor-')
        }
    },
    methods: {
        showCreateSnapshotDialog () {
            this.busyMakingSnapshot = true
            this.$refs.snapshotCreateDialog.show()
        },
        onSnapshotCreated (snapshot) {
            this.busyMakingSnapshot = false
            this.reloadHooks.push({ event: 'snapshot-created', payload: snapshot })
        },
        onSnapshotFailed (err) {
            console.error(err)
            Alerts.emit('Failed to create snapshot of device.', 'warning')
            this.busyMakingSnapshot = false
        },
        onSnapshotCancel () {
            this.busyMakingSnapshot = false
        },
        showImportSnapshotDialog () {
            this.busyImportingSnapshot = true
            this.$refs.snapshotImportDialog.show()
        },
        onSnapshotImportSuccess (snapshot) {
            this.reloadHooks.push({ event: 'snapshot-imported', payload: snapshot })
            this.busyImportingSnapshot = false
        },
        onSnapshotImportFailed (err) {
            console.error(err)
            const message = err.response?.data?.error || 'Failed to import snapshot.'
            Alerts.emit(message, 'warning')
            this.busyImportingSnapshot = false
        },
        onSnapshotImportCancel () {
            this.busyImportingSnapshot = false
        }
    }
}
</script>

<style scoped lang="scss">
.page-fade-enter-active, .page-fade-leave-active {
    transition: opacity .2s ease-in-out;
}

.page-fade-enter, .page-fade-leave-to {
    opacity: 0;
}

// Viewport-based responsive behavior (matches Tailwind sm: breakpoint)
// Hide button text on narrow viewports (< 640px)
@media (max-width: 639px) {
    .upload-snapshot-text,
    .create-snapshot-text {
        display: none;
    }
}

// Show button text on wider viewports (>= 640px)
@media (min-width: 640px) {
    .upload-snapshot-text,
    .create-snapshot-text {
        display: inline;
    }
}

// Container query for drawer context - responsive button behavior
// Breakpoint matches DRAWER_MOBILE_BREAKPOINT constant in Editor/index.vue
// These override viewport-based rules when inside the drawer
@container drawer (max-width: 639px) {
    // Hide text when drawer is narrow - icon-only mode
    .upload-snapshot-text,
    .create-snapshot-text {
        display: none;
    }
}

@container drawer (min-width: 640px) {
    // Show text when drawer is wide enough
    .upload-snapshot-text,
    .create-snapshot-text {
        display: inline;
    }
}

</style>
