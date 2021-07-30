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
import ItemTable from '@/components/ItemTable'

export default {
    name: 'TeamProjects',
    data() {
        return {
            projects: [],
            columns: [
                {name: 'Name', property: 'name'}
                //...
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
        fetchData: async function(newVal,oldVal) {
            if (this.team.name) {
                this.projects = await teamApi.getTeamProjects(this.team.name)
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
