<template>
    <div>
        <ff-loading v-if="loading" message="Loading Invitations..." />
        <form v-else class="space-y-6">
            <div class="text-right"></div>
            <ff-data-table :columns="inviteColumns" :rows="invitations">
                <template v-slot:context-menu="{row}">
                    <ff-list-item label="Remove Invite" kind="danger" @click="removeInvite(row)" />
                </template>
            </ff-data-table>
        </form>
    </div>
</template>

<script>
import teamApi from '@/api/team'
import { markRaw } from 'vue'
import InviteUserCell from '@/components/tables/cells/InviteUserCell'
import { useRoute, useRouter } from 'vue-router'
import { Roles } from '@core/lib/roles'

export default {
    name: 'MemberInviteTable',
    props: ['team', 'teamMembership'],
    emits: ['updated'],
    data () {
        return {
            loading: false,
            invitations: [],
            inviteColumns: [
                { label: 'User', class: ['flex-grow'], component: { is: markRaw(InviteUserCell), map: { user: 'invitee' } }, key: 'invitee' },
                { label: 'Expires In', class: ['w-40'], key: 'expires' }
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
        async removeInvite (invite) {
            await teamApi.removeTeamInvitation(invite.team.id, invite.id)
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
                this.invitations = invitations.invitations
                this.invitationCount = invitations.count
            }
            this.loading = false
        }
    }
}

</script>
