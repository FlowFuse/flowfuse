<template>
    <div class="space-y-2 overflow-auto flex flex-col" data-el="devices-section">
        <ff-loading
            v-if="loadingStatuses || loadingDevices"
            message="Loading Remote Instances..."
        />
        <template v-else-if="team">
            <FeatureUnavailableToTeam v-if="teamDeviceLimitReached" fullMessage="You have reached the limit for Remote Instances in this team." :class="{'mt-0': displayingTeam }" />
            <FeatureUnavailableToTeam v-if="teamRuntimeLimitReached" fullMessage="You have reached the limit for Instances in this team." :class="{'mt-0': displayingTeam }" />
            <div>
                <DevicesStatusBar v-if="allDeviceStatuses.size > 0" data-el="devicestatus-lastseen" label="Last Seen" :devices="Array.from(allDeviceStatuses.values())" property="lastseen" :filter="filter" @filter-selected="applyFilter" />
                <DevicesStatusBar v-if="allDeviceStatuses.size > 0" data-el="devicestatus-status" label="Last Known Status" :devices="Array.from(allDeviceStatuses.values())" property="status" :filter="filter" @filter-selected="applyFilter" />
            </div>
            <ff-data-table
                v-if="allDeviceStatuses.size > 0"
                data-el="devices-browser"
                :columns="columns"
                :rows="devicesWithStatuses"
                :show-search="true"
                search-placeholder="Search Remote Instances"
                :show-load-more="moreThanOnePage"
                :check-key="row => row.id"
                :show-row-checkboxes="hasPermission('team:device:bulk-edit', applicationContext)"
                @rows-checked="checkedDevices = $event"
                @load-more="loadMoreDevices"
                @update:search="updateSearch"
                @update:sort="updateSort"
            >
                <template #actions>
                    <ff-popover button-text="Filters" button-kind="secondary">
                        <template #panel="{ close }">
                            <section>
                                <popover-item
                                    title="Fleet Mode"
                                    @click="onFilterClick('fleetMode', close)"
                                >
                                    <template #icon>
                                        <ff-checkbox
                                            v-model="deviceModeFilters.fleetMode" style="top: -8px;"
                                            @click.stop.prevent="onFilterClick('fleetMode', close)"
                                        />
                                    </template>
                                </popover-item>
                                <popover-item
                                    title="Developer Mode"
                                    @click="onFilterClick('developerMode', close)"
                                >
                                    <template #icon>
                                        <ff-checkbox
                                            v-model="deviceModeFilters.developerMode" style="top: -8px;"
                                            @click.stop.prevent="onFilterClick('developerMode', close)"
                                        />
                                    </template>
                                </popover-item>
                            </section>
                        </template>
                    </ff-popover>
                    <DropdownMenu v-if="hasPermission('team:device:bulk-delete', applicationContext) || hasPermission('team:device:bulk-edit', applicationContext)" :disabled="!checkedDevices?.length" data-el="bulk-actions-dropdown" buttonClass="ff-btn ff-btn--secondary" :options="bulkActionsDropdownOptions">Actions</DropdownMenu>
                    <ff-button
                        v-if="displayingInstance && hasPermission('project:snapshot:create', applicationContext)"
                        data-action="change-target-snapshot"
                        kind="secondary"
                        @click="showSelectTargetSnapshotDialog"
                    >
                        <template #icon-left>
                            <ClockIcon />
                        </template>
                        <span class="font-normal">
                            Target Snapshot: <b>{{ instance.targetSnapshot?.name || 'none' }}</b>
                        </span>
                    </ff-button>
                    <ff-button
                        v-ff-tooltip:left="!hasPermission('device:create', applicationContext) && 'Your role does not allow creating remote instances. Contact a team admin to change your role.'"
                        class="font-normal"
                        data-action="register-device"
                        kind="primary"
                        :disabled="teamDeviceLimitReached || teamRuntimeLimitReached || !hasPermission('device:create', applicationContext)"
                        @click="showCreateDeviceDialog"
                    >
                        <template #icon-left>
                            <PlusSmIcon />
                        </template>
                        Add Remote Instance
                    </ff-button>
                </template>
                <template #context-menu="{row}">
                    <ff-list-item
                        label="Edit Details"
                        @click="deviceAction('edit', row.id)"
                    />
                    <ff-list-item
                        v-if="!row.ownerType && displayingTeam"
                        label="Add to Application"
                        data-action="device-assign-to-application"
                        @click="deviceAction('assignToApplication', row.id)"
                    />
                    <ff-list-item
                        v-else-if="row.ownerType === 'application' && (displayingTeam || displayingApplication)"
                        label="Remove from Application"
                        data-action="device-remove-from-application"
                        @click="deviceAction('removeFromApplication', row.id)"
                    />
                    <ff-list-item
                        v-if="!row.ownerType && displayingTeam"
                        label="Add to Instance"
                        data-action="device-assign-to-instance"
                        @click="deviceAction('assignToProject', row.id)"
                    />
                    <ff-list-item
                        v-else-if="row.ownerType === 'instance' && (displayingTeam || displayingInstance)"
                        label="Remove from Instance"
                        data-action="device-remove-from-instance"
                        @click="deviceAction('removeFromProject', row.id)"
                    />
                    <ff-list-item
                        kind="danger"
                        label="Regenerate Configuration"
                        @click="deviceAction('updateCredentials', row.id)"
                    />
                    <ff-list-item
                        v-if="hasPermission('device:delete', applicationContext)"
                        kind="danger"
                        label="Delete Device"
                        @click="deviceAction('delete', row.id)"
                    />
                </template>
            </ff-data-table>
            <template v-else>
                <template v-if="displayingTeam">
                    <EmptyState data-el="team-no-devices">
                        <template #img>
                            <img src="../images/empty-states/team-devices.png">
                        </template>
                        <template #header>Connect your First Remote Instance</template>
                        <template #message>
                            <p>
                                FlowFuse allow you to manage Node-RED instances
                                running on remote hardware.
                            </p>
                            <p>
                                To manage your  <a
                                    class="ff-link" href="https://flowfuse.com/docs/user/devices"
                                    target="_blank"
                                >FlowFuse Device Agent</a>, and can be used to deploy and debug
                                instances anywhere, from here, in FlowFuse.
                            </p>
                        </template>
                        <template #actions>
                            <ff-button
                                v-ff-tooltip:bottom="!hasPermission('device:create') && 'Your role does not allow creating remote instances. Contact a team admin to change your role.'"
                                class="font-normal"
                                kind="primary"
                                :disabled="teamDeviceLimitReached || teamRuntimeLimitReached || !hasPermission('device:create', applicationContext)"
                                data-action="register-device"
                                @click="showCreateDeviceDialog"
                            >
                                <template #icon-left>
                                    <PlusSmIcon />
                                </template>
                                Add Remote Instance
                            </ff-button>
                        </template>
                    </EmptyState>
                </template>
                <template v-else-if="displayingInstance">
                    <EmptyState data-el="instance-no-devices">
                        <template #img>
                            <img src="../images/empty-states/instance-devices.png">
                        </template>
                        <template #header>Connect your First Remote Instances</template>
                        <template #message>
                            <p>
                                Here, you will see a list of Remote Instances connected to this Hosted Instance.
                            </p>
                            <p>
                                You can deploy <router-link class="ff-link" :to="{name: 'instance-snapshots', params: {id: instance.id}}">Snapshots</router-link> of this Instance to your connected Devices.
                            </p>
                            <p>
                                A full list of your Team's Devices are available <ff-team-link
                                    class="ff-link"
                                    :to="{name: 'TeamDevices', params: {team_slug: team.slug}}"
                                >
                                    here
                                </ff-team-link>.
                            </p>
                        </template>
                        <template #actions>
                            <ff-button
                                v-ff-tooltip:bottom="!hasPermission('device:create') && 'Your role does not allow creating remote instances. Contact a team admin to change your role.'"
                                class="font-normal"
                                kind="primary"
                                :disabled="teamDeviceLimitReached || teamRuntimeLimitReached || !hasPermission('device:create', applicationContext)"
                                data-action="register-device"
                                @click="showCreateDeviceDialog"
                            >
                                <template #icon-left>
                                    <PlusSmIcon />
                                </template>
                                Add Remote Instance
                            </ff-button>
                        </template>
                    </EmptyState>
                </template>
                <template v-else-if="displayingApplication">
                    <EmptyState data-el="application-no-devices">
                        <template #img>
                            <img src="../images/empty-states/instance-devices.png">
                        </template>
                        <template #header>Connect your First Remote Instance</template>
                        <template #message>
                            <p>
                                Here, you will see a list of Devices belonging to this Application.
                            </p>
                            <p>
                                You can deploy <router-link class="ff-link" :to="{name: 'ApplicationSnapshots'}">Snapshots</router-link> of this Application to your connected Devices.
                            </p>
                            <p>
                                A full list of your Team's Devices are available <ff-team-link
                                    class="ff-link"
                                    :to="{name: 'TeamDevices', params: {team_slug: team.slug}}"
                                >
                                    here
                                </ff-team-link>.
                            </p>
                        </template>
                        <template #actions>
                            <ff-button
                                v-ff-tooltip:bottom="!hasPermission('device:create') && 'Your role does not allow creating remote instances. Contact a team admin to change your role.'"
                                class="font-normal"
                                kind="primary"
                                :disabled="teamDeviceLimitReached || teamRuntimeLimitReached || !hasPermission('device:create', applicationContext)"
                                data-action="register-device"
                                @click="showCreateDeviceDialog"
                            >
                                <template #icon-left>
                                    <PlusSmIcon />
                                </template>
                                Add Remote Instance
                            </ff-button>
                        </template>
                    </EmptyState>
                </template>
                <div v-else class="ff-no-data ff-no-data-large">
                    <span data-el="no-devices">
                        No Remote Instances found.
                    </span>
                </div>
            </template>
        </template>
    </div>

    <TeamDeviceCreateDialog
        v-if="team && deviceEditModalOpened"
        ref="teamDeviceCreateDialog"
        :team="team"
        :teamDeviceCount="teamDeviceCount"
        @device-created="deviceCreated"
        @device-updated="deviceUpdated"
        @close="deviceEditModalOpened = false"
    >
        <template #description>
            <p v-if="!featuresCheck?.isHostedInstancesEnabledForTeam && tours.firstDevice">
                Describe your new Remote Instance here, e.g. "Raspberry Pi", "Allen-Bradley PLC", etc.
            </p>
            <p v-else>
                Remote Instances are managed using the <a href="https://flowfuse.com/docs/user/devices/" target="_blank">FlowFuse Device Agent</a>. The agent will need to be setup on the hardware where you want your Remote Instance to run.
            </p>
        </template>
    </TeamDeviceCreateDialog>

    <DeviceCredentialsDialog ref="deviceCredentialsDialog" />

    <SnapshotAssignDialog
        v-if="displayingInstance"
        ref="snapshotAssignDialog"
        :instance="instance"
        @snapshot-assigned="$emit('instance-updated')"
    />

    <DeviceAssignInstanceDialog
        ref="deviceAssignInstanceDialog"
        @assign-device="assignDevice"
        @move-devices="moveDevicesToInstance"
    />

    <DeviceAssignApplicationDialog
        ref="deviceAssignApplicationDialog"
        @assign-device="assignDeviceToApplication"
        @move-devices="moveDevicesToApplication"
    />

    <ff-dialog
        ref="teamBulkDeviceDeleteDialog"
        header="Confirm Device Delete"
        class="ff-dialog-fixed-height"
        confirm-label="Confirm"
        data-el="team-bulk-device-delete-dialog"
        kind="danger"
        @confirm="confirmBulkDelete()"
    >
        <template #default>
            <p>The following device{{ checkedDevices.length > 1 ? 's' : '' }} will be deleted:</p>
            <div class="max-h-96 overflow-y-auto">
                <ul class="ff-devices-ul">
                    <li v-for="device in checkedDevices" :key="device.id">
                        <span class="font-bold">{{ device.name }}</span> <span class="text-gray-500 text-sm"> ({{ device.id }})</span>
                    </li>
                </ul>
            </div>
            <p>This action cannot be undone.</p>
        </template>
    </ff-dialog>

    <ff-dialog
        ref="devicesMoveNoOwnerDialog"
        :header="displayingTeam ? `Unassign Device${checkedDevices.length > 1 ? 's' : ''}` : `Remove Device${checkedDevices.length > 1 ? 's' : ''} from ${displayingInstance ? 'Instance' : displayingApplication ? 'Application' : 'Assignment'}`"
        class="ff-dialog-fixed-height"
        :confirm-label="displayingTeam ?'Unassign' : 'Remove'"
        data-el="team-bulk-device-unassign-dialog"
        kind="danger"
        @confirm="moveDevicesToUnassigned(checkedDevices)"
    >
        <template #default>
            <p v-if="displayingInstance">The following devices will be removed from this Instance:</p>
            <p v-else-if="displayingApplication">The following devices will be removed from this Application:</p>
            <p v-else>The following devices will be removed from their current assignment:</p>
            <div class="max-h-96 overflow-y-auto">
                <ul class="ff-devices-ul">
                    <li v-for="device in checkedDevices" :key="device.id">
                        <span class="font-bold">{{ device.name }}</span> <span class="text-gray-500 text-sm"> ({{ device.id }})</span>
                    </li>
                </ul>
            </div>
            <p>This will stop the flows running on the device{{ checkedDevices.length > 1 ? 's' : '' }}.</p>
        </template>
    </ff-dialog>
