<template>
    <div class="mb-3">
        <SectionTopMenu hero="Snapshots" help-header="FlowFuse - Snapshots">
            <template #helptext>
                <p>Snapshots generate a point-in-time backup of your Node-RED flow, credentials and runtime settings.</p>
                <p>Snapshots are also required for deploying to devices. In the Deployments page of a Project, you can define your “Target Snapshot”, which will then be deployed to all connected devices.</p>
                <p>You can also generate Snapshots directly from any instance of Node-RED using the <a target="_blank" href="https://github.com/FlowFuse/nr-tools-plugin">FlowFuse NR Tools Plugin.</a></p>
            </template>
            <template #tools>
                <div class="space-x-2 flex align-center">
                    <ff-checkbox v-model="showDeviceSnapshotsOnly" v-ff-tooltip:left="'Untick this to show snapshots from other devices and instances within this application'" data-form="device-only-snapshots" label="Show only Snapshots created by this device" />
                </div>
            </template>
        </SectionTopMenu>
    </div>
    <div class="space-y-6">
        <ff-loading v-if="loading" message="Loading Snapshots..." />
        <template v-if="features.deviceEditor && snapshots.length > 0">
            <ff-data-table data-el="snapshots" class="space-y-4" :columns="columns" :rows="snapshots" :show-search="true" search-placeholder="Search Snapshots...">
                <template v-if="hasPermission('device:snapshot:create')" #actions>
                    <ff-button v-if="hasPermission('snapshot:import')" kind="secondary" data-action="import-snapshot" :disabled="busy" @click="showImportSnapshotDialog"><template #icon-left><UploadIcon /></template>Upload Snapshot</ff-button>
                    <ff-button kind="primary" data-action="create-snapshot" :disabled="!developerMode || busy" @click="showCreateSnapshotDialog"><template #icon-left><PlusSmIcon /></template>Create Snapshot</ff-button>
                </template>
                <template #context-menu="{row}">
                    <ff-list-item :disabled="!canDeploy(row)" label="Deploy Snapshot" @click="showDeploySnapshotDialog(row)" />
                    <ff-list-item :disabled="!hasPermission('snapshot:edit')" label="Edit Snapshot" @click="showEditSnapshotDialog(row)" />
                    <ff-list-item :disabled="!hasPermission('snapshot:full')" label="View Snapshot" @click="showViewSnapshotDialog(row)" />
                    <ff-list-item :disabled="!hasPermission('snapshot:full')" label="Compare Snapshot..." @click="showCompareSnapshotDialog(row)" />
                    <ff-list-item :disabled="!canDownload(row)" label="Download Snapshot" @click="showDownloadSnapshotDialog(row)" />
                    <ff-list-item :disabled="!hasPermission('device:snapshot:read')" label="Download package.json" @click="downloadSnapshotPackage(row)" />
                    <ff-list-item :disabled="!canDelete(row)" label="Delete Snapshot" kind="danger" @click="showDeleteSnapshotDialog(row)" />
                </template>
            </ff-data-table>
        </template>
        <template v-else-if="!loading">
            <EmptyState :feature-unavailable="!features.deviceEditor" :feature-unavailable-message="'This requires Developer Mode on Devices, which is a FlowFuse Enterprise Feature'">
                <template #img>
                    <img src="../../../images/empty-states/instance-snapshots.png">
                </template>
                <template #header>Create your First Snapshot</template>
                <template #message>
                    <p>
                        Snapshots are point-in-time backups of your Node-RED Instances
                        and capture the flows, credentials and runtime settings.
                    </p>
                    <p v-if="device.ownerType !== 'application'" class="block">
                        A device must first be <a class="ff-link" href="https://flowfuse.com/docs/device-agent/register/#assign-the-device-to-an-application" target="_blank" rel="noreferrer">assigned to an Application</a>, in order to create snapshots.
                    </p>
                    <p v-else-if="!developerMode" class="block">
                        A device must be in developer mode and online to create a snapshot.
                    </p>
                </template>
                <template v-if="hasPermission('device:snapshot:create')" #actions>
                    <ff-button v-if="hasPermission('snapshot:import')" kind="secondary" :disabled="busy || !features.deviceEditor || device.ownerType !== 'application'" data-action="import-snapshot" @click="showImportSnapshotDialog">
                        <template #icon-left><UploadIcon /></template>Upload Snapshot
                    </ff-button>
                    <ff-button kind="primary" :disabled="!developerMode || busy || !features.deviceEditor || device.ownerType !== 'application'" data-action="create-snapshot" @click="showCreateSnapshotDialog">
                        <template #icon-left><PlusSmIcon /></template>Create Snapshot
                    </ff-button>
                </template>
            </EmptyState>
        </template>
        <SnapshotCreateDialog ref="snapshotCreateDialog" title="Create Device Snapshot" data-el="dialog-create-device-snapshot" :show-set-as-target="true" :device="device" @device-import-success="onSnapshotCreated" @device-import-failed="onSnapshotFailed" @canceled="onSnapshotCancel" />
        <SnapshotExportDialog ref="snapshotExportDialog" data-el="dialog-export-snapshot" />
        <SnapshotEditDialog ref="snapshotEditDialog" data-el="dialog-edit-snapshot" @snapshot-updated="onSnapshotEdit" />
        <SnapshotImportDialog ref="snapshotImportDialog" title="Upload Snapshot" data-el="dialog-import-snapshot" :show-owner-select="false" :owner="device" owner-type="device" @snapshot-import-success="onSnapshotImportSuccess" @snapshot-import-failed="onSnapshotImportFailed" @canceled="onSnapshotImportCancel" />
        <AssetDetailDialog ref="snapshotViewerDialog" data-el="dialog-view-snapshot" />
        <AssetCompareDialog ref="snapshotCompareDialog" data-el="dialog-compare-snapshot" />
    </div>
