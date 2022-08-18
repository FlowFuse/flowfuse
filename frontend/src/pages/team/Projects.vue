<template>
    <SectionTopMenu hero="Projects">
        <template v-slot:tools>
            <ff-button kind="primary" size="small" to="./projects/create" data-nav="create-project"><template v-slot:icon-left><PlusSmIcon /></template>Create Project</ff-button>
        </template>
    </SectionTopMenu>
    <form class="space-y-6">
        <ff-loading v-if="loading" message="Loading Projects..." />
        <template v-else-if="projects.length > 0">
            <ff-data-table :columns="columns" :rows="projects" :show-search="true" search-placeholder="Search Projects..."
                           :rows-selectable="true" @row-selected="openProject"/>
        </template>
        <template v-else-if="createProjectEnabled && !loading">
            <div class="flex justify-center mb-4 p-8">
                <ff-button to="./projects/create">
                    <template v-slot:icon-right>
                        <PlusSmIcon />
                    </template>
                    Create Project
                </ff-button>
            </div>
        </template>
        <template v-else>
            <div class="flex text-gray-500 justify-center italic mb-4 p-8">
                You don't have any projects yet
            </div>
        </template>
    </form>
    <router-view></router-view>
</template>

<script>
import { markRaw } from 'vue'
import { Roles } from '@core/lib/roles'
import teamApi from '@/api/team'
import { PlusSmIcon } from '@heroicons/vue/outline'
import SectionTopMenu from '@/components/SectionTopMenu'

import ProjectStatusBadge from '@/pages/project/components/ProjectStatusBadge'

export default {
    name: 'TeamProjects',
    data () {
        return {
            loading: false,
            projects: [],
            columns: [
                { label: 'Name', class: ['flex-grow'], key: 'name', sortable: true },
                { label: 'Status', class: ['w-44'], key: 'status', sortable: true, component: { is: markRaw(ProjectStatusBadge) } },
                { label: 'Updated', class: ['w-44', 'text-xs'], key: 'updatedSince', sortable: true }
            ]
        }
    },
    watch: {
        team: 'fetchData'
    },
    mounted () {
        this.fetchData()
    },
    methods: {
        fetchData: async function (newVal) {
            this.loading = true
            if (this.team.id) {
                const data = await teamApi.getTeamProjects(this.team.id)
                this.projects = data.projects
            }
            this.loading = false
        },
        openProject (project) {
            this.$router.push({
                name: 'Project',
                params: {
                    id: project.id
                }
            })
        }
    },
    computed: {
        createProjectEnabled: function () {
            return this.teamMembership.role === Roles.Owner
        }
    },
    props: ['team', 'teamMembership'],
    components: {
        PlusSmIcon,
        SectionTopMenu
    }
}
</script>
