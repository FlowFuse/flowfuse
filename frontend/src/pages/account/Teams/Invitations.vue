<template>
    <form class="space-y-6">
        <ItemTable :items="invitations" :columns="inviteColumns" />
    </form>
</template>

<script>
import userApi from '@/api/user'
import { markRaw } from 'vue'
import ItemTable from '@/components/tables/ItemTable'
import InviteUserCell from '@/components/tables/cells/InviteUserCell'
import TeamCell from '@/components/tables/cells/TeamCell'

import UserInviteActions from '../components/UserInviteActions'

export default {
    name: 'UserInviteTable',
    props: ['user'],
    data () {
        return {
            invitations: [],
            inviteColumns: [
                { name: 'Team', class: ['w-auto'], component: { is: markRaw(TeamCell) }, property: 'team' },
                { name: 'Sent by', class: ['w-auto'], component: { is: markRaw(InviteUserCell) }, property: 'invitor' },
                { name: 'Expires In', class: ['w-auto'], property: 'expires' },
                { name: '', class: ['w-48'], component: { is: markRaw(UserInviteActions) } }
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
            this.invitations = invitations.invitations.map(invite => {
                invite.onaccept = (inviteId) => { this.acceptInvite(inviteId) }
                invite.onreject = (inviteId) => { this.rejectInvite(inviteId) }
                return invite
            })
            this.invitationCount = invitations.count
        }
    },
    components: {
        ItemTable
    }
}
</script>
