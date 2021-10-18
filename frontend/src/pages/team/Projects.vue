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
import { mapState } from 'vuex'
import teamApi from '@/api/team'
import FormHeading from '@/components/FormHeading'
import ItemTable from '@/components/tables/ItemTable'
import CreateProjectButton from "@/components/CreateProjectButton"

export default {
    name: 'TeamProjects',
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
        CreateProjectButton
    }
}
</script>
