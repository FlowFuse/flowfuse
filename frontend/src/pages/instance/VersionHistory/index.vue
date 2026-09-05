<template>
    <SectionTopMenu>
        <template #hero>
            <toggle-button-group :buttons="pageToggle" class="page-toggle" data-nav="page-toggle" :title="$t('ui.view')" :visually-hide-title="true" />
        </template>
        <template #pictogram>
            <img v-if="$route.name.includes('timeline')" alt="info" src="../../../images/pictograms/timeline_red.png">
            <img v-else-if="$route.name.includes('snapshots')" alt="info" src="../../../images/pictograms/snapshot_red.png">
        </template>
        <template #helptext>
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
            <section class="flex gap-2 items-center self-center">
                <ff-button
                    v-if="hasPermission('snapshot:import', { application: instance.application })"
                    kind="secondary"
                    class="ff-btn-icon"
                    data-action="import-snapshot"
                    @click="showImportSnapshotDialog"
                >
                    <template #icon-left><ArrowUpTrayIcon /></template>
                    <span class="hidden sm:inline upload-snapshot-text">{{ $t('ui.uploadSnapshot') }}</span>
                </ff-button>
                <ff-button
                    v-if="hasPermission('project:snapshot:create', { application: instance.application })"
                    kind="primary"
                    class="ff-btn-icon"
                    data-action="create-snapshot"
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
                :instance="instance"
                :reloadHooks="reloadHooks"
                @show-import-snapshot-dialog="showImportSnapshotDialog"
                @show-create-snapshot-dialog="showCreateSnapshotDialog"
                @instance-updated="$emit('instance-updated')"
            />
        </transition>
    </router-view>

    <SnapshotCreateDialog
        ref="snapshotCreateDialog"
        data-el="dialog-create-snapshot"
        :project="instance"
        @snapshot-created="snapshotCreated"
    />
    <SnapshotImportDialog
        ref="snapshotImportDialog"
        :title="$t('ui.uploadSnapshot')"
        data-el="dialog-import-snapshot"
        :owner="instance"
        owner-type="instance"
        @snapshot-import-success="onSnapshotImportSuccess"
        @snapshot-import-failed="onSnapshotImportFailed"
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

import SnapshotCreateDialog from './Snapshots/dialogs/SnapshotCreateDialog.vue'

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
        instance: {
            type: Object,
            required: true
        }
    },
    emits: ['instance-updated'],
    setup () {
        const { hasPermission } = usePermissions()

        return { hasPermission }
    },
    data () {
        return {
            reloadHooks: []
        }
    },
    computed: {
        pageToggle () {
            if (this.$route.name.includes('editor')) {
                return [
                    {
                        title: t('ui.snapshots'),
                        to: {
                            name: (() => (this.$route.name.startsWith('instance-editor')
                                ? 'instance-editor-snapshots'
                                : 'instance-snapshots'))(),
                            params: this.$route.params
                        }
                    },
                    {
                        title: t('ui.timeline'),
                        to: {
                            name: (() => (this.$route.name.startsWith('instance-editor')
                                ? 'instance-editor-version-history-timeline'
                                : 'instance-version-history-timeline'))(),
                            params: this.$route.params
                        }
                    }
                ]
            }

            return [
                { title: t('ui.snapshots'), to: { name: 'instance-snapshots', params: this.$route.params } },
                { title: t('ui.timeline'), to: { name: 'instance-version-history-timeline', params: this.$route.params } }
            ]
        }
    },
    methods: {
        showCreateSnapshotDialog () {
            this.$refs.snapshotCreateDialog.show()
        },
        showImportSnapshotDialog () {
            this.busyImportingSnapshot = true
            this.$refs.snapshotImportDialog.show()
        },
        snapshotCreated (snapshot) {
            this.$emit('instance-updated')
            this.reloadHooks.push({ event: 'snapshot-created', payload: snapshot })
        },
        onSnapshotImportSuccess (snapshot) {
            this.$emit('instance-updated')
            this.reloadHooks.push({ event: 'snapshot-imported', payload: snapshot })
        },
        onSnapshotImportFailed (err) {
            const message = err.response?.data?.error || 'Failed to import snapshot.'
            Alerts.emit(message, 'warning')
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
