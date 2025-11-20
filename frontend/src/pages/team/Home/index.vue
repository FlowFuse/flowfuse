<template>
    <ff-page>
        <template #header>
            <ff-page-header>
                <template #breadcrumbs>
                    <ff-nav-breadcrumb>Home</ff-nav-breadcrumb>
                </template>
            </ff-page-header>
        </template>

        <div id="team-dashboard" class="page-wrapper overflow-auto" :data-team="team.slug">
            <transition name="fade" mode="out-in">
                <ff-loading v-if="loading || pendingTeamChange" message="Loading Dashboard..." />

                <div v-else class="ff-team-dashboard">
                    <section class="instances-section flex gap-3 mb-3 flex-wrap">
                        <DashboardSection title="Hosted Instances" type="hosted">
                            <template #icon>
                                <ProjectsIcon class="ff-icon-lg" />
                            </template>

                            <div class="stats flex gap-2 mb-5">
                                <InstanceStat
                                    :counter="instanceStats.running"
                                    state="running" type="hosted" @clicked="onStatClick"
                                />
                                <InstanceStat
                                    :counter="instanceStats.error"
                                    state="error" type="hosted" @clicked="onStatClick"
                                />
                                <InstanceStat
                                    :counter="instanceStats.stopped"
                                    state="stopped" type="hosted" @clicked="onStatClick"
                                />
                            </div>

                            <template #actions>
                                <ff-button
                                    v-ff-tooltip:left="!hasPermission('project:create') && 'Your role does not allow creating new instances. Contact a team admin to change your role.'"
                                    data-action="create-project"
                                    kind="secondary"
                                    :to="{name: 'CreateInstance'}"
                                    :disabled="!hasPermission('project:create')"
                                >
                                    <template #icon-left>
                                        <PlusIcon class="ff-icon" />
                                    </template>
                                    Add Instance
                                </ff-button>
                            </template>

                            <RecentlyModifiedInstances :total-instances="totalInstances" @delete-instance="openDeleteInstanceForm" />
                        </DashboardSection>

                        <DashboardSection title="Remote Instances" type="remote">
                            <template #icon>
                                <ChipIcon class="ff-icon-lg" />
                            </template>

                            <div class="stats flex gap-2 mb-5">
                                <InstanceStat
                                    :counter="deviceStats.running"
                                    state="running" type="remote" @clicked="onStatClick"
                                />
                                <InstanceStat
                                    :counter="deviceStats.error"
                                    state="error" type="remote" @clicked="onStatClick"
                                />
                                <InstanceStat
                                    :counter="deviceStats.stopped"
                                    state="stopped" type="remote" @clicked="onStatClick"
                                />
                            </div>

                            <template #actions>
                                <ff-button
                                    v-ff-tooltip:left="!hasPermission('device:create') && 'Your role does not allow creating new remote instances. Contact a team admin to change your role.'"
                                    data-action="create-project"
                                    kind="secondary"
                                    :disabled="!hasPermission('device:create')"
                                    @click="showCreateDeviceDialog"
                                >
                                    <template #icon-left>
                                        <PlusIcon class="ff-icon" />
                                    </template>
                                    Add Instance
                                </ff-button>
                            </template>

                            <RecentlyModifiedDevices :total-devices="totalDevices" />
                        </DashboardSection>
                    </section>

                    <DashboardSection title="Recent Activity" class="overflow-auto" type="audit">
                        <template #icon>
                            <DatabaseIcon class="ff-icon-lg" />
                        </template>

                        <AuditLog :entries="logEntries" />
                    </DashboardSection>

                    <ConfirmInstanceDeleteDialog
                        v-if="isDeleteInstanceDialogOpen" ref="confirmInstanceDeleteDialog"
                        @cancel="isDeleteInstanceDialogOpen = false"
                        @confirm="onInstanceDeleted"
                    />
                </div>
            </transition>
        </div>
    </ff-page>
    <TeamDeviceCreateDialog
        v-if="team && modals.addDevice"
        ref="teamDeviceCreateDialog"
        :team="team"
        :teamDeviceCount="totalDevices"
        @device-created="deviceCreated"
        @close="modals.addDevice = false"
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
</template>

<script>
import { ChipIcon, DatabaseIcon, PlusIcon } from '@heroicons/vue/outline'

import { mapGetters, mapState } from 'vuex'

import TeamAPI from '../../../api/team.js'
import AuditLog from '../../../components/audit-log/AuditLog.vue'
import ProjectsIcon from '../../../components/icons/Projects.js'
import InstanceStat from '../../../components/tiles/InstanceCounter.vue'
import { useInstanceStates } from '../../../composables/InstanceStates.js'
import usePermissions from '../../../composables/Permissions.js'
import Alerts from '../../../services/alerts.js'
import ConfirmInstanceDeleteDialog from '../../instance/Settings/dialogs/ConfirmInstanceDeleteDialog.vue'
import DeviceCredentialsDialog from '../Devices/dialogs/DeviceCredentialsDialog.vue'
import TeamDeviceCreateDialog from '../Devices/dialogs/TeamDeviceCreateDialog.vue'

