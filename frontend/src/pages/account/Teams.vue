<template>
    <div class="text-right mb-4"><CreateTeamButton /></div>
    <TeamsTable :teams="teams" :teamCount="teamCount" />

    <UserInviteTable class="mt-8" />

</template>

<script>

import { mapState } from 'vuex'
import teamApi from '@/api/team'

import TeamsTable from './components/TeamsTable'
import CreateTeamButton from './components/CreateTeamButton'
import UserInviteTable from './components/UserInviteTable'

export default {
    name: 'AccountTeams',
    computed: {
        ...mapState('account',['teams']),
        teamCount() {
            return this.teams?this.teams.length:0
        }
    },
    components: {

        TeamsTable,
        CreateTeamButton,
        UserInviteTable,
    }
}
</script>
