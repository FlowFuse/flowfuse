<template>
    <SectionTopMenu>
        <template #hero>
            <toggle-button-group :buttons="pageToggle" data-nav="page-toggle" title="View" />
        </template>
        <template #pictogram>
            <img v-if="$route.name.includes('timeline')" alt="info" src="../../../images/pictograms/timeline_red.png">
            <img v-else-if="$route.name.includes('snapshots')" alt="info" src="../../../images/pictograms/snapshot_red.png">
        </template>
        <template #helptext>
            <template v-if="$route.name.includes('timeline')">
                <p>The <b>Timeline</b> provides a concise, chronological view of key activities within your Node-RED instance.</p>
                <p>It tracks various events such as pipeline stage deployments, snapshot restorations, flow deployments, snapshot creations, and updates to instance settings.</p>
                <p>This compact view helps you quickly understand the history of your instance, offering clear insight into when and what changes have been made.</p>
            </template>
            <template v-else-if="$route.name.includes('snapshots')">
                <p><b>Snapshots</b> generate a point-in-time backup of your Node-RED flow, credentials and runtime settings.</p>
                <p>Snapshots are also required for deploying to devices. In the Deployments page of a Project, you can define your “Target Snapshot”, which will then be deployed to all connected devices.</p>
                <p>You can also generate Snapshots directly from any instance of Node-RED using the <a target="_blank" href="https://github.com/FlowFuse/nr-tools-plugin">FlowFuse NR Tools Plugin.</a></p>
            </template>
        </template>
        <template #tools>
            <section class="flex gap-2 items-center self-center truncate">
                <ff-checkbox
                    v-model="showDeviceSnapshotsOnly"
                    v-ff-tooltip:left="'Untick this to show snapshots from other Instances within this application'"
                    data-form="device-only-snapshots"
                    label="Instance Snapshots Only"
                    class="truncate"
                />
                <ff-button
                    v-if="hasPermission('snapshot:import')"
                    kind="secondary"
                    data-action="import-snapshot"
                    :disabled="busy"
                    @click="showImportSnapshotDialog"
                >
                    <template #icon-left><UploadIcon /></template>Upload Snapshot
                </ff-button>
                <ff-button
                    kind="primary"
                    data-action="create-snapshot"
                    :disabled="!developerMode || busy"
                    @click="showCreateSnapshotDialog"
                >
                    <template #icon-left><PlusSmIcon /></template>Create Snapshot
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
            />
        </transition>
    </router-view>

    <SnapshotCreateDialog
        ref="snapshotCreateDialog"
        title="Create Device Snapshot"
        data-el="dialog-create-device-snapshot"
        :show-set-as-target="true"
        :device="device"
        @device-upload-success="onSnapshotCreated"
        @device-upload-failed="onSnapshotFailed"
        @canceled="onSnapshotCancel"
    />
    <SnapshotImportDialog
        ref="snapshotImportDialog"
        title="Upload Snapshot"
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
import { PlusSmIcon, UploadIcon } from '@heroicons/vue/outline'

import SectionTopMenu from '../../../components/SectionTopMenu.vue'
import SnapshotImportDialog from '../../../components/dialogs/SnapshotImportDialog.vue'
import ToggleButtonGroup from '../../../components/elements/ToggleButtonGroup.vue'

import permissionsMixin from '../../../mixins/Permissions.js'
import Alerts from '../../../services/alerts.js'

import SnapshotCreateDialog from '../dialogs/SnapshotCreateDialog.vue'

export default {
    name: 'VersionHistory',
    components: {
        ToggleButtonGroup,
        SnapshotImportDialog,
        SnapshotCreateDialog,
        PlusSmIcon,
        UploadIcon,
        SectionTopMenu
    },
    mixins: [permissionsMixin],
    inheritAttrs: false,
    props: {
        device: {
            type: Object,
            required: true
        }
    },
    emits: ['instance-updated'],
    data () {
        return {
            reloadHooks: [],
            pageToggle: [
                { title: 'Snapshots', to: { name: 'device-snapshots', params: this.$route.params } },
                { title: 'Timeline', to: { name: 'device-version-history-timeline', params: this.$route.params } }
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
</style>
