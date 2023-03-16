<template>
    <Teleport v-if="mounted" to="#platform-sidenav">
        <SideNavigationTeamOptions>
            <template v-slot:nested-menu>
                <div class="ff-nested-title">Application</div>
                <router-link v-for="route in navigation" :key="route.label" :to="route.path">
                    <nav-item :icon="route.icon" :label="route.label" :data-nav="route.tag"></nav-item>
                </router-link>
            </template>
        </SideNavigationTeamOptions>
    </Teleport>

    <ff-loading v-if="loading.deleting" message="Deleting Application..." />
    <ff-loading v-else-if="loading.suspend" message="Suspending Application..." />
    <main v-else-if="!project?.id">
        <ff-loading message="Loading Application..." />
    </main>
    <main v-else class="ff-with-status-header">
        <ConfirmInstanceDeleteDialog @confirm="deleteInstance" ref="confirmInstanceDeleteDialog"/>
        <ConfirmApplicationDeleteDialog @confirm="deleteApplication" ref="confirmApplicationDeleteDialog"/>
        <Teleport v-if="mounted" to="#platform-banner">
            <div v-if="isVisitingAdmin" class="ff-banner" data-el="banner-project-as-admin">You are viewing this application as an Administrator</div>
            <SubscriptionExpiredBanner :team="team" />
            <TeamTrialBanner v-if="team.billing?.trial" :team="team" />
        </Teleport>

        <div class="ff-instance-header">
            <InstanceStatusHeader>
                <template #hero>
                    <div class="flex-grow space-x-6 items-center inline-flex" data-el="application-name">
                        <div class="text-gray-800 text-xl font-bold">
                            <div class="text-sm font-medium text-gray-500">Application:</div>
                            {{ project.name }}
                        </div>
                    </div>
                </template>
            </InstanceStatusHeader>
        </div>
        <div class="px-3 py-3 md:px-6 md:py-6">
            <router-view
                :project="project"
                :is-visiting-admin="isVisitingAdmin"
                @project-enable-polling="onEnablePolling"
                @project-disable-polling="onDisablePolling"
                @projectUpdated="updateProject"
                @project-start="startProject"
                @project-restart="restartProject"
                @project-suspend="showConfirmSuspendDialog"
                @project-delete="showConfirmDeleteInstanceDialog"
                @application-delete="showConfirmDeleteApplicationDialog"
            />
        </div>
    </main>
</template>

<script>
import { Roles } from '@core/lib/roles'
import { ChevronLeftIcon, CogIcon, TerminalIcon, ViewListIcon } from '@heroicons/vue/solid'

import { mapState } from 'vuex'

import InstanceStatusHeader from '@/components/InstanceStatusHeader'
import ConfirmInstanceDeleteDialog from '../instance/Settings/dialogs/ConfirmInstanceDeleteDialog'

import ConfirmApplicationDeleteDialog from './Settings/dialogs/ConfirmApplicationDeleteDialog'

import instanceApi from '@/api/instances'
import projectApi from '@/api/project'
import snapshotApi from '@/api/projectSnapshots'

import NavItem from '@/components/NavItem'
import SideNavigationTeamOptions from '@/components/SideNavigationTeamOptions.vue'
import SubscriptionExpiredBanner from '@/components/banners/SubscriptionExpired.vue'
import TeamTrialBanner from '@/components/banners/TeamTrial.vue'

import ProjectsIcon from '@/components/icons/Projects'
import permissionsMixin from '@/mixins/Permissions'

import alerts from '@/services/alerts'
import Dialog from '@/services/dialog'

const projectTransitionStates = [
    'loading',
    'installing',
    'starting',
    'stopping',
    'restarting',
    'suspending',
    'importing'
]

