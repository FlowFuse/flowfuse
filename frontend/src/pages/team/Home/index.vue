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
                    <section class="flex gap-3 mb-3 flex-wrap md:flex-nowrap">
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
</template>

<script>
import { ChipIcon, DatabaseIcon } from '@heroicons/vue/outline'

import { mapGetters } from 'vuex'

import TeamAPI from '../../../api/team.js'
import AuditLog from '../../../components/audit-log/AuditLog.vue'

import ProjectsIcon from '../../../components/icons/Projects.js'
import { useInstanceStates } from '../../../composables/InstanceStates.js'
import ConfirmInstanceDeleteDialog from '../../instance/Settings/dialogs/ConfirmInstanceDeleteDialog.vue'

import DashboardSection from './components/DashboardSection.vue'
import InstanceStat from './components/InstanceStat.vue'
import RecentlyModifiedDevices from './components/RecentlyModifiedDevices.vue'
import RecentlyModifiedInstances from './components/RecentlyModifiedInstances.vue'

export default {
    name: 'TeamHome',
    components: {
        ConfirmInstanceDeleteDialog,
        InstanceStat,
        RecentlyModifiedInstances,
        AuditLog,
        DashboardSection,
        ChipIcon,
        ProjectsIcon,
        DatabaseIcon,
        RecentlyModifiedDevices
    },
    setup () {
        const { runningStates: runningInstanceStates, errorStates: errorInstanceStates, stoppedStates: stoppedInstanceStates } = useInstanceStates()

        return {
            runningInstanceStates,
            errorInstanceStates,
            stoppedInstanceStates
        }
    },
    data () {
        return {
            loading: true,
            logEntries: [],
            instances: [],
            instanceStateCounts: {},
            isDeleteInstanceDialogOpen: false,
            devices: [],
            deviceStateCounts: {},
            statesMap: {
                running: this.runningInstanceStates,
                error: this.errorInstanceStates,
                stopped: this.stoppedInstanceStates
            }
        }
    },
    computed: {
        ...mapGetters('account', ['team', 'pendingTeamChange']),
        instanceStats () {
            return {
                running: this.instanceStateCounts
                    ? Object.keys(this.instanceStateCounts)
                        .filter(key => this.statesMap.running.includes(key))
                        .reduce((total, key) => total + this.instanceStateCounts[key], 0)
                    : 0,
                error: this.instanceStateCounts
                    ? Object.keys(this.instanceStateCounts)
                        .filter(key => this.statesMap.error.includes(key))
                        .reduce((total, key) => total + this.instanceStateCounts[key], 0)
                    : 0,
                stopped: this.instanceStateCounts
                    ? Object.keys(this.instanceStateCounts)
                        .filter(key => this.statesMap.stopped.includes(key))
                        .reduce((total, key) => total + this.instanceStateCounts[key], 0)
                    : 0
            }
        },
        deviceStats () {
            return {
                running: this.deviceStateCounts
                    ? Object.keys(this.deviceStateCounts)
                        .filter(key => this.statesMap.running.includes(key))
                        .reduce((total, key) => total + this.deviceStateCounts[key], 0)
                    : 0,
                error: this.deviceStateCounts
                    ? Object.keys(this.deviceStateCounts)
                        .filter(key => this.statesMap.error.includes(key))
                        .reduce((total, key) => total + this.deviceStateCounts[key], 0)
                    : 0,
                stopped: this.deviceStateCounts
                    ? Object.keys(this.deviceStateCounts)
                        .filter(key => this.statesMap.stopped.includes(key))
                        .reduce((total, key) => total + this.deviceStateCounts[key], 0)
                    : 0
            }
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
            const searchQuery = Object.prototype.hasOwnProperty.call(this.statesMap, payload.state)
                ? this.statesMap[payload.state].join(' | ')
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
