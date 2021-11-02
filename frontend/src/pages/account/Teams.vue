<template>
    <div class="text-right mb-4"><CreateTeamButton /></div>
    <TeamsTable :teams="teams" :teamCount="teamCount" />
</template>

<script>

import teamApi from '@/api/team'
import TeamsTable from './components/TeamsTable'
import CreateTeamButton from './components/CreateTeamButton'

export default {
    name: 'AccountTeams',

    data() {
        return {
            teams: [],
            teamCount: 0
        }
    },
    async created() {
        const data = await teamApi.getTeams()
        this.teamCount = data.count;
        this.teams = data.teams;
    },
    components: {
        TeamsTable,
        CreateTeamButton
    }
}
</script>
