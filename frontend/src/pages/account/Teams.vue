<template>
    <TeamsTable :teams="teams" :teamCount="teamCount"  />
</template>

<script>

import teamApi from '@/api/team'
import TeamsTable from '@/components/tables/TeamsTable'
import Breadcrumbs from '@/mixins/Breadcrumbs';

export default {
    name: 'AccountTeams',
    mixins: [Breadcrumbs],
    data() {
        return {
            teams: [],
            teamCount: 0
        }
    },
    async created() {
        this.replaceLastBreadcrumb({ label:"Teams" })
        const data = await teamApi.getTeams()
        this.teamCount = data.count;
        this.teams = data.teams;
    },
    components: {
        TeamsTable,
    }
}
</script>
