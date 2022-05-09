<template>
    <Teleport v-if="mounted" to="#platform-sidenav">
        <SideNavigation>
            <template v-slot:options>
                <li class="ff-navigation-divider">{{ project.name }}</li>
                <router-link v-for="route in navigation" :key="route.label" :to="route.path">
                    <nav-item :icon="route.icon" :label="route.name"></nav-item>
                </router-link>
            </template>
            <template v-slot:back>
                <ff-team-selection></ff-team-selection>
            </template>
        </SideNavigation>
    </Teleport>
    <main>
        <div class="flex flex-col sm:flex-row mb-2">
            <div class="flex-grow space-x-6 items-center inline-flex">
                <router-link :to="navigation[0]?navigation[0].path:''" class="inline-flex items-center">
                    <div class="text-gray-800 text-xl font-bold">{{ project.name }}</div>
                </router-link>
                <ProjectStatusBadge :status="project.meta.state" :pendingStateChange="project.pendingStateChange" v-if="project.meta" />
            </div>
            <div class="text-right space-x-4">
                <a v-if="editorAvailable" :href="project.url" target="_blank" class="forge-button-secondary">
                    Editor <ExternalLinkIcon class="w-5 ml-1 py-1" />
                </a>
                <DropdownMenu buttonClass="forge-button" alt="Open actions menu" :options="options">Actions</DropdownMenu>
            </div>
        </div>
        <hr />
        <div class="text-sm sm:px-6 mt-4 sm:mt-8">
            <router-view :project="project" @projectUpdated="updateProject"></router-view>
        </div>
    </main>
</template>

<script>
import projectApi from '@/api/project'

import NavItem from '@/components/NavItem'
import SideNavigation from '@/components/SideNavigation'
import SideTeamSelection from '@/components/SideTeamSelection'
import DropdownMenu from '@/components/DropdownMenu'
import ProjectStatusBadge from './components/ProjectStatusBadge'

import { mapState } from 'vuex'
import { Roles } from '@core/lib/roles'

import { ExternalLinkIcon } from '@heroicons/vue/outline'
import { ChevronLeftIcon, TemplateIcon, CogIcon, ChipIcon, TerminalIcon, ViewListIcon } from '@heroicons/vue/solid'

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
        options: function () {
            const flowActionsDisabled = !(this.project.meta && this.project.meta.state !== 'suspended')

            return [
                { name: 'Start', action: async () => { this.project.pendingStateChange = true; await projectApi.startProject(this.project.id) } },
                { name: 'Restart', action: async () => { this.project.pendingRestart = true; this.project.pendingStateChange = true; await projectApi.restartProject(this.project.id) }, disabled: flowActionsDisabled },
                { name: 'Stop', action: async () => { this.project.pendingStateChange = true; await projectApi.stopProject(this.project.id) }, disabled: flowActionsDisabled },
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
            const parts = this.$route.path.split('/')
            try {
                const data = await projectApi.getProject(parts[2])
                this.project = data
                this.$store.dispatch('account/setTeam', this.project.team.slug)
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
                { name: 'Overview', path: `/project/${this.project.id}/overview`, icon: TemplateIcon },
                { name: 'Activity', path: `/project/${this.project.id}/activity`, icon: ViewListIcon },
                { name: 'Logs', path: `/project/${this.project.id}/logs`, icon: TerminalIcon }
            ]
            if (this.features.devices) {
                this.navigation.splice(1, 0, { name: 'Devices', path: `/project/${this.project.id}/devices`, icon: ChipIcon })
            }
            if (this.teamMembership && this.teamMembership.role === Roles.Owner) {
                this.navigation.push({ name: 'Settings', path: `/project/${this.project.id}/settings`, icon: CogIcon })
                // this.navigation.push({ name: "Debug", path: `/project/${this.project.id}/debug` })
            }
            if (this.project.meta && (this.project.pendingRestart || projectTransitionStates.includes(this.project.meta.state))) {
                this.project.pendingStateChange = true
                this.refreshProject()
            }
        }
    },
    components: {
        NavItem,
        SideNavigation,
        ExternalLinkIcon,
        DropdownMenu,
        ProjectStatusBadge,
        'ff-team-selection': SideTeamSelection
    }
}
</script>
