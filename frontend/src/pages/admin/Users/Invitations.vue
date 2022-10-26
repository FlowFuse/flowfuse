<template>
    <div>
        <div class="space-y-6">
            <div class="text-right"></div>
            <ff-data-table :columns="inviteColumns" :rows="invitations" :show-search="true" search-placeholder="Search Invites...">
                <template v-slot:context-menu="{row}">
                    <ff-list-item label="Remove Invite" kind="danger" @click="removeInvite(row)"/>
                </template>
            </ff-data-table>
        </div>
    </div>
</template>

<script>
import adminApi from '@/api/admin'
import teamApi from '@/api/team'
import { markRaw } from 'vue'
import InviteUserCell from '@/components/tables/cells/InviteUserCell'

export default {
    name: 'UserInviteTable',
    data () {
        return {
            invitations: [],
            inviteColumns: [
                { label: 'User', key: 'invitee', component: { is: markRaw(InviteUserCell), map: { user: 'invitee' } } },
                { label: 'Team', key: 'teamName' },
                { label: 'Invited By', key: 'invitor', component: { is: markRaw(InviteUserCell), map: { user: 'invitor' } } },
                { label: 'Expires In', key: 'expires' }
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