import DashboardSection from './components/DashboardSection.vue'
import RecentlyModifiedDevices from './components/RecentlyModifiedDevices.vue'
import RecentlyModifiedInstances from './components/RecentlyModifiedInstances.vue'

export default {
    name: 'TeamHome',
    components: {
        DeviceCredentialsDialog,
        ConfirmInstanceDeleteDialog,
        InstanceStat,
        RecentlyModifiedInstances,
        AuditLog,
        DashboardSection,
        ChipIcon,
        ProjectsIcon,
        DatabaseIcon,
        PlusIcon,
        RecentlyModifiedDevices,
        TeamDeviceCreateDialog
    },
    setup () {
        const { groupBySimplifiedStates, statesMap: instanceStatesMap } = useInstanceStates()

        const { hasPermission } = usePermissions()
        return {
            groupBySimplifiedStates,
            instanceStatesMap,
            hasPermission
        }
    },
    data () {
        return {
            loading: true,
            logEntries: [],
            instances: [],
            instanceStateCounts: {},
            deviceStateCounts: {},
            isDeleteInstanceDialogOpen: false,
            devices: [],
            modals: {
                addDevice: false
            }
        }
    },
    computed: {
        ...mapState('ux/tours', ['tours']),
        ...mapGetters('account', ['team', 'pendingTeamChange', 'featuresCheck']),
        instanceStats () {
            return this.groupBySimplifiedStates(this.instanceStateCounts)
        },
        deviceStats () {
            return this.groupBySimplifiedStates(this.deviceStateCounts)
        },
        totalInstances () {
            return this.instanceStateCounts
                ? Object.values(this.instanceStateCounts).reduce((total, count) => total + count, 0)
                : 0
        },
        totalDevices () {
            return this.deviceStateCounts
                ? Object.values(this.deviceStateCounts).reduce((total, count) => total + count, 0)
                : 0
        }
    },
    async mounted () {
        if ('billing_session' in this.$route.query) {
            this.$nextTick(() => {
                // Clear the query param so a reload of the page does re-trigger
                // the notification
                this.$router.replace({ query: '' })
                // allow the Alerts service to have subscription by wrapping in nextTick
                Alerts.emit('Thanks for signing up to FlowFuse!', 'confirmation')
            })
        }

        this.getInstanceStateCounts()
        this.getDeviceStateCounts()
        this.getRecentActivity()
            .finally(() => {
                this.loading = false
            })
            .catch(e => e)
    },
    methods: {
        getRecentActivity () {
            return TeamAPI.getTeamAuditLog(this.team.id, { }, null, 50)
                .then((response) => {
                    this.logEntries = response.log
                })
        },
        onStatClick (payload) {
            const searchQuery = Object.prototype.hasOwnProperty.call(this.instanceStatesMap, payload.state)
                ? this.instanceStatesMap[payload.state].join(' | ')
                : ''
            const name = payload.type === 'hosted' ? 'Instances' : 'TeamDevices'

            this.$router.push({ name, query: { searchQuery } })
        },
        getInstanceStateCounts () {
            return TeamAPI.getTeamInstanceCounts(this.team.id, [], 'hosted')
                .then(res => {
                    this.instanceStateCounts = res
                })
                .catch(e => e)
        },
        getDeviceStateCounts () {
            return TeamAPI.getTeamInstanceCounts(this.team.id, [], 'remote')
                .then(res => {
                    this.deviceStateCounts = res
                })
                .catch(e => e)
        },
        openDeleteInstanceForm (instance) {
            this.isDeleteInstanceDialogOpen = true
            this.$nextTick(() => this.$refs.confirmInstanceDeleteDialog.show(instance))
        },
        onInstanceDeleted (instance) {
            this.isDeleteInstanceDialogOpen = false
            // get the new number of instances which triggers a recently modified instances list refresh
            this.getInstanceStateCounts()
        },
        showCreateDeviceDialog () {
            this.modals.addDevice = true
            this.$nextTick(() => {
                this.$refs.teamDeviceCreateDialog.show(null, null, null, true)
            })
        },
        deviceCreated (device) {
            // navigate to the new Remote Instance
            this.$refs.deviceCredentialsDialog.show(device)
        }
    }
}
</script>

<style scoped lang="scss">
.ff-team-dashboard {
    height: 100%;
    display: flex;
    flex: 1;
    flex-direction: column;
    overflow: auto;
    container-type: inline-size;
    container-name: team-dashboard;
}

.instances-section {
    // Default: stacked (flex-wrap)
    // When container is 640px+ wide, display side-by-side
    @container team-dashboard (min-width: 640px) {
        flex-wrap: nowrap;
    }
}
</style>

<style lang="scss">
#team-dashboard {
    .ff-accordion {
        border: none;

        &--button {
            background: $ff-white;
            border: none;
            border-bottom: 1px solid $ff-color--border;
        }

        &--content {
            & > div {
                &:nth-child(odd) {
                    background: $ff-grey-50;
                }

                .ff-audit-entry {
                    border: none;
                }
            }
        }
    }
}
</style>
