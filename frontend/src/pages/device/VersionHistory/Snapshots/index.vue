<template>
    <div id="device-snapshots" class="flex-1 flex flex-col overflow-auto">
        <div v-if="isOwnedByAnInstance || isUnassigned" class="space-y-6">
            <EmptyState :feature-unavailable="!features.deviceEditor">
                <template #img>
                    <img src="../../../../images/empty-states/instance-snapshots.png">
                </template>
                <template #header>Snapshots are available when a Remote Instance is assigned to an Application</template>
                <template #message>
                    <p>
                        Snapshots are point-in-time backups of your Node-RED Instances
                        and capture the flows, credentials and runtime settings.
                    </p>
                    <p v-if="device.ownerType !== 'application'" class="block">
                        A Remote Instance must first be <a class="ff-link" href="https://flowfuse.com/docs/device-agent/register/#assign-the-device-to-an-application" target="_blank" rel="noreferrer">assigned to an Application</a>, in order to create snapshots.
                    </p>
                    <p v-else-if="!developerMode" class="block">
                        A Remote Instance must be in Developer Mode and online to create a Snapshot.
                    </p>
                </template>
                <template v-if="hasPermission('device:snapshot:create', { application: device.application })" #actions>
                    <ff-button
                        v-if="hasPermission('snapshot:import', { application: device.application })"
                        kind="secondary" :disabled="busy || !features.deviceEditor || device.ownerType !== 'application'"
                        data-action="import-snapshot"
                        @click="$emit('show-import-snapshot-dialog')"
                    >
                        <template #icon-left><UploadIcon /></template>Upload Snapshot
                    </ff-button>
                    <ff-button
                        v-if="hasPermission('device:snapshot:create', { application: device.application })"
                        kind="primary"
                        :disabled="!developerMode || busy || !features.deviceEditor || device.ownerType !== 'application'"
                        data-action="create-snapshot"
                        @click="$emit('show-create-snapshot-dialog')"
                    >
                        <template #icon-left><PlusSmIcon /></template>Create Snapshot
                    </ff-button>
                </template>
            </EmptyState>
        </div>
        <div v-else class="space-y-6 flex-1 flex flex-col overflow-auto">
            <ff-loading v-if="loading" message="Loading Snapshots..." />
            <template v-else-if="features.deviceEditor && snapshots.length > 0">
                <ff-data-table
                    data-el="snapshots"
                    class="space-y-4"
                    :columns="columns"
                    :rows="snapshotsFiltered"
                    :rows-selectable="true"
                    :show-search="true"
                    search-placeholder="Search Snapshots..."
                    @row-selected="onRowSelected"
                >
                    <template #actions>
                        <DropdownMenu data-el="snapshot-filter" buttonClass="ff-btn ff-btn--secondary" :options="snapshotFilterOptions">
                            <FilterIcon class="ff-btn--icon ff-btn--icon-left" aria-hidden="true" />
                            {{ snapshotFilter?.name || 'All Snapshots' }}
                            <span class="sr-only">Filter Snapshots</span>
                        </DropdownMenu>
                    </template>
                </ff-data-table>
            </template>
            <template v-else-if="!loading">
                <EmptyState :feature-unavailable="!features.deviceEditor" :feature-unavailable-message="'This requires Developer Mode on Devices, which is a FlowFuse Enterprise Feature'">
                    <template #img>
                        <img src="../../../../images/empty-states/instance-snapshots.png">
                    </template>
                    <template #header>Create your First Snapshot</template>
                    <template #message>
                        <p>
                            Snapshots are point-in-time backups of your Node-RED Instances
                            and capture the flows, credentials and runtime settings.
                        </p>
                        <p v-if="device.ownerType !== 'application'" class="block">
                            A Remote Instance must first be <a class="ff-link" href="https://flowfuse.com/docs/device-agent/register/#assign-the-device-to-an-application" target="_blank" rel="noreferrer">assigned to an Application</a>, in order to create snapshots.
                        </p>
                        <p v-else-if="!developerMode" class="block">
                            A Remote Instance must be in Developer Mode and online to create a Snapshot.
                        </p>
                    </template>
                    <template v-if="hasPermission('device:snapshot:create', { application: device.application })" #actions>
                        <ff-button
                            v-if="hasPermission('snapshot:import', { application: device.application })"
                            kind="secondary" :disabled="busy || !features.deviceEditor || device.ownerType !== 'application'"
                            data-action="import-snapshot"
                            @click="$emit('show-import-snapshot-dialog')"
                        >
                            <template #icon-left><UploadIcon /></template>Upload Snapshot
                        </ff-button>
                        <ff-button
                            kind="primary"
                            :disabled="!canCreateSnapshot"
                            data-action="create-snapshot"
                            @click="$emit('show-create-snapshot-dialog')"
                        >
                            <template #icon-left><PlusSmIcon /></template>Create Snapshot
                        </ff-button>
                    </template>
                </EmptyState>
            </template>
        </div>
    </div>