</template>

<script>
import { ClockIcon } from '@heroicons/vue/outline'
import { PlusSmIcon } from '@heroicons/vue/solid'

import { markRaw } from 'vue'
import { mapGetters, mapState } from 'vuex'

import deviceApi from '../api/devices.js'
import teamApi from '../api/team.js'
import DropdownMenu from '../components/DropdownMenu.vue'
import usePermissions from '../composables/Permissions.js'
import { getTeamProperty } from '../composables/TeamProperties.js'
import deviceActionsMixin from '../mixins/DeviceActions.js'

import DeviceAssignedToLink from '../pages/application/components/cells/DeviceAssignedToLink.vue'
import DeviceLink from '../pages/application/components/cells/DeviceLink.vue'
import Snapshot from '../pages/application/components/cells/Snapshot.vue'

import DeviceCreatedAtCell from '../pages/device/DeviceCreatedAtCell.vue'
import DeviceLastSeenCell from '../pages/device/components/DeviceLastSeenCell.vue'
import DeviceModeBadge from '../pages/device/components/DeviceModeBadge.vue'
import SnapshotAssignDialog from '../pages/instance/VersionHistory/Snapshots/dialogs/SnapshotAssignDialog.vue'
import InstanceStatusBadge from '../pages/instance/components/InstanceStatusBadge.vue'
import DeviceAssignApplicationDialog from '../pages/team/Devices/dialogs/DeviceAssignApplicationDialog.vue'
import DeviceAssignInstanceDialog from '../pages/team/Devices/dialogs/DeviceAssignInstanceDialog.vue'
import DeviceCredentialsDialog from '../pages/team/Devices/dialogs/DeviceCredentialsDialog.vue'
import TeamDeviceCreateDialog from '../pages/team/Devices/dialogs/TeamDeviceCreateDialog.vue'

