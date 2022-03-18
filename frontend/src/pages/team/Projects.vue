<template>
    <form class="space-y-6">
        <template v-if="projectCount > 0">
            <ItemTable :items="projects" :columns="columns" />
        </template>
        <template v-else-if="createProjectEnabled">
            <div class="flex justify-center mb-4 p-8">
                <CreateProjectButton :url="'/team/'+team.slug+'/projects/create'" class="w-auto flex-grow-0"/>
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
import CreateProjectButton from '@/components/CreateProjectButton'
import { ExternalLinkIcon } from '@heroicons/vue/outline'

import ProjectStatusBadge from '@/pages/project/components/ProjectStatusBadge'

const OpenEditorLink = {
    template: '<ExternalLinkIcon class="w-4 h-4"/>',
    components: { ExternalLinkIcon }
}

export default {
    name: 'TeamProjects',
    data () {
        return {
            projectCount: 0,
            projects: [],
            columns: [
                { name: 'Name', class: ['flex-grow'], property: 'name', link: 'link' },
                { name: 'Status', class: ['w-44'], component: { is: markRaw(ProjectStatusBadge) } },
                { name: 'Updated', class: ['w-44', 'text-xs'], property: 'updatedSince' },
                { name: '', class: ['w-14'], linkClass: ['forge-button-inline', 'px-2', 'py-2'], component: { is: markRaw(OpenEditorLink) }, external: true, link: 'url' }
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
            if (this.team.id) {
                const data = await teamApi.getTeamProjects(this.team.id)
                this.projectCount = data.count
                this.projects = data.projects
            }
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
        CreateProjectButton
    }
}
</script>
