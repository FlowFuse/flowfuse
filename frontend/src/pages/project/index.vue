<template>
    <div class="forge-block">
        <div class="flex flex-col sm:flex-row mb-2">
            <div class="flex-grow space-x-6 items-center inline-flex">
                <router-link :to="navigation[0]?navigation[0].path:''" class="inline-flex items-center">
                    <div class="text-gray-800 text-xl font-bold">{{ project.name }}</div>
                </router-link>
                <ProjectStatusBadge :status="project.meta.state" v-if="project.meta" />
            </div>
            <div class="text-right space-x-4">
                <a :href="project.url" target="_blank" class="forge-button-secondary">
                    Editor <ExternalLinkIcon class="w-5 ml-1 py-1" />
                </a>
                <DropdownMenu buttonClass="forge-button" alt="Open actions menu" :options="options">Actions</DropdownMenu>
            </div>
        </div>
        <SectionTopMenu :options="navigation" />
        <div class="text-sm sm:px-6 mt-4 sm:mt-8">
            <router-view :project="project" @projectUpdated="updateProject"></router-view>
        </div>
    </div>
</template>

<script>
import projectApi from '@/api/project'
import Breadcrumbs from '@/mixins/Breadcrumbs';
import SectionTopMenu from '@/components/SectionTopMenu';
import DropdownMenu from '@/components/DropdownMenu'
import ProjectStatusBadge from './components/ProjectStatusBadge'
import { mapState } from 'vuex'

import { ExternalLinkIcon } from '@heroicons/vue/outline'

export default {
    name: 'Project',
    mixins: [Breadcrumbs],
    data: function() {
        return {
            project: {},
            navigation: []
        }
    },
    async created() {
        await this.updateProject();
    },
    computed: {
        ...mapState('account',['teamMembership']),
        options: function() {
            return [
                {name: "Start", action: async() => { await projectApi.startProject(this.project.id) } },
                {name: "Restart", action: async() => { await projectApi.restartProject(this.project.id) } },
                {name: "Stop", action: async() => { await projectApi.stopProject(this.project.id) } },
                null,
                {name: "Delete",class:['text-red-700'], action: () => {
                    this.$router.push({ path: `/project/${this.project.id}/settings/danger` })
                }}
            ]
        }
    },
    watch: {
        project: 'checkAccess',
        teamMembership: 'checkAccess'
    },
    mounted() {
        this.checkAccess()
    },
    methods: {
        async updateProject() {
            const parts = this.$route.path.split("/")
            try {
                const data = await projectApi.getProject(parts[2])
                this.project = data;
                this.$store.dispatch('account/setTeam',this.project.team.slug);
            } catch(err) {
                this.$router.push({
                    name: "PageNotFound",
                    params: { pathMatch: this.$router.currentRoute.value.path.substring(1).split('/') },
                    // preserve existing query and hash if any
                    query: this.$router.currentRoute.value.query,
                    hash: this.$router.currentRoute.value.hash,
                })
                return;
            }
            this.setBreadcrumbs([
                { type: 'TeamLink'},
                {label: this.project.name /*, to: { name: "Project", params: {id:this.project.id}} */}
            ])
        },
        checkAccess() {
            this.navigation = [
                { name: "Overview", path: `/project/${this.project.id}/overview` },
                { name: "Deploys", path: `/project/${this.project.id}/deploys` },
                { name: "Activity", path: `/project/${this.project.id}/activity` },
            ]
            if (this.teamMembership && this.teamMembership.role === "owner") {
                this.navigation.push({ name: "Settings", path: `/project/${this.project.id}/settings` })
                this.navigation.push({ name: "Debug", path: `/project/${this.project.id}/debug` })

            }
        }
    },
    components: {
        SectionTopMenu,
        ExternalLinkIcon,
        DropdownMenu,
        ProjectStatusBadge
    }
}
</script>