</template>

<script>
import { PlusSmIcon, UploadIcon } from '@heroicons/vue/outline'
import { markRaw } from 'vue'
import { mapState } from 'vuex'

import ApplicationApi from '../../../api/application.js'
import DeviceApi from '../../../api/devices.js'
import SnapshotApi from '../../../api/snapshots.js'

import EmptyState from '../../../components/EmptyState.vue'
import SectionTopMenu from '../../../components/SectionTopMenu.vue'
import AssetCompareDialog from '../../../components/dialogs/AssetCompareDialog.vue'
import AssetDetailDialog from '../../../components/dialogs/AssetDetailDialog.vue'
import SnapshotEditDialog from '../../../components/dialogs/SnapshotEditDialog.vue'
import SnapshotImportDialog from '../../../components/dialogs/SnapshotImportDialog.vue'
import UserCell from '../../../components/tables/cells/UserCell.vue'
import { downloadData } from '../../../composables/Download.js'
import permissionsMixin from '../../../mixins/Permissions.js'
import Alerts from '../../../services/alerts.js'
import Dialog from '../../../services/dialog.js'
import { applySystemUserDetails } from '../../../transformers/snapshots.transformer.js'
import DaysSince from '../../application/Snapshots/components/cells/DaysSince.vue'
import SnapshotName from '../../application/Snapshots/components/cells/SnapshotName.vue'
import SnapshotSource from '../../application/Snapshots/components/cells/SnapshotSource.vue'
import SnapshotExportDialog from '../../application/Snapshots/components/dialogs/SnapshotExportDialog.vue'

import SnapshotCreateDialog from '../dialogs/SnapshotCreateDialog.vue'

