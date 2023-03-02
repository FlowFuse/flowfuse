<template>
    <ff-loading v-if="loading.deleting" message="Deleting Project..." />
    <ff-loading v-if="loading.suspend" message="Suspending Project..." />
    <Teleport v-if="mounted" to="#platform-sidenav">
        <SideNavigationTeamOptions>
            <template #nested-menu>
                <div class="ff-nested-title">{{ project.name }}</div>
                <router-link v-for="route in navigation" :key="route.label" :to="route.path">
                    <nav-item :icon="route.icon" :label="route.label" :data-nav="route.tag" />
                </router-link>
            </template>
        </SideNavigationTeamOptions>
    </Teleport>
    <main v-if="!project?.id">
        <ff-loading message="Loading Instance..." />
    </main>
    <main v-else>
        <SectionTopMenu>
            <template #hero>
                <div class="flex-grow space-x-6 items-center inline-flex">
                    <router-link
                        :to="navigation[0]?.path ?? ''"
                        class="inline-flex items-center"
                    >
                        <div class="text-gray-800 text-xl font-bold">
                            {{ project.name }}
                        </div>
                    </router-link>
                    <ProjectStatusBadge v-if="project.meta" :status="project.meta.state" :pendingStateChange="project.pendingStateChange" />
                </div>
            </template>
            <template #tools>
                <div class="space-x-2 flex">
                    <div v-if="editorAvailable">
                        <a v-if="!isVisitingAdmin" :href="project.url" target="_blank" class="ff-btn ff-btn--secondary" data-action="open-editor">
                            Open Editor
                            <span class="ff-btn--icon ff-btn--icon-right">
                                <ExternalLinkIcon />
                            </span>
                        </a>
                        <button v-else title="Unable to open editor when visiting as an admin" class="ff-btn ff-btn--secondary" disabled>
                            Open Editor
                            <span class="ff-btn--icon ff-btn--icon-right">
                                <ExternalLinkIcon />
                            </span>
                        </button>
                    </div>
                    <DropdownMenu v-if="hasPermission('project:change-status')" buttonClass="ff-btn ff-btn--primary" alt="Open actions menu" :options="actionsDropdownOptions" data-action="open-actions">Actions</DropdownMenu>
                </div>
            </template>
        </SectionTopMenu>
        <ConfirmProjectDeleteDialog ref="confirmProjectDeleteDialog" @confirm="deleteInstance" />
        <Teleport v-if="mounted" to="#platform-banner">
            <div v-if="isVisitingAdmin" class="ff-banner" data-el="banner-project-as-admin">You are viewing this instance as an Administrator</div>
            <SubscriptionExpiredBanner :team="team" />
            <TeamTrialBanner v-if="team.billing?.trial" :team="team" />
        </Teleport>
        <router-view
            :project="project"
            :is-visiting-admin="isVisitingAdmin"
            @instance-overview-exit="onOverviewExit"
            @instance-overview-enter="onOverviewEnter"
            @instance-updated="updateInstance"
        />
    </main>
</template>

<script>
import { Roles } from '@core/lib/roles'
import { ExternalLinkIcon } from '@heroicons/vue/outline'
import { ChevronLeftIcon, ClockIcon, CogIcon, TemplateIcon, TerminalIcon, ViewListIcon } from '@heroicons/vue/solid'
import { mapState } from 'vuex'

import ConfirmProjectDeleteDialog from './Settings/dialogs/ConfirmProjectDeleteDialog'

import ProjectStatusBadge from './components/ProjectStatusBadge'

import InstanceApi from '@/api/instances'
import snapshotApi from '@/api/projectSnapshots'

