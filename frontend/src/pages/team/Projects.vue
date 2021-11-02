<template>
    <form class="space-y-6">
        <template v-if="projectCount > 0">
            <ItemTable :items="projects" :columns="columns" />
        </template>
        <template v-else>
            <div class="flex justify-center mb-4 p-8">
                <CreateProjectButton :url="'/team/'+team.slug+'/projects/create'" class="w-auto flex-grow-0"/>
            </div>
        </template>

    </form>
</template>

<script>
import { markRaw } from "vue"
import { mapState } from 'vuex'
import teamApi from '@/api/team'
import FormHeading from '@/components/FormHeading'
import ItemTable from '@/components/tables/ItemTable'
import CreateProjectButton from "@/components/CreateProjectButton"
import { ExternalLinkIcon } from '@heroicons/vue/outline'

import ProjectStatusBadge from "@/pages/project/components/ProjectStatusBadge"

const OpenEditorLink = {
    template: `<ExternalLinkIcon class="w-4 h-4"/>`,
    components: { ExternalLinkIcon }
}

export default {
    name: 'TeamProjects',
    data() {
        return {
            projectCount: 0,
            projects: [],
            columns: [
                {name: 'Name',   class:['flex-grow'],property: 'name', link: 'link', class:"flex-grow"},
                {name: 'Status', class:['w-44'], component: {is: markRaw(ProjectStatusBadge)}},
                {name: 'Updated',class:['w-44','text-xs'],property: 'updatedSince'},
                {name: '', class: ['w-14'], linkClass:['forge-button-inline', 'px-2', 'py-2'], component: {is: markRaw(OpenEditorLink)}, external: true, link: 'url'}
            ]
        }
    },
    watch: {
         team: 'fetchData'
    },
    mounted() {
        this.fetchData()
    },
    methods: {
        fetchData: async function(newVal) {
            if (this.team.id) {
                const data = await teamApi.getTeamProjects(this.team.id)
                this.projectCount = data.count;
                this.projects = data.projects;
            }
        }
    },
    props:[ "team" ],
    components: {
        ItemTable,
        FormHeading,
        CreateProjectButton,
        ExternalLinkIcon,
        ProjectStatusBadge
    }
}
</script>
