<template>
    <SectionTopMenu>
        <template #hero>
            <div class="page-toggle">
                <div class="title">
                    <span>View:</span>
                </div>
                <div class="toggle">
                    <router-link :to="{name: 'instance-snapshots'}">Snapshots</router-link>
                    <router-link :to="{name: 'instance-version-history-timeline'}">Timeline</router-link>
                </div>
            </div>
        </template>
        <template #helptext>
            <p>Snapshots generate a point-in-time backup of your Node-RED flow, credentials and runtime settings.</p>
            <p>Snapshots are also required for deploying to devices. In the Deployments page of a Project, you can define your “Target Snapshot”, which will then be deployed to all connected devices.</p>
            <p>You can also generate Snapshots directly from any instance of Node-RED using the <a target="_blank" href="https://github.com/FlowFuse/nr-tools-plugin">FlowFuse NR Tools Plugin.</a></p>
        </template>
        <template #tools>
            <section class="flex gap-2 items-center self-center">
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
                    :disabled="busy"
                    @click="showCreateSnapshotDialog"
                >
                    <template #icon-left><PlusSmIcon /></template>Create Snapshot
                </ff-button>
            </section>
        </template>
    </SectionTopMenu>

    <router-view
        :instance="instance"
        @show-import-snapshot-dialog="showImportSnapshotDialog"
        @show-create-snapshot-dialog="showCreateSnapshotDialog"
        @instance-updated="$emit('instance-updated')"
    />

    <SnapshotCreateDialog ref="snapshotCreateDialog" data-el="dialog-create-snapshot" :project="instance" @snapshot-created="snapshotCreated" />
    <SnapshotImportDialog
        ref="snapshotImportDialog"
        title="Upload Snapshot"
        data-el="dialog-import-snapshot"
        :owner="instance"
        owner-type="instance"
        @snapshot-import-success="onSnapshotImportSuccess"
        @snapshot-import-failed="onSnapshotImportFailed"
        @canceled="onSnapshotImportCancel"
    />
</template>

<script>
import { PlusSmIcon, UploadIcon } from '@heroicons/vue/outline'

import SectionTopMenu from '../../../components/SectionTopMenu.vue'
import SnapshotImportDialog from '../../../components/dialogs/SnapshotImportDialog.vue'

import permissionsMixin from '../../../mixins/Permissions.js'
import Alerts from '../../../services/alerts.js'

import SnapshotCreateDialog from './Snapshots/dialogs/SnapshotCreateDialog.vue'

export default {
    name: 'VersionHistory',
    components: {
        SnapshotImportDialog,
        SnapshotCreateDialog,
        PlusSmIcon,
        UploadIcon,
        SectionTopMenu
    },
    mixins: [permissionsMixin],
    inheritAttrs: false,
    props: {
        instance: {
            type: Object,
            required: true
        }
    },
    emits: ['instance-updated'],
    data () {
        return {
            busyMakingSnapshot: false,
            busyImportingSnapshot: false,
            currentPage: true
        }
    },
    computed: {
        busy () {
            return this.busyMakingSnapshot || this.busyImportingSnapshot
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
            // on next tick, update the table data to ensure
            // the new snapshot is shown and the correct status are shown
            this.$emit('instance-updated')
        },
        onSnapshotImportSuccess (snapshot) {
            this.$emit('instance-updated')
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
.page-toggle {
    display: flex;
    gap: 15px;
    align-items: center;

    .title {
        color: $ff-black;
        font-weight: 400;
    }

    .toggle {
        border: 1px solid $ff-blue-800;
        display: flex;
        gap: 10px;
        border-radius: 5px;

        a {
            padding: 5px 10px;
            margin: 1px;
            border-radius: 5px;
            transition: ease-in-out .2s;

            &.router-link-active {
                background: $ff-blue-800;
                color: $ff-white;
            }
        }
    }
}
</style>
