<template>
    <div class="space-y-6">
        <ff-loading v-if="loading" message="Loading Snapshots..." />
        <template v-if="snapshots.length > 0 && !loading">
            <ff-data-table
                data-el="snapshots"
                class="space-y-4"
                :columns="columns"
                :rows="snapshotsFiltered"
                :show-search="true"
                :rows-selectable="true"
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
    </div>
</template>

<script>
import { FilterIcon } from '@heroicons/vue/outline'
import { markRaw } from 'vue'
import { mapActions, mapState } from 'vuex'

import InstanceApi from '../../../../api/instances.js'
import SnapshotApi from '../../../../api/projectSnapshots.js'
import DropdownMenu from '../../../../components/DropdownMenu.vue'

import EmptyState from '../../../../components/EmptyState.vue'
import SnapshotDetailsDrawer from '../../../../components/drawers/snapshots/SnapshotDetailsDrawer.vue'
import UserCell from '../../../../components/tables/cells/UserCell.vue'
import usePermissions from '../../../../composables/Permissions.js'
import snapshotsMixin from '../../../../mixins/Snapshots.js'
import { applySystemUserDetails } from '../../../../transformers/snapshots.transformer.js'
import { isAutoSnapshot } from '../../../../utils/snapshot.js'

import DaysSince from '../../../application/Snapshots/components/cells/DaysSince.vue'
import DeviceCount from '../../../application/Snapshots/components/cells/DeviceCount.vue'
import SnapshotName from '../../../application/Snapshots/components/cells/SnapshotName.vue'

export default {
    name: 'InstanceSnapshots',
    components: {
        DropdownMenu,
        EmptyState,
        FilterIcon
    },
    mixins: [snapshotsMixin],
    inheritAttrs: false,
    props: {
        instance: {
            type: Object,
            required: true
        }
    },
    emits: ['instance-updated', 'show-import-snapshot-dialog', 'show-create-snapshot-dialog'],
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
        ...mapState('account', ['team']),
        columns () {
            const cols = [
                {
                    label: 'Snapshot',
                    component: {
                        is: markRaw(SnapshotName),
                        extraProps: {
                            targetSnapshot: this.instance.deviceSettings?.targetSnapshot,
                            clippedDetails: true
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
            if (this.snapshotFilter?.filter) {
                return this.snapshots.filter(this.snapshotFilter.filter)
            }
            return this.snapshots
        },
        snapshotFilterOptions () {
            return Object.values(this.snapshotFilters)
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
        ...mapActions('ux/drawers', ['openRightDrawer']),
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
        onRowSelected (snapshot) {
            this.openRightDrawer({
                component: markRaw(SnapshotDetailsDrawer),
                props: { snapshot, snapshotList: this.snapshotList, instance: this.instance },
                overlay: true
            })
        }
    }
}
</script>
