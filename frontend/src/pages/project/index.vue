<template>
    <ff-loading v-if="loading.deleting" message="Deleting Project..." />
    <ff-loading v-if="loading.suspend" message="Suspending Project..." />
    <Teleport v-if="mounted" to="#platform-sidenav">
        <SideNavigationTeamOptions>
            <template v-slot:nested-menu>
                <div class="ff-nested-title">Project</div>
                <!-- <div class="ff-nested-title">{{ project.name }}</div> -->
                <router-link v-for="route in navigation" :key="route.label" :to="route.path">
                    <nav-item :icon="route.icon" :label="route.label" :data-nav="route.tag"></nav-item>
                </router-link>
            </template>
        </SideNavigationTeamOptions>
    </Teleport>
    <main>
        <ConfirmProjectDeleteDialog @confirm="deleteProject" ref="confirmProjectDeleteDialog"/>
        <SectionTopMenu>
            <template #hero>
                <div class="flex-grow space-x-6 items-center inline-flex">
                    <router-link :to="navigation[0]?navigation[0].path:''" class="inline-flex items-center">
                        <div class="text-gray-800 text-xl font-bold">{{project.name}}</div>
                    </router-link>
                    <ProjectStatusBadge :status="project.meta.state" :pendingStateChange="project.pendingStateChange" v-if="project.meta" />
                </div>
            </template>
            <template v-slot:tools>
                <div class="space-x-2 flex">
                    <a v-if="projectRunning && !isVisitingAdmin" :href="project.url" target="_blank" class="ff-btn ff-btn--secondary" data-action="open-editor">
                        Open Editor
                        <span class="ff-btn--icon ff-btn--icon-right">
                            <ExternalLinkIcon />
                        </span>
                    </a>
                    <DropdownMenu v-if="hasPermission('project:change-status')" buttonClass="ff-btn ff-btn--primary" alt="Open actions menu" :options="options" data-action="open-actions">Actions</DropdownMenu>
                </div>
            </template>
        </SectionTopMenu>
        <div class="text-sm mt-4 sm:mt-8">
            <Teleport v-if="mounted && isVisitingAdmin" to="#platform-banner">
                <div class="ff-banner" data-el="banner-project-as-admin">You are viewing this project as an Administrator</div>
            </Teleport>
            <router-view :project="project" :isVisitingAdmin="isVisitingAdmin" @projectUpdated="updateProject"></router-view>
        </div>
    </main>
</template>

<script>
import projectApi from '@/api/project'

import NavItem from '@/components/NavItem'
// import SideNavigation from '@/components/SideNavigation'
// import SideTeamSelection from '@/components/SideTeamSelection'
import SideNavigationTeamOptions from '@/components/SideNavigationTeamOptions.vue'
import DropdownMenu from '@/components/DropdownMenu'
import ProjectStatusBadge from './components/ProjectStatusBadge'
import SectionTopMenu from '@/components/SectionTopMenu'

import { mapState } from 'vuex'
import { Roles } from '@core/lib/roles'
import permissionsMixin from '@/mixins/Permissions'

import { ExternalLinkIcon } from '@heroicons/vue/outline'
import ProjectsIcon from '@/components/icons/Projects'
import { ChevronLeftIcon, CogIcon, ClockIcon, CloudIcon, TerminalIcon, ViewListIcon } from '@heroicons/vue/solid'
import ConfirmProjectDeleteDialog from './Settings/dialogs/ConfirmProjectDeleteDialog'
import Dialog from '@/services/dialog'
import alerts from '@/services/alerts'

const projectTransitionStates = [
    'installing',
    'starting',
    'stopping',
    'restarting',
    'suspending'
]

export default {
    name: 'ProjectPage',
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
    mixins: [permissionsMixin],
    async created () {
        await this.updateProject()
    },
    computed: {
        ...mapState('account', ['teamMembership', 'team']),
        isVisitingAdmin: function () {
            return this.teamMembership.role === Roles.Admin
        },
        isLoading: function () {
            return this.loading.deleting || this.loading.suspend
        },
        options: function () {
            const flowActionsDisabled = !(this.project.meta && this.project.meta.state !== 'suspended')

            const result = [
                {
                    name: 'Start',
                    action: async () => {
                        this.project.pendingStateChange = true
                        await projectApi.startProject(this.project.id)
                    },
                    disabled: this.project.pendingStateChange || this.projectRunning
                },
                { name: 'Restart', action: async () => { this.project.pendingRestart = true; this.project.pendingStateChange = true; await projectApi.restartProject(this.project.id) }, disabled: flowActionsDisabled },
                { name: 'Suspend', class: ['text-red-700'], action: () => { this.showConfirmSuspendDialog() }, disabled: flowActionsDisabled }
            ]
            if (this.hasPermission('project:delete')) {
                result.push(null)
                result.push({ name: 'Delete', class: ['text-red-700'], action: () => { this.showConfirmDeleteDialog() } })
            }
            return result
        },
        projectRunning () {
            return this.project.meta?.state === 'running'
        }
    },
    watch: {
        project: 'checkAccess',
        teamMembership: 'checkAccess',
        'project.pendingStateChange': 'refreshProject'
    },
    mounted () {
        this.checkAccess()
        this.mounted = true
    },
    beforeUnmount () {
        clearTimeout(this.checkInterval)
    },
    methods: {
        async updateProject () {
            const projectId = this.$route.params.id
            try {
                const data = await projectApi.getProject(projectId)
                this.project = Object.assign(data, { deviceSettings: {} })
                this.$store.dispatch('account/setTeam', this.project.team.slug)
                this.project.deviceSettings = await projectApi.getProjectDeviceSettings(projectId)
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
                    if (this.project.id) {
                        const data = await projectApi.getProject(this.project.id)
                        const wasPendingRestart = this.project.pendingRestart
                        this.project = data
                        if (wasPendingRestart && this.project.meta.state !== 'running') {
                            this.project.pendingRestart = true
                        }
                    }
                }, 1000)
            }
        },
        checkAccess () {
            this.navigation = [
                { label: 'Overview', path: `/project/${this.project.id}/overview`, tag: 'project-overview', icon: ProjectsIcon },
                { label: 'Activity', path: `/project/${this.project.id}/activity`, tag: 'project-activity', icon: ViewListIcon },
                { label: 'Deployments', path: `/project/${this.project.id}/devices`, tag: 'project-deployments', icon: CloudIcon },
                { label: 'Snapshots', path: `/project/${this.project.id}/snapshots`, tag: 'project-snapshots', icon: ClockIcon },
                { label: 'Logs', path: `/project/${this.project.id}/logs`, tag: 'project-logs', icon: TerminalIcon },
                { label: 'Settings', path: `/project/${this.project.id}/settings`, tag: 'project-settings', icon: CogIcon }
            ]

            if (this.project.meta && (this.project.pendingRestart || projectTransitionStates.includes(this.project.meta.state))) {
                this.project.pendingStateChange = true
                this.refreshProject()
            }
        },
        showConfirmDeleteDialog () {
            this.$refs.confirmProjectDeleteDialog.show(this.project)
        },
        deleteProject () {
            this.loading.deleting = true
            projectApi.deleteProject(this.project.id).then(() => {
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
    },
    components: {
        NavItem,
        ExternalLinkIcon,
        DropdownMenu,
        ProjectStatusBadge,
        SideNavigationTeamOptions,
        SectionTopMenu,
        ConfirmProjectDeleteDialog
    }
}
</script>
