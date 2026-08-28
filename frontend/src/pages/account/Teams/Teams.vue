<template>
    <div v-if="settings['team:create']" class="text-right mb-4"><CreateTeamButton /></div>
    <ff-data-table :columns="columns" :rows="teams">
        <template #context-menu="{row}">
            <ff-kebab-item data-action="member-remove-from-team" :label="$t('ui.leaveTeam')" kind="danger" @click="removeUserDialog(row)" />
        </template>
    </ff-data-table>
</template>

<script>

import { mapState } from 'pinia'
import { markRaw } from 'vue'

import teamApi from '../../../api/team.js'

import TeamCell from '../../../components/tables/cells/TeamCell.vue'
import { t } from '../../../i18n.js'
import alerts from '../../../services/alerts.js'
import Dialog from '../../../services/dialog.js'
import CreateTeamButton from '../components/CreateTeamButton.vue'

import { useAccountAuthStore } from '@/stores/account-auth.js'
import { useAccountSettingsStore } from '@/stores/account-settings.js'
import { useAccountStore } from '@/stores/account.js'
import { useDataFarmTeamsStore } from '@/stores/data-farm-teams'

export default {
    name: 'AccountTeams',
    components: {
        CreateTeamButton
    },
    data () {
        return {
            columns: [
                { label: t('ui.name'), key: 'name', class: ['grow'], component: { is: markRaw(TeamCell) } },
                { label: t('ui.applicationInstances'), key: 'instanceCount', class: ['w-32', 'text-center'] },
                { label: t('ui.members'), key: 'memberCount', class: ['w-32', 'text-center'] },
                { label: t('ui.role'), key: 'roleLabel', class: ['w-40'] }
            ]
        }
    },
    computed: {
        ...mapState(useDataFarmTeamsStore, { teams: 'teamList' }),
        ...mapState(useAccountSettingsStore, ['settings']),
        ...mapState(useAccountAuthStore, ['user']),
        teamCount () {
            return this.teams ? this.teams.length : 0
        }
    },
    methods: {
        teamSelected (team) {
            this.$router.push({ name: 'team', params: { team_slug: team.slug } })
        },
        removeUserDialog (row) {
            if (row.memberCount === 1) {
                Dialog.show({
                    header: t('ui.leaveTeam'),
                    kind: 'primary',
                    text: t('ui.youCannotLeaveATeamYouAreTheOnlyMemberOf'),
                    confirmLabel: 'Leave Team',
                    disablePrimary: true
                })
                return
            }
            Dialog.show({
                header: t('ui.leaveTeam'),
                kind: 'danger',
                text: `Are you sure you want to leave ${row.name}?`,
                confirmLabel: 'Leave Team'
            }, async () => {
                try {
                    await teamApi.removeTeamMember(row.id, this.user.id)
                    alerts.emit(`${this.user.username} successfully removed from ${row.name}`, 'confirmation')
                    await useDataFarmTeamsStore().fetchTeamList()
                    if (!this.teamCount) {
                        await useAccountStore().setTeam(null)
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
