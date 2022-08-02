<template>
    <div class="text-right mb-4" v-if="settings['team:create']"><CreateTeamButton /></div>
    <ff-data-table :columns="columns" :rows="teams" :rows-selectable="true" @row-selected="teamSelected"></ff-data-table>
</template>

<script>

import { mapState } from 'vuex'

import TeamCell from '@/components/tables/cells/TeamCell'
import CreateTeamButton from '../components/CreateTeamButton'

import { markRaw } from 'vue'

export default {
    name: 'AccountTeams',
    computed: {
        ...mapState('account', ['teams', 'settings']),
        teamCount () {
            return this.teams ? this.teams.length : 0
        }
    },
    components: {
        CreateTeamButton
    },
    data () {
        return {
            columns: [
                { label: 'Name', key: 'name', class: ['flex-grow'], component: { is: markRaw(TeamCell) } },
                { label: 'Projects', key: 'projectCount', class: ['w-32', 'text-center'] },
                { label: 'Members', key: 'memberCount', class: ['w-32', 'text-center'] },
                { label: 'Role', key: 'roleName', class: ['w-40'] }
            ]
        }
    },
    methods: {
        teamSelected (team) {
            this.$router.push({ name: 'Team', params: { team_slug: team.slug } })
        }
    }
}
</script>
