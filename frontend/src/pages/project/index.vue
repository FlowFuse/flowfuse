<template>
    <ff-loading v-if="loading.deleting" message="Deleting Project..." />
    <ff-loading v-if="loading.suspend" message="Suspending Project..." />
    <Teleport v-if="mounted" to="#platform-sidenav">
        <SideNavigationTeamOptions>
            <template v-slot:nested-menu>
                <div class="ff-nested-title">{{ project.name }}</div>
                <router-link v-for="route in navigation" :key="route.label" :to="route.path">
                    <nav-item :icon="route.icon" :label="route.label" :data-nav="route.tag"></nav-item>
                </router-link>
            </template>
        </SideNavigationTeamOptions>
    </Teleport>
    <main>
        <ConfirmProjectDeleteDialog @confirm="deleteProject" ref="confirmProjectDeleteDialog"/>
        <Teleport v-if="mounted && isVisitingAdmin" to="#platform-banner">
            <div class="ff-banner" data-el="banner-project-as-admin">You are viewing this project as an Administrator</div>
        </Teleport>
        <router-view
            :project="project"
            :is-visiting-admin="isVisitingAdmin"
            @projectUpdated="updateProject"
            @project-start="startProject"
            @project-restart="restartProject"
            @project-suspend="showConfirmSuspendDialog"
            @project-delete="showConfirmDeleteDialog"
        />
    </main>
</template>

<script>
import { Roles } from '@core/lib/roles'
import { ChevronLeftIcon, ClockIcon, CloudIcon, CogIcon, TerminalIcon, ViewListIcon } from '@heroicons/vue/solid'
import { mapState } from 'vuex'

import ConfirmProjectDeleteDialog from './Settings/dialogs/ConfirmProjectDeleteDialog'

import projectApi from '@/api/project'
import snapshotApi from '@/api/projectSnapshots'

import NavItem from '@/components/NavItem'
// import SideNavigation from '@/components/SideNavigation'
// import SideTeamSelection from '@/components/SideTeamSelection'
import SideNavigationTeamOptions from '@/components/SideNavigationTeamOptions.vue'

import ProjectsIcon from '@/components/icons/Projects'
import permissionsMixin from '@/mixins/Permissions'

import alerts from '@/services/alerts'
import Dialog from '@/services/dialog'

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
        async startProject () {
            this.project.pendingStateChange = true
            await projectApi.startProject(this.project.id)
        },
        async restartProject () {
            this.project.pendingRestart = true
            this.project.pendingStateChange = true
            await projectApi.restartProject(this.project.id)
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
        SideNavigationTeamOptions,
        ConfirmProjectDeleteDialog
    }
}
</script>
