<template>
    <ItemTable :items="teams" :columns="columns" />
</template>

<script>

import teamApi from '@/api/team'
import ItemTable from '@/components/ItemTable'

export default {
    name: 'AccountTeams',
    data() {
        return {
            teamCount: 0,
            teams: [],
            columns: [
                {name: 'Name', property: 'name', link: true},
                {name: 'Projects', property: 'projects'},
                {name: 'Role', property: 'role'}
            ]
        }
    },
    async created() {
        const data = await teamApi.getTeams()
        this.teamCount = data.count;
        this.teams = data.teams;
    },
    components: {
        ItemTable,
    }
}
</script>
