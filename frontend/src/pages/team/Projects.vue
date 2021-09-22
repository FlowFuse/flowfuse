<template>
    <form class="space-y-6">
        <FormHeading>Team Projects</FormHeading>
        <template v-if="projectCount > 0">
            <ItemTable :items="projects" :columns="columns" />
        </template>
        <template v-else>
            <div class="max-w-2xl mx-auto flex justify-center border rounded border-gray-300 overflow-hidden mb-4 p-8">
                <CreateProjectButton :url="'/team/'+team.slug+'/projects/create'" class="w-auto flex-grow-0"/>
            </div>
        </template>

    </form>
</template>

<script>
import { mapState } from 'vuex'
import teamApi from '@/api/team'

import FormHeading from '@/components/FormHeading'
import ItemTable from '@/components/tables/ItemTable'
import Breadcrumbs from '@/mixins/Breadcrumbs';
import CreateProjectButton from "@/components/CreateProjectButton"

export default {
    name: 'TeamProjects',
    mixins: [Breadcrumbs],
    data() {
        return {
            projectCount: 0,
            projects: [],
            columns: [
                {name: 'Name', property: 'name', link: 'link'},
                {name: 'Updated', property: 'updatedSince'},
                {name: 'Team', property: 'teamName', link: 'teamLink'},
                {name: 'Editor', value:"Open Editor...", external: true, link: 'url'}
            ]
        }
    },
    created() {
        this.replaceLastBreadcrumb({ label:"Projects" })
    },
    watch: {
         team: 'fetchData'
    },
    mounted() {
        this.fetchData()
    },
    methods: {
        fetchData: async function(newVal,oldVal) {
            if (this.team.name) {
                const data = await teamApi.getTeamProjects(this.team.name)
                this.projectCount = data.count;
                this.projects = data.projects;
            }
        }
    },
    props:[ "team" ],
    components: {
        ItemTable,
        FormHeading,
        CreateProjectButton
    }
}
</script>