import DropdownMenu from '@/components/DropdownMenu'
import Loading from '@/components/Loading'
import NavItem from '@/components/NavItem'
import SectionTopMenu from '@/components/SectionTopMenu'
import SideNavigationTeamOptions from '@/components/SideNavigationTeamOptions.vue'
import SubscriptionExpiredBanner from '@/components/banners/SubscriptionExpired.vue'
import TeamTrialBanner from '@/components/banners/TeamTrial.vue'

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
        ConfirmProjectDeleteDialog,
        DropdownMenu,
        ExternalLinkIcon,
        Loading,
        NavItem,
        ProjectStatusBadge,
        SectionTopMenu,
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
        },
        projectRunning () {
            return this.project?.meta?.state === 'running'
        },
        editorAvailable () {
            return this.projectRunning
        },
        actionsDropdownOptions: function () {
            const flowActionsDisabled = !(this.project.meta && this.project.meta.state !== 'suspended')

            const result = [
                {
                    name: 'Start',
                    action: this.startInstance,
                    disabled: this.project.pendingStateChange || this.projectRunning
                },
                { name: 'Restart', action: this.restartInstance, disabled: flowActionsDisabled },
                { name: 'Suspend', class: ['text-red-700'], action: this.showConfirmSuspendDialog, disabled: flowActionsDisabled }
            ]

            if (this.hasPermission('project:delete')) {
                result.push(null)
                result.push({ name: 'Delete', class: ['text-red-700'], action: this.showConfirmDeleteDialog })
            }

            return result
        }
    },
    watch: {
        project: 'checkAccess',
        teamMembership: 'checkAccess',
        'project.pendingStateChange': 'refreshProject'
    },
    async created () {
        console.log()
        await this.updateInstance()
    },
    mounted () {
        this.checkAccess()
        this.mounted = true
    },
    beforeUnmount () {
        this.onOverviewExit(true)
    },
    methods: {
        async onOverviewEnter () {
            await this.updateInstance()
            this.overviewActive = true
            if (this.project.pendingRestart && !this.projectTransitionStates.includes(this.project.state)) {
                this.project.pendingRestart = false
            }
            this.checkAccess()
        },
        onOverviewExit (unmounting) {
            this.overviewActive = false
            if (unmounting) {
                // ensure timer and flags are cleared when navigating away from page
                if (this.project?.pendingStateChange || this.project?.pendingRestart) {
                    this.project.pendingStateChange = false
                    this.project.pendingRestart = false
                }
                clearTimeout(this.checkInterval)
            }
        },
        async updateInstance () {
            const projectId = this.$route.params.id
            try {
                const data = await InstanceApi.getInstance(projectId)
                this.project = { ...{ deviceSettings: {} }, ...this.project, ...data }
                this.$store.dispatch('account/setTeam', this.project.team.slug)
                this.project.deviceSettings = await InstanceApi.getInstanceDeviceSettings(projectId)
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
            if (!this.overviewActive) {
                return // dont refresh if not on overview page
            }
            if (this.project.pendingStateChange) {
                clearTimeout(this.checkInterval)
                this.checkInterval = setTimeout(async () => {
                    if (this.project.id) {
                        const data = await InstanceApi.getInstance(this.project.id)
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
                }, 1000)
            }
        },
        checkAccess () {
            this.navigation = [
                { label: 'Overview', path: `/instance/${this.project.id}/overview`, tag: 'project-overview', icon: TemplateIcon },
                { label: 'Snapshots', path: `/instance/${this.project.id}/snapshots`, tag: 'project-snapshots', icon: ClockIcon },
                { label: 'Audit Log', path: `/instance/${this.project.id}/audit-log`, tag: 'project-activity', icon: ViewListIcon },
                { label: 'Node-RED Logs', path: `/instance/${this.project.id}/logs`, tag: 'project-logs', icon: TerminalIcon },
                { label: 'Settings', path: `/instance/${this.project.id}/settings`, tag: 'project-settings', icon: CogIcon }
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
        async startInstance () {
            const prevState = this.project.meta.state
            const res = await InstanceApi.startInstance(this.project.id)
            // check for successful start command before polling state
            if (res) {
                console.warn('Project start failed.', res)
                alerts.emit('Project start failed.', 'warning')
            } else {
                this.project.pendingStatePrevious = prevState
                this.project.pendingStateChange = true
            }
        },
        async restartInstance () {
            const prevState = this.project.meta.state
            const res = await InstanceApi.restartInstance(this.project.id)
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
        showConfirmDeleteDialog () {
            this.$refs.confirmProjectDeleteDialog.show(this.project)
        },
        deleteInstance () {
            this.loading.deleting = true
            InstanceApi.deleteInstance(this.project.id).then(async () => {
                await this.$store.dispatch('account/refreshTeam')
                this.$router.push({ name: 'Home' })
                alerts.emit('Project successfully deleted.', 'confirmation')
            }).catch(err => {
                console.warn(err)
                alerts.emit('Project failed to delete.', 'warning')
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
                InstanceApi.suspendInstance(this.project.id).then(() => {
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
