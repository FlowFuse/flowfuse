<template>
    <div>
        <FormHeading>
            Pending Invitations
        </FormHeading>
        <ff-loading v-if="loading" message="Loading Invitations..." />
        <form v-else class="space-y-6">
            <div class="text-right"></div>
            <ItemTable :items="invitations" :columns="inviteColumns" />
        </form>
    </div>
</template>

<script>
import teamApi from '@/api/team'
import { markRaw } from 'vue'
import FormHeading from '@/components/FormHeading'
import ItemTable from '@/components/tables/ItemTable'
import InviteUserCell from '@/components/tables/cells/InviteUserCell'
import { useRoute, useRouter } from 'vue-router'
import { Roles } from '@core/lib/roles'
import MemberInviteRemoveButton from '../../admin/Users/components/MemberInviteRemoveButton.vue'

export default {
    name: 'MemberInviteTable',
    props: ['team', 'teamMembership'],
    emits: ['updated'],
    data () {
        return {
            loading: false,
            invitations: [],
            inviteColumns: [
                { name: 'User', class: ['flex-grow'], component: { is: markRaw(InviteUserCell) }, property: 'invitee' },
                { name: 'Expires In', class: ['w-40'], property: 'expires' },
                { name: '', class: ['w-16'], component: { is: markRaw(MemberInviteRemoveButton) } }
            ]
        }
    },
    watch: {
        teamMembership: 'fetchData',
        team: 'fetchData'
    },
    mounted () {
        this.fetchData()
    },
    methods: {
        async removeInvite (teamId, inviteId) {
            await teamApi.removeTeamInvitation(teamId, inviteId)
            await this.fetchData()
            this.$emit('invites-updated')
        },
        async fetchData () {
            this.loading = true
            if (this.team && this.teamMembership) {
                if (this.teamMembership.role !== Roles.Owner && this.teamMembership.role !== Roles.Admin) {
                    useRouter().push({ path: `/team/${useRoute().params.team_slug}/members/general` })
                    return
                }
                const invitations = await teamApi.getTeamInvitations(this.team.id)
                this.invitations = invitations.invitations.map(invite => {
                    invite.onremove = (teamId, inviteId) => {
                        this.removeInvite(teamId, inviteId)
                    }
                    return invite
                })

                this.invitationCount = invitations.count
            }
            this.loading = false
        }
    },
    components: {
        FormHeading,
        ItemTable
    }
}

</script>