</template>

<script>
import { FilterIcon, PlusSmIcon, UploadIcon } from '@heroicons/vue/outline'
import SemVer from 'semver'
import { markRaw } from 'vue'
import { mapActions, mapState } from 'vuex'

import ApplicationApi from '../../../../api/application.js'
import DropdownMenu from '../../../../components/DropdownMenu.vue'

import EmptyState from '../../../../components/EmptyState.vue'
import SnapshotDetailsDrawer from '../../../../components/drawers/snapshots/SnapshotDetailsDrawer.vue'
import UserCell from '../../../../components/tables/cells/UserCell.vue'
import usePermissions from '../../../../composables/Permissions.js'
import { applySystemUserDetails } from '../../../../transformers/snapshots.transformer.js'
import { isAutoSnapshot } from '../../../../utils/snapshot.js'
import DaysSince from '../../../application/Snapshots/components/cells/DaysSince.vue'
import SnapshotName from '../../../application/Snapshots/components/cells/SnapshotName.vue'
import SnapshotSource from '../../../application/Snapshots/components/cells/SnapshotSource.vue'

export default {
    name: 'DeviceSnapshots',
    components: {
        DropdownMenu,
        EmptyState,
        FilterIcon,
        PlusSmIcon,
        UploadIcon
    },
    inheritAttrs: false,
    props: {
        device: {
            type: Object,
            required: true
        },
        showDeviceSnapshotsOnly: {
            type: Boolean,
            required: false,
            default: false
        },
        reloadHooks: {
            type: Array,
            required: true,
            default: () => []
        }
    },
    emits: ['device-updated', 'show-import-snapshot-dialog', 'show-create-snapshot-dialog'],
    setup () {
        const { hasPermission } = usePermissions()
        return { hasPermission }
    },
    data () {
        return {
            loading: false,
            deviceCounts: {},
            snapshots: [],
            busyMakingSnapshot: false,
            busyImportingSnapshot: false,
            snapshotFilter: null,
            snapshotFilters: {
                All_Snapshots: {
                    name: 'All Snapshots',
                    selected: true,
                    filter: null,
                    action: () => {
                        this.snapshotFilters.All_Snapshots.selected = true
                        this.snapshotFilters.User_Snapshots.selected = false
                        this.snapshotFilters.Auto_Snapshots.selected = false
                        this.snapshotFilter = this.snapshotFilters.All_Snapshots
                    }
                },
                User_Snapshots: {
                    name: 'User Snapshots',
                    selected: false,
                    filter: (s) => !isAutoSnapshot(s),
                    action: () => {
                        this.snapshotFilters.All_Snapshots.selected = false
                        this.snapshotFilters.User_Snapshots.selected = true
                        this.snapshotFilters.Auto_Snapshots.selected = false
                        this.snapshotFilter = this.snapshotFilters.User_Snapshots
                    }
                },
                Auto_Snapshots: {
                    name: 'Auto Snapshots',
                    selected: false,
                    filter: (s) => isAutoSnapshot(s),
                    action: () => {
                        this.snapshotFilters.All_Snapshots.selected = false
                        this.snapshotFilters.User_Snapshots.selected = false
                        this.snapshotFilters.Auto_Snapshots.selected = true
                        this.snapshotFilter = this.snapshotFilters.Auto_Snapshots
                    }
                }
            }
        }
    },
    computed: {
        ...mapState('account', ['team', 'features']),
        canCreateSnapshot () {
            if (!this.developerMode || this.busy) {
                return false
            }
            return this.isOwnedByAnInstance || this.isOwnedByAnApplication
        },
        columns () {
            const cols = [
                {
                    label: 'Snapshot',
                    class: ['w-56 sm:w-48'],
                    component: {
                        is: markRaw(SnapshotName),
                        extraProps: {
                            clippedDetails: true
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
                    label: 'Node-RED version',
                    class: ['w-56'],
                    key: 'modules.node-red'
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
        snapshotList () {
            return this.snapshots.map(s => {
                return {
                    label: s.name,
                    description: s.description || '',
                    value: s.id
                }
            })
        },
        snapshotsFiltered () {
            if (this.snapshotFilter?.filter) {
                return this.snapshots.filter(this.snapshotFilter.filter)
            }
            return this.snapshots
        },
        snapshotFilterOptions () {
            return Object.values(this.snapshotFilters)
        },
        busy () {
            return this.busyMakingSnapshot || this.busyImportingSnapshot
        },
        developerMode () {
            return this.device?.mode === 'developer'
        },
        isOwnedByAnInstance () {
            return this.device?.ownerType === 'instance'
        },
        isOwnedByAnApplication () {
            return this.device?.ownerType === 'application'
        },
        isUnassigned () {
            return this.device?.ownerType === ''
        }
    },
    watch: {
        team: 'fetchData',
        device: 'fetchData',
        showDeviceSnapshotsOnly: 'fetchData',
        reloadHooks: {
            handler: 'fetchData',
            deep: true
        }
    },
    mounted () {
        this.fetchData()
    },
    methods: {
        ...mapActions('ux/drawers', ['openRightDrawer', 'closeRightDrawer']),
        fetchData: async function () {
            if (!this.features.deviceEditor || this.isOwnedByAnInstance || this.isUnassigned) {
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
        getSortKeyForSnapshotSource (snapshot) {
            if (snapshot.ownerType === 'device') {
                return 'Device:' + snapshot.device?.name || 'No Name'
            }

            if (snapshot.ownerType === 'instance') {
                return 'Instance:' + snapshot.instance?.name || 'No Name'
            }

            return 'Unassigned'
        },
        // enable/disable snapshot actions
        canDeploy (_row) {
            return (!this.developerMode || this.supportsDevModeSnapshotRestore()) && this.hasPermission('device:edit', { application: this.device.application })
        },
        canDeployReason (snapshot) {
            if (!this.hasPermission('device:edit', { application: this.device.application })) {
                return 'You do not have permission to deploy snapshots to this Remote Instance'
            }
            if (this.developerMode && !this.supportsDevModeSnapshotRestore()) {
                return 'Snapshots deploys to Developer Mode Remote Instances requires Device Agent v3.8.0 or later'
            }
            return ''
        },
        supportsDevModeSnapshotRestore () {
            return this.device.agentVersion && SemVer.gte(this.device.agentVersion, '3.8.0')
        },
        onRowSelected (snapshot) {
            this.openRightDrawer({
                component: markRaw(SnapshotDetailsDrawer),
                props: {
                    snapshot,
                    snapshotList: this.snapshotList,
                    instance: this.device,
                    canSetDeviceTarget: false,
                    canRestore: this.canDeploy(snapshot),
                    canRestoreReason: this.canDeployReason(snapshot),
                    isDevice: true
                },
                on: {
                    updatedSnapshot: () => this.fetchData(true),
                    deletedSnapshot: () => {
                        this.closeRightDrawer()
                        this.fetchData(true)
                    }
                },
                overlay: true,
                wider: true
            })
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
