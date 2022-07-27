<template>
    <form class="space-y-6">
        <ff-data-table :columns="inviteColumns" :rows="invitations">
            <template v-slot:context-menu="{row}">
                <ff-list-item label="Accept" @click="acceptInvite(row.id)"/>
                <ff-list-item label="Reject" kind="danger" @click="rejectInvite(row.id)"/>
            </template>
        </ff-data-table>
    </form>
</template>

<script>
import userApi from '@/api/user'
import { markRaw } from 'vue'
import InviteUserCell from '@/components/tables/cells/InviteUserCell'
import TeamCell from '@/components/tables/cells/TeamCell'

export default {
    name: 'UserInviteTable',
    props: ['user'],
    emits: ['invites-updated'],
    data () {
        return {
            invitations: [],
            inviteColumns: [
                { label: 'Team', key: 'team', class: ['w-auto'], component: { is: markRaw(TeamCell) } },
                { label: 'Sent by', key: 'invitor', class: ['w-auto'], component: { is: markRaw(InviteUserCell) } },
                { label: 'Expires In', key: 'expires', class: ['w-auto'] }
            ]
        }
    },
    mounted () {
        this.fetchData()
    },
    methods: {
        async acceptInvite (inviteId) {
            await userApi.acceptTeamInvitation(inviteId)
            await this.fetchData()
            await this.$store.dispatch('account/refreshTeams')
        },
        async rejectInvite (inviteId) {
            await userApi.rejectTeamInvitation(inviteId)
            await this.fetchData()
        },
        async fetchData () {
            const invitations = await userApi.getTeamInvitations()
            await this.$store.dispatch('account/countNotifications')
            this.invitations = invitations.invitations
        }
    }
}
</script>
