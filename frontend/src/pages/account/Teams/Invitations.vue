<template>
    <div class="space-y-6">
        <ff-data-table data-el="table" :columns="inviteColumns" :rows="invitations" noDataMessage="No Invitations">
            <template #row-actions="{row}">
                <ff-button data-action="invite-reject" kind="secondary-danger" @click="rejectInvite(row)">Reject</ff-button>
                <ff-button data-action="invite-accept" @click="acceptInvite(row)">Accept</ff-button>
            </template>
        </ff-data-table>
    </div>
</template>

<script>
import { markRaw } from 'vue'
import { mapGetters } from 'vuex'

import userApi from '../../../api/user.js'
import InviteUserCell from '../../../components/tables/cells/InviteUserCell.vue'
import TeamCell from '../../../components/tables/cells/TeamCell.vue'
import Alerts from '../../../services/alerts.js'

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
                { label: 'Team', key: 'team', class: ['w-auto'], component: { is: markRaw(TeamCell), map: { id: 'team.id', avatar: 'team.avatar', name: 'team.name' } } },
                { label: 'Role', class: ['w-40'], key: 'roleName' },
                { label: 'Sent by', key: 'invitor', class: ['w-auto'], component: { is: markRaw(InviteUserCell), map: { user: 'invitor' } } },
                { label: 'Expires In', key: 'expires', class: ['w-auto'] }
            ]
        }
    },
    computed: {
        ...mapGetters('account', {
            invitations: 'teamInvitations'
        })
    },
    mounted () {
        this.$store.dispatch('account/getInvitations')
    },
    methods: {
        async acceptInvite (invite) {
            await userApi.acceptTeamInvitation(invite.id, invite.team.id)
            await this.$store.dispatch('account/getNotifications')
            await this.$store.dispatch('account/getInvitations')
            await this.$store.dispatch('account/refreshTeams')
            Alerts.emit(`Invite to "${invite.team.name}" has been accepted.`, 'confirmation')
            // navigate to team dashboad once invite accepted
            this.$router.push({
                name: 'Team',
                params: {
                    team_slug: invite.team.slug
                }
            })
        },
        async rejectInvite (invite) {
            await userApi.rejectTeamInvitation(invite.id, invite.team.id)
            await this.$store.dispatch('account/getNotifications')
            await this.$store.dispatch('account/getInvitations')
            Alerts.emit(`Invite to "${invite.team.name}" has been rejected.`, 'confirmation')
        }
    }
}
</script>
