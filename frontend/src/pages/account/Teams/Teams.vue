<template>
    <div v-if="settings['team:create']" class="text-right mb-4"><CreateTeamButton /></div>
    <ff-data-table :columns="columns" :rows="teams">
        <template #context-menu="{row}">
            <ff-list-item data-action="member-remove-from-team" label="Leave Team" kind="danger" @click="removeUserDialog(row)" />
        </template>
    </ff-data-table>
</template>

<script>

import { markRaw } from 'vue'
import { mapState } from 'vuex'

import teamApi from '../../../api/team.js'

import TeamCell from '../../../components/tables/cells/TeamCell.vue'
import alerts from '../../../services/alerts.js'
import Dialog from '../../../services/dialog.js'
import CreateTeamButton from '../components/CreateTeamButton.vue'

export default {
    name: 'AccountTeams',
    components: {
        CreateTeamButton
    },
    data () {
        return {
            columns: [
                { label: 'Name', key: 'name', class: ['flex-grow'], component: { is: markRaw(TeamCell) } },
                { label: 'Application Instances', key: 'instanceCount', class: ['w-32', 'text-center'] },
                { label: 'Members', key: 'memberCount', class: ['w-32', 'text-center'] },
                { label: 'Role', key: 'roleName', class: ['w-40'] }
            ]
        }
    },
    computed: {
        ...mapState('account', ['user', 'teams', 'settings']),
        teamCount () {
            return this.teams ? this.teams.length : 0
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
                    await this.$store.dispatch('account/refreshTeams')
                    if (!this.teamCount) {
                        await this.$store.dispatch('account/setTeam', null)
                    }
                } catch (err) {
                    alerts.emit(`Failed to remove ${this.user.username} from ${row.name}: ${err.response.data.error}`, 'warning')
                    console.warn(err)
                }
            })
        }
    }
}
</script>