import Alerts from '../services/alerts.js'
import Dialog from '../services/dialog.js'
import FfPopover from '../ui-components/components/Popover.vue'
import PopoverItem from '../ui-components/components/PopoverItem.vue'
import FfCheckbox from '../ui-components/components/form/Checkbox.vue'

import { debounce } from '../utils/eventHandling.js'
import { createPollTimer } from '../utils/timers.js'

import EmptyState from './EmptyState.vue'
import FeatureUnavailableToTeam from './banners/FeatureUnavailableToTeam.vue'
import DevicesStatusBar from './charts/DeviceStatusBar.vue'
import AddDeviceToGroupDialog from './dialogs/_addDeviceToGroupDialog.vue'

const POLL_TIME = 10000

export default {
    name: 'DevicesBrowser',
    components: {
        FfCheckbox,
        PopoverItem,
        FfPopover,
        ClockIcon,
        DeviceAssignApplicationDialog,
        DeviceAssignInstanceDialog,
        DeviceCredentialsDialog,
        DropdownMenu,
        FeatureUnavailableToTeam,
        PlusSmIcon,
        SnapshotAssignDialog,
        TeamDeviceCreateDialog,
        EmptyState,
        DevicesStatusBar
    },
    mixins: [deviceActionsMixin],
    inheritAttrs: false,
    props: {
        // One of the two must be provided
        instance: {
            type: Object,
            required: false,
            default: null
        },
        application: {
            type: Object,
            required: false,
            default: null
        }
    },
    emits: ['instance-updated'],
    setup () {
        const { hasPermission } = usePermissions()

        return { hasPermission }
    },
    data () {
        return {
            // Page state
            loadingStatuses: true,
            loadingDevices: true,
            creatingDevice: false,
            deletingDevice: false,

            // Devices lists
            devices: new Map(), // devices currently available to be displayed

            checkedDevices: [], // devices currently selected in the table

            unsearchedHasMoreThanOnePage: true,
            unfilteredHasMoreThanOnePage: true,

            sort: {
                key: null,
                direction: 'desc'
            },
            /** @type { import('../utils/timers.js').PollTimer } */
            pollTimer: null,
            deviceEditModalOpened: false,
            deviceModeFilters: {
                fleetMode: false,
                developerMode: false
            }
        }
    },
    computed: {
        ...mapState('account', ['team', 'teamMembership']),
        ...mapState('ux/tours', ['tours']),
        ...mapGetters('account', ['featuresCheck']),
        columns () {
            const columns = [
                { label: 'Remote Instance', key: 'name', sortable: !this.moreThanOnePage, component: { is: markRaw(DeviceLink) } },
                { label: 'Type', key: 'type', class: ['w-48'], sortable: !this.moreThanOnePage },
                { label: 'Created', key: 'createdAt', class: ['w-48'], sortable: !this.moreThanOnePage, component: { is: markRaw(DeviceCreatedAtCell) } },
                { label: 'Last Seen', key: 'lastSeenAt', class: ['w-48'], sortable: !this.moreThanOnePage, component: { is: markRaw(DeviceLastSeenCell) } },
                { label: 'Mode', key: 'mode', class: ['w-30'], sortable: true, component: { is: markRaw(DeviceModeBadge) } },
                { label: 'Last Known Status', class: ['w-32'], component: { is: markRaw(InstanceStatusBadge), map: { instanceId: 'id' }, extraProps: { instanceType: 'device' } } }
            ]

            if (this.displayingTeam) {
                // Show which application/instance the device is assigned to when looking at devices owned by a team
                columns.push({
                    label: 'Assigned To',
                    class: ['w-48'],
                    key: '_ownerSortKey',
                    sortable: !this.moreThanOnePage,
                    component: {
                        is: markRaw(DeviceAssignedToLink)
                    }
                })
                if (this.featuresCheck.isDeviceGroupsFeatureEnabled) {
                    columns.push({
                        label: 'Group',
                        key: 'deviceGroup.name',
                        sortable: !this.moreThanOnePage
                    })
                }
            } else if (this.displayingInstance) {
                // Show snapshot info when looking at devices owned by an instance
                columns.push(
                    { label: 'Deployed Snapshot', class: ['w-48'], component: { is: markRaw(Snapshot) } }
                )
            } else if (this.displayingApplication && this.featuresCheck.isDeviceGroupsFeatureEnabled) {
                columns.push({
                    label: 'Group',
                    key: 'deviceGroup.name',
                    sortable: !this.moreThanOnePage
                })
            }

            return columns
        },
        filteredDevices () {
            const devicesToDisplay = new Set(this.filter?.devices)

            return Array.from(this.devices.values()).filter((device) => {
                if (!this.filter || this.unfilteredHasMoreThanOnePage) {
                    return true
                }

                return devicesToDisplay.has(device.id)
            })
        },
        devicesWithStatuses () {
            const output = this.filteredDevices.map(device => {
                const statusObject = this.allDeviceStatuses.get(device.id)
                const ownerKey = this.getOwnerSortKeyForDevice(device)
                const context = device.application?.id ? { applicationId: device.application?.id } : {}
                return {
                    hideContextMenu: !this.hasPermission('device:edit', context),
                    ...device,
                    ...statusObject,
                    ...(ownerKey ? { _ownerSortKey: ownerKey } : { _ownerSortKey: undefined }),
                    deviceGroup: device.deviceGroup || { name: 'Ungrouped' }
                }
            })

            return output
        },
        hasLoadedModel () {
            return (
                (this.displayingInstance && !!this.instance?.id) ||
                (this.displayingApplication && !!this.application?.id) ||
                (this.displayingTeam && !!this.team?.id)
            )
        },
        moreThanOnePage () {
            return !!this.nextCursor
        },
        teamRuntimeLimitReached () {
            let teamTypeRuntimeLimit = getTeamProperty(this.team, 'runtimes.limit')
            // Uses this.teamDeviceCount as that tracks live updates made in the page
            // that may not have made it to this.team.deviceCount yet
            const currentRuntimeCount = this.teamDeviceCount + this.team.instanceCount
            if (this.team.billing?.trial && !this.team.billing?.active && getTeamProperty(this.team, 'trial.runtimesLimit')) {
                teamTypeRuntimeLimit = getTeamProperty(this.team, 'trial.runtimesLimit')
            }
            return (teamTypeRuntimeLimit > 0 && currentRuntimeCount >= teamTypeRuntimeLimit)
        },
        teamDeviceLimitReached () {
            const teamTypeDeviceLimit = getTeamProperty(this.team, 'devices.limit')
            if (teamTypeDeviceLimit > 0 && this.teamDeviceCount >= teamTypeDeviceLimit) {
                // Device specific limit has been reached
                return true
            }
            return false
        },
        bulkActionsDropdownOptions () {
            const actionsEnabled = this.checkedDevices?.length > 0
            const enableDelete = actionsEnabled && this.hasPermission('team:device:bulk-delete', this.applicationContext)
            const enableMove = actionsEnabled && this.hasPermission('team:device:bulk-edit', this.applicationContext)
            const showRemoveFromInstance = this.displayingInstance || this.displayingTeam
            const showRemoveFromApplication = this.displayingApplication || this.displayingTeam
            const menu = []
            menu.push({ name: 'Move to Instance', action: this.showTeamBulkDeviceMoveToInstanceDialog, disabled: !enableMove })
            menu.push({ name: 'Move to Application', action: this.showTeamBulkDeviceMoveToApplicationDialog, disabled: !enableMove })
            if (this.displayingInstance && showRemoveFromInstance) {
                menu.push({ name: 'Remove from Instance', action: this.showTeamBulkDeviceUnassignDialog, disabled: !enableMove })
            } else if (this.displayingApplication && showRemoveFromApplication) {
                menu.push({ name: 'Remove from Application', action: this.showTeamBulkDeviceUnassignDialog, disabled: !enableMove })
            } else if (this.displayingTeam && (showRemoveFromInstance || showRemoveFromApplication)) {
                menu.push({ name: 'Unassign', action: this.showTeamBulkDeviceUnassignDialog, disabled: !enableMove })
            }

            if (enableMove && !this.displayingInstance && this.featuresCheck.isDeviceGroupsFeatureEnabled) {
                menu.push(null)
                menu.push({ name: 'Assign to Group', action: this.showBulkGroupAssignDialog, disabled: !enableMove })
                menu.push({ name: 'Unassign from Group', action: this.showBulkGroupUnassignDialog, disabled: !enableMove })
            }

            menu.push(null)
            menu.push({ name: 'Delete', class: ['!text-red-600'], action: this.showTeamBulkDeviceDeleteDialog, disabled: !enableDelete })
            return menu
        },
        applicationContext () {
            return {
                application: this.application || this.instance?.application
            }
        }
    },
    watch: {
        instance: 'fullReloadOfData',
        application: 'fullReloadOfData',
        team: 'fullReloadOfData'
    },
    mounted () {
        this.fullReloadOfData()
        this.pollTimer = createPollTimer(this.pollTimerElapsed, POLL_TIME) // auto starts
    },
    async unmounted () {
        this.pollTimer.stop()
        if (this.deviceCountDeltaSincePageLoad !== 0) {
            // Trigger a refresh of team info to resync following device
            // changes
            await this.$store.dispatch('account/refreshTeam')
        }
    },
    methods: {
        pollTimerElapsed: async function () {
            this.pollTimer.pause()
            try {
                await this.pollForDeviceStatuses()
            } finally {
                this.pollTimer.resume()
            }
        },

        /**
         * filter: Object containing keys:
         *  - devices: an array of device ids
         *  - property: which filter row is being applied, e.g. status or lastseen
         *  - bucket: which value of this property are we filtering on from the buckets in the status bar
         */
        applyFilter (filter, shouldClearDeviceModeFilters = true) {
            this.filter = filter

            if (this.unfilteredHasMoreThanOnePage) {
                this.doFilterServerSide()
            }

            if (shouldClearDeviceModeFilters) {
                this.deviceModeFilters = {
                    fleetMode: false,
                    developerMode: false
                }
            }
        },

        updateSearch (searchTerm) {
            this.searchTerm = searchTerm

            if (this.unsearchedHasMoreThanOnePage) {
                this.doSearchServerSide()
            }
        },

        updateSort (key, direction) {
            this.sort.key = key
            this.sort.direction = direction

            if (this.moreThanOnePage) {
                this.doSortServerSide()
            }
        },

        doFilterServerSide: debounce(function () {
            this.loadDevices(true)
        }, 50),

        doSearchServerSide: debounce(function () {
            this.loadDevices(true)
        }, 150),

        doSortServerSide: debounce(function () {
            this.loadDevices(true)
        }, 50),

        showCreateDeviceDialog () {
            const showApplicationsList = this.displayingTeam
            this.deviceEditModalOpened = true
            this.$nextTick(() => this.$refs.teamDeviceCreateDialog.show(null, this.instance, this.application, showApplicationsList))
        },

        showEditDeviceDialog (device) {
            // overrides the deviceActionsMixin method
            this.deviceEditModalOpened = true
            const showApplicationsList = this.displayingTeam
            this.$nextTick(() => this.$refs.teamDeviceCreateDialog.show(device,
                null,
                device.application ?? null,
                showApplicationsList))
        },

        confirmBulkDelete () {
            // do the delete
            teamApi.bulkDeviceDelete(this.team?.id, this.checkedDevices.map(device => device.id))
                .then(() => {
                    Alerts.emit('Devices successfully deleted.', 'confirmation')
                    this.fullReloadOfData()
                })
                .catch((error) => {
                    Alerts.emit('Error deleting devices: ' + error.message, 'error')
                })
        },

        showTeamBulkDeviceDeleteDialog () {
            this.$refs.teamBulkDeviceDeleteDialog.show()
        },

        showTeamBulkDeviceUnassignDialog () {
            this.$refs.devicesMoveNoOwnerDialog.show()
        },

        showTeamBulkDeviceMoveToInstanceDialog () {
            this.$refs.deviceAssignInstanceDialog.show(this.checkedDevices)
        },

        showTeamBulkDeviceMoveToApplicationDialog () {
            this.$refs.deviceAssignApplicationDialog.show(this.checkedDevices)
        },

        showBulkGroupUnassignDialog () {
            Dialog.show({
                header: 'Remove selected Remote Instances from their respective groups?',
                kind: 'danger',
                html: `
                    <p>These Remote Instances will be cleared of any active pipeline snapshot.</p>
                    <p>Are you sure you want to continue?</p>
                `,
                confirmLabel: 'Confirm'
            }, () => teamApi.bulkDeviceMove(this.team.id, this.checkedDevices.map(device => device.id), 'group', '')
                .then(() => this.fullReloadOfData())
                .catch(e => e)
            )
        },

        showBulkGroupAssignDialog () {
            let selectedDeviceGroup

            Dialog.show({
                header: 'Add devices to a group',
                kind: 'danger',
                is: {
                    component: markRaw(AddDeviceToGroupDialog),
                    payload: {
                        devices: this.checkedDevices
                    },
                    on: {
                        selected (selection) {
                            selectedDeviceGroup = selection
                        }
                    }
                },
                confirmLabel: 'Confirm'
            }, async () => {
                return teamApi.bulkDeviceMove(this.team.id, this.checkedDevices.map(device => device.id), 'group', selectedDeviceGroup)
                    .then(() => Alerts.emit('Successfully assigned devices.', 'confirmation'))
                    .catch(e => {
                        if (e.response?.data?.code === 'invalid_input' && e.response?.data?.error) {
                            Alerts.emit(e.response.data.error, 'warning')
                        } else Alerts.emit('Something went wrong.', 'warning')

                        console.error(e)
                    })
                    .finally(() => this.fullReloadOfData())
            })
        },

        showSelectTargetSnapshotDialog () {
            this.$refs.snapshotAssignDialog.show()
        },

        async assignDevice (device, instanceId) {
            const updatedDevice = await deviceApi.updateDevice(device.id, { instance: instanceId })

            Alerts.emit('Device successfully assigned to instance.', 'confirmation')

            this.updateLocalCopyOfDevice({ ...device, ...updatedDevice })
        },

        async assignDeviceToApplication (device, applicationId) {
            const updatedDevice = await deviceApi.updateDevice(device.id, { application: applicationId, instance: null })

            Alerts.emit('Device successfully assigned to application.', 'confirmation')

            this.updateLocalCopyOfDevice({ ...device, ...updatedDevice })
        },

        /**
         * @param {Array<object>} devices - Array of devices to move
         * @param {string} instance - ID of the instance to move the devices to
         */
        async moveDevicesToInstance (devices, instance) {
            const deviceIds = devices.map(device => device.id)
            const data = await teamApi.bulkDeviceMove(this.team.id, deviceIds, 'instance', instance)
            if (data?.devices.length) {
                Alerts.emit('Devices successfully moved.', 'confirmation')
                data.devices.forEach(updatedDevice => {
                    const device = this.devices.get(updatedDevice.id)
                    // ensure the updated device has `instance` and `application` set so that the local copy is updated correctly
                    const ensureProps = { instance: updatedDevice.instance || null, application: updatedDevice.application || null }
                    this.updateLocalCopyOfDevice({ ...device, ...updatedDevice, ...ensureProps })
                })
            }
        },

        /**
         * @param {Array<object>} devices - Array of devices to move
         * @param {string} application - ID of the application to move the devices to
         */
        async moveDevicesToApplication (devices, application) {
            const deviceIds = devices.map(device => device.id)
            teamApi.bulkDeviceMove(this.team.id, deviceIds, 'application', application)
                .then(() => Alerts.emit('Devices successfully moved.', 'confirmation'))
                .catch((e) => {
                    if (e.response?.data?.code === 'invalid_input' && e.response?.data?.error) {
                        Alerts.emit(e.response.data.error, 'warning')
                    } else Alerts.emit('Something went wrong.', 'warning')

                    console.error(e)
                })
                .finally(() => this.fullReloadOfData())
        },

        /**
         * @param {Array<object>} devices - Array of devices to move
         */
        async moveDevicesToUnassigned (devices) {
            const deviceIds = devices.map(device => device.id)
            teamApi.bulkDeviceMove(this.team.id, deviceIds, 'unassigned')
                .then(() => Alerts.emit('Devices successfully unassigned.', 'confirmation'))
                .catch((e) => {
                    if (e.response?.data?.code === 'invalid_input' && e.response?.data?.error) {
                        Alerts.emit(e.response.data.error, 'warning')
                    } else Alerts.emit('Something went wrong.', 'warning')

                    console.error(e)
                })
                .finally(() => this.fullReloadOfData())
        },

        // Device loading
        fullReloadOfData () {
            this.checkedDevices = []
            this.loadDevices(true)
            this.pollForDeviceStatuses(true)
        },

        async loadDevices (reset) {
            if (this.hasLoadedModel) {
                await this.fetchDevices(reset)
            }
        },

        async loadMoreDevices () {
            await this.fetchDevices()
        },

        async pollForDeviceStatuses (reset) {
            if (this.hasLoadedModel) {
                await this.fetchAllDeviceStatuses(reset)
            }
        },

        async fetchDevices (resetPage = false) {
            if (resetPage) {
                this.nextCursor = null
            }

            /// Params to send to the server
            const nextCursor = this.nextCursor
            const extraParams = {}

            // Specific filtering
            if (this.filter?.property && this.filter?.bucket) {
                extraParams.filters = `${this.filter.property}:${this.filter.bucket}`
            }

            // Search and sort
            if (this.searchTerm) {
                extraParams.query = this.searchTerm
            }
            if (this.sort.key) {
                extraParams.sort = this.sort.key
                if (this.sort.direction) {
                    extraParams.dir = this.sort.direction
                }
            }

            // Actually fetch the data
            const data = await this.fetchData(nextCursor, null, extraParams)

            if (resetPage) {
                this.devices = new Map()
            }

            data.devices.forEach(device => {
                this.devices.set(device.id, device)
            })

            // Pagination
            this.nextCursor = data.meta?.next_cursor || null

            if (!extraParams.query) {
                this.unsearchedHasMoreThanOnePage = this.moreThanOnePage
            }

            if (!extraParams.filters) {
                this.unfilteredHasMoreThanOnePage = this.moreThanOnePage
            }

            this.loadingDevices = false
        },

        getOwnerSortKeyForDevice (device) {
            if (!this.displayingTeam) {
                return null
            }

            if (device.ownerType === 'application') {
                return 'Application:' + device.application?.name || 'No Name'
            }

            if (device.ownerType === 'instance') {
                return 'Instance:' + device.instance?.name || 'No Name'
            }

            return 'Unassigned'
        },

        onFilterClick (filter, closeCallback) {
            const compare = filter === 'fleetMode' ? 'autonomous' : 'developer'
            this.deviceModeFilters[filter] = !this.deviceModeFilters[filter]

            this.applyFilter(
                {
                    devices: Array.from(this.devices.values())
                        .filter((device) => !this.deviceModeFilters[filter] ? true : device.mode === compare)
                        .map(device => device.id),
                    property: 'mode',
                    bucket: compare
                },
                false
            )

            // resetting filters because we can't have multiple filters applied at once
            const filters = {
                fleetMode: false,
                developerMode: false
            }
            filters[filter] = this.deviceModeFilters[filter]
            this.deviceModeFilters = filters
        }
    }
}
</script>

<style>
.ff-dialog-content .ff-devices-ul {
    list-style-type: disc;
    list-style-position: inside;
    columns: 2;
}
.ff-dialog-content .ff-devices-ul li {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
</style>
