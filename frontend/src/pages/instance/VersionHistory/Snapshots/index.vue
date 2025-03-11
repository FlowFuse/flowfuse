<template>
    <div class="space-y-6">
        <ff-loading v-if="loading" message="Loading Snapshots..." />
        <template v-if="snapshots.length > 0 && !loading">
            <!-- set mb-14 (~56px) on the form to permit access to kebab actions where hubspot chat covers it -->
            <ff-data-table data-el="snapshots" class="space-y-4 mb-14" :columns="columns" :rows="snapshotsFiltered" :show-search="true" search-placeholder="Search Snapshots...">
                <template #actions>
                    <DropdownMenu data-el="snapshot-filter" buttonClass="ff-btn ff-btn--secondary" :options="snapshotFilterOptions">Filter</DropdownMenu>
                </template>
                <template #context-menu="{row}">
                    <ff-list-item :disabled="!hasPermission('project:snapshot:rollback')" label="Restore Snapshot" @click="showRollbackDialog(row)" />
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
                    <img src="../../../../images/empty-states/instance-snapshots.png">
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
            </EmptyState>
        </template>
        <SnapshotEditDialog ref="snapshotEditDialog" data-el="dialog-edit-snapshot" @snapshot-updated="onSnapshotEdit" />
        <SnapshotExportDialog ref="snapshotExportDialog" data-el="dialog-export-snapshot" :project="instance" />
        <AssetDetailDialog ref="snapshotViewerDialog" data-el="dialog-view-snapshot" />
        <AssetCompareDialog ref="snapshotCompareDialog" data-el="dialog-compare-snapshot" />
    </div>
</template>

<script>
import { markRaw } from 'vue'
import { mapState } from 'vuex'

import InstanceApi from '../../../../api/instances.js'
import SnapshotApi from '../../../../api/projectSnapshots.js'
import DropdownMenu from '../../../../components/DropdownMenu.vue'

import EmptyState from '../../../../components/EmptyState.vue'
import AssetCompareDialog from '../../../../components/dialogs/AssetCompareDialog.vue'
import AssetDetailDialog from '../../../../components/dialogs/AssetDetailDialog.vue'
import SnapshotEditDialog from '../../../../components/dialogs/SnapshotEditDialog.vue'
import UserCell from '../../../../components/tables/cells/UserCell.vue'
import permissionsMixin from '../../../../mixins/Permissions.js'
import snapshotsMixin from '../../../../mixins/Snapshots.js'
import { applySystemUserDetails } from '../../../../transformers/snapshots.transformer.js'
import { isAutoSnapshot } from '../../../../utils/snapshot.js'
import DaysSince from '../../../application/Snapshots/components/cells/DaysSince.vue'
import DeviceCount from '../../../application/Snapshots/components/cells/DeviceCount.vue'
import SnapshotName from '../../../application/Snapshots/components/cells/SnapshotName.vue'
import SnapshotExportDialog from '../../../application/Snapshots/components/dialogs/SnapshotExportDialog.vue'

export default {
    name: 'InstanceSnapshots',
    components: {
        DropdownMenu,
        EmptyState,
        SnapshotEditDialog,
        SnapshotExportDialog,
        AssetDetailDialog,
        AssetCompareDialog
    },
    mixins: [permissionsMixin, snapshotsMixin],
    inheritAttrs: false,
    props: {
        instance: {
            type: Object,
            required: true
        }
    },
    emits: ['instance-updated', 'show-import-snapshot-dialog', 'show-create-snapshot-dialog'],
    data () {
        return {
            loading: false,
            deviceCounts: {},
            snapshots: [],
            busyMakingSnapshot: false,
            busyImportingSnapshot: false,
            snapshotFilter: null
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
            // this list is used for the snapshot dropdown in the compare snapshot dialog (via the mixin frontend/src/mixins/Snapshots.js)
            return this.snapshots.map(s => {
                return {
                    label: s.name,
                    description: s.description || '',
                    value: s.id
                }
            })
        },
        snapshotsFiltered () {
            if (this.snapshotFilter) {
                return this.snapshots.filter(this.snapshotFilter)
            }
            return this.snapshots
        },
        snapshotFilterOptions () {
            return [
                {
                    name: 'All Snapshots',
                    action: () => {
                        this.snapshotFilter = null
                    }
                },
                {
                    name: 'User Snapshots',
                    action: () => {
                        this.snapshotFilter = (snapshot) => !isAutoSnapshot(snapshot)
                    }
                },
                {
                    name: 'Auto Snapshots',
                    action: () => {
                        this.snapshotFilter = (snapshot) => isAutoSnapshot(snapshot)
                    }
                }
            ]
        }
    },
    watch: {
        'team.id': 'fetchData',
        instance: {
            handler: function () {
                this.fetchData(true)
            },
            deep: true
        }
    },
    mounted () {
        this.fetchData()
    },
    methods: {
        fetchData: async function (withoutAnimation = false) {
            if (this.instance.id) {
                if (!withoutAnimation) this.loading = true
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
