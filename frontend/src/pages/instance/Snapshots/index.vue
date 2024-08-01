<template>
    <div class="mb-3">
        <SectionTopMenu hero="Snapshots" help-header="FlowFuse - Snapshots">
            <template #helptext>
                <p>Snapshots generate a point-in-time backup of your Node-RED flow, credentials and runtime settings.</p>
                <p>Snapshots are also required for deploying to devices. In the Deployments page of a Project, you can define your “Target Snapshot”, which will then be deployed to all connected devices.</p>
                <p>You can also generate Snapshots directly from any instance of Node-RED using the <a target="_blank" href="https://github.com/FlowFuse/nr-tools-plugin">FlowFuse NR Tools Plugin.</a></p>
            </template>
        </SectionTopMenu>
    </div>
    <div class="space-y-6">
        <ff-loading v-if="loading" message="Loading Snapshots..." />
        <template v-if="snapshots.length > 0">
            <ff-data-table data-el="snapshots" class="space-y-4" :columns="columns" :rows="snapshots" :show-search="true" search-placeholder="Search Snapshots...">
                <template v-if="hasPermission('project:snapshot:create')" #actions>
                    <ff-button v-if="hasPermission('snapshot:import')" kind="secondary" data-action="import-snapshot" :disabled="busy" @click="showImportSnapshotDialog"><template #icon-left><UploadIcon /></template>Upload Snapshot</ff-button>
                    <ff-button kind="primary" data-action="create-snapshot" :disabled="busy" @click="showCreateSnapshotDialog"><template #icon-left><PlusSmIcon /></template>Create Snapshot</ff-button>
                </template>
                <template #context-menu="{row}">
                    <ff-list-item :disabled="!hasPermission('project:snapshot:rollback')" label="Deploy Snapshot" @click="showRollbackDialog(row)" />
                    <ff-list-item :disabled="!hasPermission('snapshot:edit')" label="Edit Snapshot" @click="showEditSnapshotDialog(row)" />
                    <ff-list-item :disabled="!hasPermission('snapshot:full')" label="View Snapshot" @click="showViewSnapshotDialog(row)" />
                    <ff-list-item :disabled="!hasPermission('snapshot:full')" label="Compare Snapshot..." @click="showCompareSnapshotDialog(row)" />
                    <ff-list-item :disabled="!hasPermission('project:snapshot:export')" label="Download Snapshot" @click="showDownloadSnapshotDialog(row)" />
                    <ff-list-item :disabled="!hasPermission('project:snapshot:read')" label="Download package.json" @click="downloadSnapshotPackage(row)" />
                    <ff-list-item :disabled="!hasPermission('project:snapshot:set-target')" label="Set as Device Target" @click="showDeviceTargetDialog(row)" />
                    <ff-list-item :disabled="!hasPermission('project:snapshot:delete')" label="Delete Snapshot" kind="danger" @click="showDeleteSnapshotDialog(row)" />
                </template>
            </ff-data-table>
        </template>
        <template v-else-if="!loading">
            <EmptyState>
                <template #img>
                    <img src="../../../images/empty-states/instance-snapshots.png">
                </template>
                <template #header>Create your First Snapshot</template>
                <template #message>
                    <p>
                        Snapshots are point-in-time backups of your Node-RED Instances
                        and capture the flows, credentials and runtime settings.
                    </p>
                    <p>
                        Snapshots are also used for deploying to your Devices. Devices have
                        a set "Target Snapshot", which will roll out to all Devices connected
                        to the respective Instance.
                    </p>
                </template>
                <template v-if="hasPermission('project:snapshot:create')" #actions>
                    <ff-button v-if="hasPermission('snapshot:import')" kind="secondary" data-action="import-snapshot" @click="showImportSnapshotDialog">
                        <template #icon-left><UploadIcon /></template>Upload Snapshot
                    </ff-button>
                    <ff-button kind="primary" data-action="create-snapshot" @click="showCreateSnapshotDialog">
                        <template #icon-left><PlusSmIcon /></template>Create Snapshot
                    </ff-button>
                </template>
            </EmptyState>
        </template>
        <SnapshotCreateDialog ref="snapshotCreateDialog" data-el="dialog-create-snapshot" :project="instance" @snapshot-created="snapshotCreated" />
        <SnapshotEditDialog ref="snapshotEditDialog" data-el="dialog-edit-snapshot" @snapshot-updated="onSnapshotEdit" />
        <SnapshotExportDialog ref="snapshotExportDialog" data-el="dialog-export-snapshot" :project="instance" />
        <SnapshotImportDialog ref="snapshotImportDialog" title="Upload Snapshot" data-el="dialog-import-snapshot" :owner="instance" owner-type="instance" @snapshot-import-success="onSnapshotImportSuccess" @snapshot-import-failed="onSnapshotImportFailed" @canceled="onSnapshotImportCancel" />
        <AssetDetailDialog ref="snapshotViewerDialog" data-el="dialog-view-snapshot" />
        <AssetCompareDialog ref="snapshotCompareDialog" data-el="dialog-compare-snapshot" />
    </div>
