<template>
    <div class="text-right mb-4" v-if="settings['team:create']"><CreateTeamButton /></div>
    <ff-data-table :columns="columns" :rows="teams">
        <template v-slot:context-menu="{row}">
            <ff-list-item data-action="member-remove-from-team" label="Leave Team" kind="danger" @click="removeUserDialog(row)" />
        </template>
    </ff-data-table>

</template>

<script>

import { mapState } from 'vuex'

import teamApi from '@/api/team'

import TeamCell from '@/components/tables/cells/TeamCell'
import CreateTeamButton from '../components/CreateTeamButton'
import alerts from '@/services/alerts'
import Dialog from '@/services/dialog'

import { markRaw } from 'vue'

export default {
    name: 'AccountTeams',
    computed: {
        ...mapState('account', ['user', 'teams', 'settings']),
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
        },
        removeUserDialog (row) {
            if (row.memberCount === 1) {
                Dialog.show({
                    header: 'Leave Team',
                    kind: 'primary',
                    text: 'You cannot leave a team you are the only member of.',
                    confirmLabel: 'Leave Team',
                    disablePrimary: true
                })
                return
            }
            Dialog.show({
                header: 'Leave Team',
                kind: 'danger',
                text: `Are you sure you want to leave ${row.name}?`,
                confirmLabel: 'Leave Team'
            }, async () => {
                try {
                    await teamApi.removeTeamMember(row.id, this.user.id)
                    alerts.emit(`${this.user.username} successfully removed from ${row.name}`, 'confirmation')
                    this.$store.dispatch('account/refreshTeams')
                } catch (err) {
                    alerts.emit(`Failed to remove ${this.user.username} from ${row.name}: ${err.response.data.error}`, 'warning')
                    console.warn(err)
                }
            })
        }
    }
}
</script>
