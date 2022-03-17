<template>
    <div>
        <FormHeading>
            Team Invitations
        </FormHeading>
        <form class="space-y-6">
            <div class="text-right"></div>
            <ItemTable :items="invitations" :columns="inviteColumns" />
        </form>
    </div>
</template>

<script>
import userApi from '@/api/user'
import { markRaw } from 'vue'
import FormHeading from '@/components/FormHeading'
import ItemTable from '@/components/tables/ItemTable'
import InviteUserCell from '@/components/tables/cells/InviteUserCell'
import TeamCell from '@/components/tables/cells/TeamCell'

const UserInviteActions = {
    template: '<div class="space-x-2"><button type="button" class="forge-button-danger" @click="rejectInvite">Reject</button> <button type="button" class="forge-button" @click="acceptInvite">Accept</button></div>',
    props: ['id', 'onaccept', 'onreject'],
    methods: {
        async acceptInvite () {
            await this.onaccept(this.id)
        },
        async rejectInvite () {
            await this.onreject(this.id)
        }
    }
}

export default {
    name: 'UserInviteTable',
    props: ['user'],
    data () {
        return {
            invitations: [],
            inviteColumns: [
                { name: 'Team', class: ['flex-grow'], component: { is: markRaw(TeamCell) }, property: 'team' },
                { name: 'Sent by', class: ['flex-grow', 'hidden', 'sm:block'], component: { is: markRaw(InviteUserCell) }, property: 'invitor' },
                { name: 'Expires In', class: ['w-32', 'hidden', 'sm:block'], property: 'expires' },
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
        FormHeading,
        ItemTable
    }
}

</script>
