<template>
    <div class="space-y-6">
        <ff-data-table data-el="table" :columns="inviteColumns" :rows="invitations" :noDataMessage="$t('ui.noInvitations')">
            <template #row-actions="{row}">
                <ff-button data-action="invite-reject" kind="secondary-danger" @click="rejectInvite(row)">{{ $t('ui.reject') }}</ff-button>
                <ff-button data-action="invite-accept" @click="acceptInvite(row)">{{ $t('ui.accept') }}</ff-button>
            </template>
        </ff-data-table>
    </div>
</template>

<script>
import { mapState } from 'pinia'
import { markRaw } from 'vue'

import userApi from '../../../api/user.js'

import InviteUserCell from '../../../components/tables/cells/InviteUserCell.vue'
import TeamCell from '../../../components/tables/cells/TeamCell.vue'
import { t } from '../../../i18n.js'
import Alerts from '../../../services/alerts.js'

import { useAccountStore } from '@/stores/account.js'
import { useDataFarmTeamsStore } from '@/stores/data-farm-teams'

export default {
    name: 'UserInviteTable',
    props: {
        user: {
            default: null,
            type: Object
        }
    },
    emits: ['invites-updated'],
    data () {
        return {
            inviteColumns: [
                { label: t('ui.team2'), key: 'team', class: ['w-auto'], component: { is: markRaw(TeamCell), map: { id: 'team.id', avatar: 'team.avatar', name: 'team.name' } } },
                { label: t('ui.role'), class: ['w-40'], key: 'roleLabel' },
                { label: t('ui.sentBy'), key: 'invitor', class: ['w-auto'], component: { is: markRaw(InviteUserCell), map: { user: 'invitor' } } },
                { label: t('ui.expiresIn'), key: 'expires', class: ['w-auto'] }
            ]
        }
    },
    computed: {
        ...mapState(useAccountStore, { invitations: 'teamInvitations' })
    },
    mounted () {
        useAccountStore().getInvitations()
    },
    methods: {
        async acceptInvite (invite) {
            await userApi.acceptTeamInvitation(invite.id, invite.team.id)
            await useAccountStore().getNotifications()
            await useAccountStore().getInvitations()
            await useDataFarmTeamsStore().fetchTeamList()
            Alerts.emit(`Invite to "${invite.team.name}" has been accepted.`, 'confirmation')
            // navigate to team dashboad once invite accepted
            useAccountStore().setTeam(invite.team.slug)
                .then(() => this.$router.push({
                    name: 'team',
                    params: {
                        team_slug: invite.team.slug
                    }
                }))
                .catch(e => console.warn(e))
        },
        async rejectInvite (invite) {
            await userApi.rejectTeamInvitation(invite.id, invite.team.id)
            await useAccountStore().getNotifications()
            await useAccountStore().getInvitations()
            Alerts.emit(`Invite to "${invite.team.name}" has been rejected.`, 'confirmation')
        }
    }
}
</script>
