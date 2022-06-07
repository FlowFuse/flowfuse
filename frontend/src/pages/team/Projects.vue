<template>
    <SectionTopMenu hero="Projects">
        <template v-slot:tools>
            <ff-button kind="primary" size="small" to="./projects/create"><template v-slot:icon-left><PlusSmIcon /></template>Create Project</ff-button>
        </template>
    </SectionTopMenu>
    <form class="space-y-6">
        <ff-loading v-if="loading" message="Loading Projects..." />
        <template v-else-if="projects.length > 0">
            <ItemTable :items="projects" :columns="columns" />
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
</template>

<script>
import { markRaw } from 'vue'
import { Roles } from '@core/lib/roles'
import teamApi from '@/api/team'
import ItemTable from '@/components/tables/ItemTable'
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
                { name: 'Name', class: ['flex-grow'], property: 'name', link: 'link' },
                { name: 'Status', class: ['w-44'], component: { is: markRaw(ProjectStatusBadge) } },
                { name: 'Updated', class: ['w-44', 'text-xs'], property: 'updatedSince' }
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
        }
    },
    computed: {
        createProjectEnabled: function () {
            return this.teamMembership.role === Roles.Owner
        }
    },
    props: ['team', 'teamMembership'],
    components: {
        ItemTable,
        PlusSmIcon,
        SectionTopMenu
    }
}
</script>
