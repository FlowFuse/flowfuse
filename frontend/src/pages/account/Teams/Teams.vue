<template>
    <div class="text-right mb-4" v-if="settings['team:create']"><CreateTeamButton /></div>
    <TeamsTable :teams="teams" :teamCount="teamCount" />
</template>

<script>

import { mapState } from 'vuex'
import teamApi from '@/api/team'

import TeamsTable from '../components/TeamsTable'
import CreateTeamButton from '../components/CreateTeamButton'

export default {
    name: 'AccountTeams',
    computed: {
        ...mapState('account',['teams','settings']),
        teamCount() {
            return this.teams?this.teams.length:0
        }
    },
    components: {

        TeamsTable,
        CreateTeamButton,
    }
}
</script>