</template>

<script>
import { PlusSmIcon, UploadIcon } from '@heroicons/vue/outline'
import { markRaw } from 'vue'
import { mapState } from 'vuex'

import InstanceApi from '../../../api/instances.js'
import SnapshotApi from '../../../api/projectSnapshots.js'
import SnapshotsApi from '../../../api/snapshots.js'

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
import Product from '../../../services/product.js'
import { applySystemUserDetails } from '../../../transformers/snapshots.transformer.js'
import DaysSince from '../../application/Snapshots/components/cells/DaysSince.vue'
import DeviceCount from '../../application/Snapshots/components/cells/DeviceCount.vue'
import SnapshotName from '../../application/Snapshots/components/cells/SnapshotName.vue'
import SnapshotExportDialog from '../../application/Snapshots/components/dialogs/SnapshotExportDialog.vue'

import SnapshotCreateDialog from './dialogs/SnapshotCreateDialog.vue'

export default {
    name: 'InstanceSnapshots',
    components: {
        SectionTopMenu,
        EmptyState,
        SnapshotCreateDialog,
        SnapshotEditDialog,
        SnapshotExportDialog,
        SnapshotImportDialog,
        PlusSmIcon,
        UploadIcon,
        AssetDetailDialog,
        AssetCompareDialog
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
            loading: false,
            deviceCounts: {},
            snapshots: [],
            busyMakingSnapshot: false,
            busyImportingSnapshot: false
        }
    },
    computed: {
        ...mapState('account', ['teamMembership']),
        columns () {
            const cols = [
                {
                    label: 'Snapshot',
                    component: {
                        is: markRaw(SnapshotName),
                        extraProps: {
                            targetSnapshot: this.instance.deviceSettings?.targetSnapshot
                        }
                    }
                },
                {
                    label: '',
                    component: {
                        is: markRaw(DeviceCount),
                        extraProps: {
                            targetSnapshot: this.instance.deviceSettings?.targetSnapshot
                        }
                    }
                },
                {
                    label: 'Created By',
                    class: ['w-56'],
                    component: {
                        is: markRaw(UserCell),
                        map: {
                            avatar: 'user.avatar',
                            name: 'user.name',
                            username: 'user.username'
                        }
                    }
                },
                { label: 'Date Created', class: ['w-56'], component: { is: markRaw(DaysSince), map: { date: 'createdAt' } } }
            ]
            return cols
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
        'team.id': 'fetchData',
        'instance.id': 'fetchData'
    },
    mounted () {
        this.fetchData()
    },
    methods: {
        fetchData: async function () {
            if (this.instance.id) {
                this.loading = true
                const deviceCounts = await this.countDevices()
                const data = await SnapshotApi.getInstanceSnapshots(this.instance.id) // TODO Move to instances?
                this.snapshots = applySystemUserDetails(data.snapshots, this.instance).map((s) => {
                    s.deviceCount = deviceCounts[s.id]
                    return s
                })
                this.loading = false
            }
        },
        async countDevices () {
            // hardcoded device limit to ensure all are returned - feels dirty
            const data = await InstanceApi.getInstanceDevices(this.instance.id, null, 10000000)
            // map devices to snapshot deployed on that device
            const deviceCounts = data.devices.reduce((acc, device) => {
                const snapshot = device.activeSnapshot?.id
                if (!acc[snapshot]) {
                    acc[snapshot] = 1
                } else {
                    acc[snapshot]++
                }
                return acc
            }, {})
            return deviceCounts
        },
        // snapshot actions - delete
        showDeleteSnapshotDialog (snapshot) {
            Dialog.show({
                header: 'Delete Snapshot',
                text: 'Are you sure you want to delete this snapshot?',
                kind: 'danger',
                confirmLabel: 'Delete'
            }, async () => {
                await SnapshotsApi.deleteSnapshot(snapshot.id)
                const index = this.snapshots.indexOf(snapshot)
                this.snapshots.splice(index, 1)
                Alerts.emit('Successfully deleted snapshot.', 'confirmation')
            })
        },
        // snapshot actions - rollback
        showRollbackDialog (snapshot) {
            Dialog.show({
                header: 'Deploy Snapshot',
                kind: 'danger',
                text: `This will overwrite the current instance.
                       All changes to the flows, settings and environment variables made since the last snapshot will be lost.
                       Are you sure you want to deploy to this snapshot?`,
                confirmLabel: 'Confirm'
            }, async () => {
                await SnapshotApi.rollbackSnapshot(this.instance.id, snapshot.id)
                Alerts.emit('Successfully deployed snapshot.', 'confirmation')
            })
        },
        // snapshot actions - set as device target
        showDeviceTargetDialog (snapshot) {
            Dialog.show({
                header: 'Set Device Target Snapshot',
                text: `Are you sure you want to set this snapshot as the device target?
                       All devices assigned to this instance will be restarted on this snapshot.`,
                confirmLabel: 'Set Target'
            }, async () => {
                await InstanceApi.updateInstanceDeviceSettings(this.instance.id, {
                    targetSnapshot: snapshot.id
                })
                this.$emit('instance-updated')
            })
        },
        showCreateSnapshotDialog () {
            this.$refs.snapshotCreateDialog.show()
        },
        snapshotCreated (snapshot) {
            this.snapshots.unshift(snapshot)
            // on next tick, update the table data to ensure
            // the new snapshot is shown and the correct status are shown
            this.$emit('instance-updated')
        },
        async downloadSnapshotPackage (snapshot) {
            Product.capture('ff-snapshot-download', {
                'snapshot-id': snapshot.id
            }, {
                instance: this.instance?.id
            })
            const ss = await SnapshotsApi.getSummary(snapshot.id)
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
        showDownloadSnapshotDialog (snapshot) {
            this.$refs.snapshotExportDialog.show(snapshot)
        },
        showViewSnapshotDialog (snapshot) {
            Product.capture('ff-snapshot-view', {
                'snapshot-id': snapshot.id
            }, {
                instance: this.instance?.id
            })
            SnapshotsApi.getFullSnapshot(snapshot.id).then((data) => {
                this.$refs.snapshotViewerDialog.show(data)
            }).catch(err => {
                console.error(err)
                Alerts.emit('Failed to get snapshot.', 'warning')
            })
        },
        showCompareSnapshotDialog (snapshot) {
            Product.capture('ff-snapshot-compare', {
                'snapshot-id': snapshot.id
            }, {
                instance: this.instance?.id
            })
            SnapshotsApi.getFullSnapshot(snapshot.id)
                .then((data) => this.$refs.snapshotCompareDialog.show(data, this.snapshotList))
                .catch(err => {
                    console.error(err)
                    Alerts.emit('Failed to get snapshot.', 'warning')
                })
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
        showEditSnapshotDialog (snapshot) {
            this.$refs.snapshotEditDialog.show(snapshot)
        },
        onSnapshotEdit (snapshot) {
            const index = this.snapshots.findIndex(s => s.id === snapshot.id)
            if (index >= 0) {
                this.snapshots[index].name = snapshot.name
                this.snapshots[index].description = snapshot.description
            }
        }
    }
}
</script>