export default {
    name: 'ProjectPage',
    components: {
        ConfirmApplicationDeleteDialog,
        ConfirmInstanceDeleteDialog,
        InstanceStatusHeader,
        NavItem,
        SideNavigationTeamOptions,
        SubscriptionExpiredBanner,
        TeamTrialBanner
    },
    mixins: [permissionsMixin],
    data: function () {
        return {
            mounted: false,
            icons: {
                chevronLeft: ChevronLeftIcon
            },
            project: {},
            navigation: [],
            checkInterval: null,
            checkWaitTime: 1000,
            loading: {
                deleting: false,
                suspend: false
            }
        }
    },
    computed: {
        ...mapState('account', ['teamMembership', 'team']),
        isVisitingAdmin: function () {
            return this.teamMembership.role === Roles.Admin
        },
        isLoading: function () {
            return this.loading.deleting || this.loading.suspend
        }
    },
    watch: {
        project: 'checkAccess',
        teamMembership: 'checkAccess',
        'project.pendingStateChange': 'refreshProject'
    },
    async created () {
        await this.updateProject()
    },
    mounted () {
        this.checkAccess()
        this.mounted = true
    },
    beforeUnmount () {
        this.onDisablePolling(true)
    },
    methods: {
        async onEnablePolling () {
            await this.updateProject()
            this.checkWaitTime = 1000
            if (this.project.pendingRestart && !this.projectTransitionStates.includes(this.project.state)) {
                this.project.pendingRestart = false
            }
            this.checkAccess()
        },
        onDisablePolling (unmounting) {
            if (unmounting) {
                // ensure timer and flags are cleared when navigating away from page
                if (this.project?.pendingStateChange || this.project?.pendingRestart) {
                    this.project.pendingStateChange = false
                    this.project.pendingRestart = false
                }
                clearTimeout(this.checkInterval)
            }
        },
        async updateProject () {
            const projectId = this.$route.params.id
            try {
                const data = await projectApi.getProject(projectId)
                this.project = { ...{ deviceSettings: {} }, ...this.project, ...data }
                this.$store.dispatch('account/setTeam', this.project.team.slug)
                this.project.deviceSettings = await projectApi.getProjectDeviceSettings(projectId)
                if (this.project.deviceSettings?.targetSnapshot) {
                    this.project.targetSnapshot = await snapshotApi.getSnapshot(projectId, this.project.deviceSettings.targetSnapshot)
                } else {
                    this.project.targetSnapshot = null
                }
            } catch (err) {
                this.$router.push({
                    name: 'PageNotFound',
                    params: { pathMatch: this.$router.currentRoute.value.path.substring(1).split('/') },
                    // preserve existing query and hash if any
                    query: this.$router.currentRoute.value.query,
                    hash: this.$router.currentRoute.value.hash
                })
            }
        },
        async refreshProject () {
            if (this.project.pendingStateChange) {
                clearTimeout(this.checkInterval)
                this.checkInterval = setTimeout(async () => {
                    this.checkWaitTime *= 1.1

                    if (this.project.id) {
                        const data = await projectApi.getProject(this.project.id)
                        const wasPendingRestart = this.project.pendingRestart
                        const wasPendingStateChange = this.project.pendingStateChange
                        const wasPendingStatePrevious = this.project.pendingStatePrevious
                        this.project = data
                        if (wasPendingRestart && this.project.meta.state !== 'running') {
                            this.project.pendingRestart = true
                        }
                        this.project.pendingStatePrevious = wasPendingStatePrevious
                        this.project.pendingStateChange = wasPendingStateChange
                    }
                }, this.checkWaitTime)
            }
        },
        checkAccess () {
            this.navigation = [
                { label: 'Node-RED Instances', path: `/project/${this.project.id}/instances`, tag: 'project-overview', icon: ProjectsIcon },
                { label: 'Node-RED Logs', path: `/project/${this.project.id}/logs`, tag: 'project-logs', icon: TerminalIcon },
                { label: 'Audit Log', path: `/project/${this.project.id}/activity`, tag: 'project-activity', icon: ViewListIcon },
                { label: 'Settings', path: `/project/${this.project.id}/settings`, tag: 'project-settings', icon: CogIcon }
            ]
            if (this.mounted && this.project.meta) {
                let doRefresh = false
                if (this.project.pendingStatePrevious && this.project.pendingStatePrevious !== this.project.meta.state) {
                    // state has changed (i.e. something did occur) so reset pendingRestart
                    // and rely on projectTransitionStates to continue polling
                    this.project.pendingRestart = false
                    doRefresh = true // refresh once more to get the new state
                }
                if (projectTransitionStates.includes(this.project.meta.state)) {
                    doRefresh = true // refresh
                }
                this.project.pendingStatePrevious = this.project.meta.state
                if (this.project.pendingRestart || doRefresh) {
                    this.project.pendingStateChange = true
                    this.refreshProject()
                } else {
                    this.project.pendingStateChange = false
                }
            }
        },
        async startProject () {
            const prevState = this.project.meta.state
            const res = await projectApi.startProject(this.project.id)
            // check for successful start command before polling state
            if (res) {
                console.warn('Project start failed.', res)
                alerts.emit('Project start failed.', 'warning')
            } else {
                this.project.pendingStatePrevious = prevState
                this.project.pendingStateChange = true
            }
        },
        async restartProject () {
            const prevState = this.project.meta.state
            const res = await projectApi.restartProject(this.project.id)
            // check for successful restart command before polling state
            if (res) {
                console.warn('Project restart failed.', res)
                alerts.emit('Project restart failed.', 'warning')
            } else {
                this.project.pendingStatePrevious = prevState
                this.project.pendingRestart = true
                this.project.pendingStateChange = true
            }
        },
        showConfirmDeleteInstanceDialog () {
            this.$refs.confirmInstanceDeleteDialog.show(this.project)
        },
        showConfirmDeleteApplicationDialog () {
            this.$refs.confirmApplicationDeleteDialog.show(this.project)
        },
        // TODO: Currently assumes 1:1 application to instance mapping
        deleteInstance () {
            this.loading.deleting = true
            instanceApi.deleteProject(this.project.id).then(async () => {
                await this.$store.dispatch('account/refreshTeam')
                this.$router.push({ name: 'Home' })
                alerts.emit('Instance successfully deleted.', 'confirmation')
            }).catch(err => {
                console.warn(err)
                alerts.emit('Instance failed to delete.', 'warning')
            }).finally(() => {
                this.loading.deleting = false
            })
        },
        deleteApplication () {
            this.loading.deleting = true
            projectApi.deleteProject(this.project.id).then(async () => {
                await this.$store.dispatch('account/refreshTeam')
                this.$router.push({ name: 'Home' })
                alerts.emit('Application successfully deleted.', 'confirmation')
            }).catch(err => {
                console.warn(err)
                alerts.emit('Application failed to delete.', 'warning')
            }).finally(() => {
                this.loading.deleting = false
            })
        },
        showConfirmSuspendDialog () {
            Dialog.show({
                header: 'Suspend Project',
                text: 'Are you sure you want to suspend this project?',
                confirmLabel: 'Suspend',
                kind: 'danger'
            }, () => {
                this.loading.suspend = true
                projectApi.suspendProject(this.project.id).then(() => {
                    this.$router.push({ name: 'Home' })
                    alerts.emit('Project successfully suspended.', 'confirmation')
                }).catch(err => {
                    console.warn(err)
                    alerts.emit('Project failed to suspend.', 'warning')
                }).finally(() => {
                    this.loading.suspend = false
                })
            })
        }
    }
}
</script>
