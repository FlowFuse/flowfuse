<template>
    <div>
        <div class="space-y-6">
            <div class="text-right" />
            <ff-data-table :columns="inviteColumns" :rows="invitations" :show-search="true" :search-placeholder="$t('ui.searchInvites')">
                <template #context-menu="{row}">
                    <ff-kebab-item :label="$t('ui.removeInvite')" kind="danger" @click="removeInvite(row)" />
                </template>
            </ff-data-table>
        </div>
    </div>
</template>

<script>
import { markRaw } from 'vue'

import adminApi from '../../../api/admin.js'
import teamApi from '../../../api/team.js'
import InviteUserCell from '../../../components/tables/cells/InviteUserCell.vue'
import { t } from '../../../i18n.js'

export default {
    name: 'UserInviteTable',
    data () {
        return {
            invitations: [],
            inviteColumns: [
                { label: t('ui.user2'), key: 'invitee', component: { is: markRaw(InviteUserCell), map: { user: 'invitee' } } },
                { label: t('ui.team2'), key: 'teamName' },
                { label: t('ui.invitedBy'), key: 'invitor', component: { is: markRaw(InviteUserCell), map: { user: 'invitor' } } },
                { label: t('ui.expiresIn'), key: 'expires' }
            ]
        }
    },
    mounted () {
        this.fetchData()
    },
    methods: {
        async removeInvite (invite) {
            await teamApi.removeTeamInvitation(invite.team.id, invite.id)
            await this.fetchData()
        },
        async fetchData () {
            const invitations = await adminApi.getInvitations()
            if (invitations.invitations.length > 0) {
                this.invitations = invitations.invitations.map(invite => {
                    invite.teamName = invite.team.name
                    invite.onremove = (teamId, inviteId) => { this.removeInvite(teamId, inviteId) }
                    return invite
                })
            }
        }
    }
}

</script>
