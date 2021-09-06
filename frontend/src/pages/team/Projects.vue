<template>
    <form class="space-y-6">
        <FormHeading>Team Projects</FormHeading>
        <ItemTable :items="projects" :columns="columns" />
    </form>
</template>

<script>
import { mapState } from 'vuex'
import teamApi from '@/api/team'

import FormHeading from '@/components/FormHeading'
import ItemTable from '@/components/tables/ItemTable'
import Breadcrumbs from '@/mixins/Breadcrumbs';

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
        FormHeading
    }
}
</script>
