<template>
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
                    <a v-if="editorAvailable" :href="project.url" target="_blank" class="ff-btn ff-btn--secondary" data-action="open-editor">
                        Open Editor
                        <span class="ff-btn--icon ff-btn--icon-right">
                            <ExternalLinkIcon />
                        </span>
                    </a>
                    <DropdownMenu v-if="isOwner" buttonClass="ff-btn ff-btn--primary" alt="Open actions menu" :options="options" data-action="open-actions">Actions</DropdownMenu>
                </div>
            </template>
        </SectionTopMenu>
        <div class="text-sm mt-4 sm:mt-8">
            <Teleport v-if="mounted && isVisitingAdmin" to="#platform-banner">
                <div class="ff-banner">You are viewing this project as an Administrator</div>
            </Teleport>
            <router-view :project="project" @projectUpdated="updateProject"></router-view>
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

import { ExternalLinkIcon } from '@heroicons/vue/outline'
import ProjectsIcon from '@/components/icons/Projects'
import { ChevronLeftIcon, CogIcon, ClockIcon, ChipIcon, TerminalIcon, ViewListIcon } from '@heroicons/vue/solid'

const projectTransitionStates = [
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
            checkInterval: null
        }
    },
    async created () {
        await this.updateProject()
    },
    computed: {
        ...mapState('account', ['teamMembership', 'team', 'features']),
        isOwner: function () {
            return this.teamMembership.role === Roles.Owner
        },
        isVisitingAdmin: function () {
            return this.teamMembership.role === Roles.Admin
        },
        options: function () {
            const flowActionsDisabled = !(this.project.meta && this.project.meta.state !== 'suspended')

            return [
                { name: 'Start', action: async () => { this.project.pendingStateChange = true; await projectApi.startProject(this.project.id) } },
                { name: 'Restart', action: async () => { this.project.pendingRestart = true; this.project.pendingStateChange = true; await projectApi.restartProject(this.project.id) }, disabled: flowActionsDisabled },
                { name: 'Suspend', class: ['text-red-700'], action: () => { this.$router.push({ path: `/project/${this.project.id}/settings/danger` }) }, disabled: flowActionsDisabled },
                null,
                {
                    name: 'Delete',
                    class: ['text-red-700'],
                    action: () => {
                        this.$router.push({ path: `/project/${this.project.id}/settings/danger` })
                    }
                }
            ]
        },
        editorAvailable: function () {
            return this.project.meta && this.project.meta.state === 'running'
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
                if (this.features.devices) {
                    data.deviceSettings = {}
                }
                this.project = data
                this.$store.dispatch('account/setTeam', this.project.team.slug)
                if (this.features.devices) {
                    this.project.deviceSettings = await projectApi.getProjectDeviceSettings(projectId)
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
                { label: 'Snapshots', path: `/project/${this.project.id}/snapshots`, tag: 'project-snapshots', icon: ClockIcon },
                { label: 'Logs', path: `/project/${this.project.id}/logs`, tag: 'project-logs', icon: TerminalIcon },
                { label: 'Settings', path: `/project/${this.project.id}/settings`, tag: 'project-settings', icon: CogIcon }
            ]
            if (this.features.devices) {
                this.navigation.splice(3, 0, { label: 'Devices', path: `/project/${this.project.id}/devices`, tag: 'project-devices', icon: ChipIcon })
            }

            if (this.project.meta && (this.project.pendingRestart || projectTransitionStates.includes(this.project.meta.state))) {
                this.project.pendingStateChange = true
                this.refreshProject()
            }
        }
    },
    components: {
        NavItem,
        ExternalLinkIcon,
        DropdownMenu,
        ProjectStatusBadge,
        SideNavigationTeamOptions,
        SectionTopMenu
    }
}
</script>
