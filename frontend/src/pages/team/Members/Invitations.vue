<template>
    <div>
        <ff-loading v-if="loading" message="Loading Invitations..." />
        <form v-else class="space-y-6">
            <div class="text-right" />
            <ff-data-table data-el="invites-table" :columns="inviteColumns" :rows="invitations">
                <template #context-menu="{row}">
                    <ff-list-item data-action="remove-invite" label="Remove Invite" kind="danger" @click="removeInvite(row)" />
                </template>
            </ff-data-table>
        </form>
    </div>
</template>

<script>
import { markRaw } from 'vue'

import { useRoute, useRouter } from 'vue-router'

import teamApi from '../../../api/team.js'
import InviteUserCell from '../../../components/tables/cells/InviteUserCell.vue'

import permissionsMixin from '../../../mixins/Permissions.js'

export default {
    name: 'MemberInviteTable',
    mixins: [permissionsMixin],
    props: {
        inviteCount: {
            type: Number,
            required: true
        }
    },
    emits: ['updated', 'invites-updated'],
    data () {
        return {
            loading: false,
            invitations: [],
            inviteColumns: [
                { label: 'User', class: ['flex-grow'], component: { is: markRaw(InviteUserCell), map: { user: 'invitee' } }, key: 'invitee' },
                { label: 'Role', class: ['w-40'], key: 'roleName' },
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
                if (!this.hasPermission('team:user:invite')) {
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