export default {
    name: 'DeviceSnapshots',
    components: {
        SectionTopMenu,
        EmptyState,
        SnapshotCreateDialog,
        SnapshotEditDialog,
        SnapshotImportDialog,
        SnapshotExportDialog,
        AssetDetailDialog,
        AssetCompareDialog,
        PlusSmIcon,
        UploadIcon
    },
    mixins: [permissionsMixin],
    inheritAttrs: false,
    props: {
        device: {
            type: Object,
            required: true
        }
    },
    emits: ['device-updated'],
    data () {
        return {
            loading: false,
            deviceCounts: {},
            showDeviceSnapshotsOnly: true,
            snapshots: [],
            busyMakingSnapshot: false,
            busyImportingSnapshot: false
        }
    },
    computed: {
        ...mapState('account', ['teamMembership', 'features']),
        columns () {
            const cols = [
                {
                    label: 'Snapshot',
                    class: ['w-56 sm:w-48'],
                    component: {
                        is: markRaw(SnapshotName),
                        extraProps: {
                            // targetSnapshot: this.instance.deviceSettings?.targetSnapshot
                        }
                    }
                },
                {
                    label: 'Source',
                    class: ['w-56'],
                    key: '_ownerSortKey',
                    // sortable: !this.moreThanOnePage,
                    component: {
                        is: markRaw(SnapshotSource)
                    }
                },
                {
                    label: 'Created By',
                    class: ['w-48 hidden md:table-cell'],
                    component: {
                        is: markRaw(UserCell),
                        map: {
                            avatar: 'user.avatar',
                            name: 'user.name',
                            username: 'user.username'
                        }
                    }
                },
                {
                    label: 'Date Created',
                    class: ['w-48 hidden sm:table-cell'],
                    component: { is: markRaw(DaysSince), map: { date: 'createdAt' } }
                }
            ]
            return cols
        },
        developerMode () {
            return this.device?.mode === 'developer'
        },
        busy () {
            return this.busyMakingSnapshot || this.busyImportingSnapshot
        },
        snapshotList () {
            return this.snapshots.map(s => {
                return {
                    label: s.name,
                    description: s.description || '',
                    value: s.id
                }
            })
        }
    },
    watch: {
        team: 'fetchData',
        device: 'fetchData',
        showDeviceSnapshotsOnly: 'fetchData'
    },
    mounted () {
        this.fetchData()
    },
    methods: {
        rowIsThisDevice: function (snapshot) {
            if (!snapshot || !this.device.id) {
                return false
            }
            return snapshot.device?.id === this.device.id
        },
        fetchData: async function () {
            if (!this.features.deviceEditor) {
                return
            }
            if (this.device.id && this.device.application) {
                this.loading = true
                const ssFilter = {
                    deviceId: this.showDeviceSnapshotsOnly ? this.device.id : null
                }
                const data = await ApplicationApi.getSnapshots(this.device.application.id, null, null, ssFilter) // TODO Move devices snapshots?

                this.snapshots = data.snapshots.map(snapshot => {
                    const ownerKey = this.getSortKeyForSnapshotSource(snapshot)
                    return {
                        ...snapshot,
                        ...(ownerKey ? { _ownerSortKey: ownerKey } : { _ownerSortKey: undefined })
                    }
                })
                this.snapshots = applySystemUserDetails(data.snapshots)
                this.loading = false
            }
        },
        // snapshot actions - delete
        showDeleteSnapshotDialog (snapshot) {
            Dialog.show({
                header: 'Delete Snapshot',
                text: 'Are you sure you want to delete this snapshot?',
                kind: 'danger',
                confirmLabel: 'Delete'
            }, async () => {
                await SnapshotApi.deleteSnapshot(snapshot.id)
                const index = this.snapshots.indexOf(snapshot)
                this.snapshots.splice(index, 1)
                Alerts.emit('Successfully deleted snapshot.', 'confirmation')
            })
        },

        // snapshot actions - create
        showCreateSnapshotDialog () {
            this.busyMakingSnapshot = true
            this.$refs.snapshotCreateDialog.show()
        },
        onSnapshotCreated (snapshot) {
            this.snapshots.unshift(snapshot)
            // on next tick, update the table data to ensure
            // the new snapshot is shown and the correct status are shown
            this.busyMakingSnapshot = false
            this.$emit('device-updated')
        },
        onSnapshotFailed (err) {
            console.error(err)
            Alerts.emit('Failed to create snapshot of device.', 'warning')
            this.busyMakingSnapshot = false
        },
        onSnapshotCancel () {
            this.busyMakingSnapshot = false
        },
        async downloadSnapshotPackage (snapshot) {
            const ss = await SnapshotApi.getSummary(snapshot.id)
            const owner = ss.device || ss.project
            const ownerType = ss.device ? 'device' : 'instance'
            const packageJSON = {
                name: `${owner.safeName || owner.name}`.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase(),
                description: `${ownerType} snapshot, ${snapshot.name} - ${snapshot.description}`,
                private: true,
                version: '0.0.0-' + snapshot.id,
                dependencies: ss.modules || {}
            }
            downloadData(packageJSON, 'package.json')
        },
        // snapshot actions - import
        showImportSnapshotDialog () {
            this.busyImportingSnapshot = true
            this.$refs.snapshotImportDialog.show()
        },
        onSnapshotImportSuccess (snapshot) {
            this.snapshots.unshift(snapshot)
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
        },
        getSortKeyForSnapshotSource (snapshot) {
            if (snapshot.ownerType === 'device') {
                return 'Device:' + snapshot.device?.name || 'No Name'
            }

            if (snapshot.ownerType === 'instance') {
                return 'Instance:' + snapshot.instance?.name || 'No Name'
            }

            return 'Unassigned'
        },
        deploySnapshot (snapshotId) {
            const snapshot = this.snapshots.find(s => s.id === snapshotId)
            if (!snapshot) {
                console.warn('Could not find snapshot to deploy', snapshotId, this.snapshots, this.device)
                Alerts.emit('Oops, something went wrong! Please refresh the page and try again.', 'warning', 7500)
                return
            }
            const currentTargetSnapshot = this.device.targetSnapshot?.id
            if (typeof currentTargetSnapshot === 'string' && currentTargetSnapshot === snapshot.id) {
                Alerts.emit('This snapshot is already deployed to this device.', 'info', 7500)
                return
            }
            let body = `Are you sure you want to deploy snapshot '${snapshot.name}' to this device?`
            if (snapshot.device?.id !== this.device.id) {
                body = `Snapshot '${snapshot.name}' was not generated by this device. Are you sure you want to deploy it to this device?`
            }

            Dialog.show({
                header: `Deploy Snapshot to device '${this.device.name}'`,
                kind: 'danger',
                text: body,
                confirmLabel: 'Confirm'
            }, async () => {
                try {
                    await DeviceApi.setSnapshotAsTarget(this.device.id, snapshot.id)
                    Alerts.emit('Successfully applied the snapshot.', 'confirmation')
                } catch (err) {
                    Alerts.emit('Failed to apply snapshot: ' + err.toString(), 'warning', 7500)
                }
            })
        },
        showViewSnapshotDialog (snapshot) {
            SnapshotApi.getFullSnapshot(snapshot.id).then((data) => {
                this.$refs.snapshotViewerDialog.show(data)
            }).catch(err => {
                console.error(err)
                Alerts.emit('Failed to get snapshot.', 'warning')
            })
        },
        showCompareSnapshotDialog (snapshot) {
            SnapshotApi.getFullSnapshot(snapshot.id)
                .then((data) => this.$refs.snapshotCompareDialog.show(data, this.snapshotList))
                .catch(err => {
                    console.error(err)
                    Alerts.emit('Failed to get snapshot.', 'warning')
                })
        },
        showDownloadSnapshotDialog (snapshot) {
            this.$refs.snapshotExportDialog.show(snapshot)
        },
        showDeploySnapshotDialog (snapshot) {
            this.deploySnapshot(snapshot.id)
        },
        showEditSnapshotDialog (snapshot) {
            this.$refs.snapshotEditDialog.show(snapshot)
        },
        onSnapshotEdit (snapshot) {
            const index = this.snapshots.findIndex(s => s.id === snapshot.id)
            if (index >= 0) {
                this.snapshots[index].name = snapshot.name
                this.snapshots[index].description = snapshot.description
            }
        },
        // enable/disable snapshot actions
        canDeploy (_row) {
            return !this.developerMode && this.hasPermission('device:snapshot:set-target')
        },
        canDownload (_row) {
            return this.hasPermission('snapshot:export')
        },
        canDelete (row) {
            if (this.rowIsThisDevice(row)) {
                return this.hasPermission('device:snapshot:delete')
            }
            return false // only permit deletion of snapshots created by this device
        }
    }
}
</script>

<style>

tbody .ff-data-table--row > .ff-data-table--cell > .deploy-this-snapshot-button {
    display: none;
}

tbody tr.ff-data-table--row:hover .ff-data-table--cell .deploy-this-snapshot-button {
    display: flex;
}

</style>
