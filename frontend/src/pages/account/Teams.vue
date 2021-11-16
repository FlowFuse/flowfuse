<template>
    <template v-if="user.email_verified">
        <div class="text-right mb-4" v-if="user.email"><CreateTeamButton /></div>
        <TeamsTable :teams="teams" :teamCount="teamCount" />

        <UserInviteTable class="mt-8" />
    </template>
    <template v-else>
        Please verify your email address to access teams
    </template>

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
        ...mapState('account',['user','teams']),
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
