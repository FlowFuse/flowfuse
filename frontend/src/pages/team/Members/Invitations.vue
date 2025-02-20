<template>
    <div>
        <ff-loading v-if="loading" message="Loading Invitations..." />
        <form v-else class="space-y-6">
            <div class="text-right" />
            <ff-data-table data-el="invites-table" :columns="inviteColumns" :rows="invitations">
                <template #row-actions="{row}">
                    <ff-button
                        v-if="!!settings.email"
                        v-ff-tooltip:left="'Resend Email Invitation'"
                        kind="tertiary"
                        class="ff-btn-xs ff-btn--tertiary"
                        data-action="remove-invite"
                        @click="resendInvite(row)"
                    >
                        <template #icon>
                            <RefreshIcon />
                        </template>
                    </ff-button>
                    <ff-button kind="tertiary" class="ff-btn-xs ff-btn--tertiary-danger" data-action="remove-invite" @click="removeInvite(row)">
                        <template #icon>
                            <TrashIcon />
                        </template>
                    </ff-button>
                </template>
            </ff-data-table>
        </form>
    </div>
</template>

<script>
import { RefreshIcon, TrashIcon } from '@heroicons/vue/outline'
import { markRaw } from 'vue'

import { useRoute, useRouter } from 'vue-router'
import { mapState } from 'vuex'

import teamApi from '../../../api/team.js'
import InviteUserCell from '../../../components/tables/cells/InviteUserCell.vue'

import permissionsMixin from '../../../mixins/Permissions.js'
import Alerts from '../../../services/alerts.js'
import Dialog from '../../../services/dialog.js'

export default {
    name: 'MemberInviteTable',
    components: { TrashIcon, RefreshIcon },
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
    computed: {
        ...mapState('account', ['settings'])
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
            return Dialog.show({
                header: 'Delete Invitation',
                kind: 'danger',
                html: `Are you sure you want to delete the invitation sent to <i>${invite.invitee.name}</i> ?`,
                confirmLabel: 'Delete'
            }, async () => {
                try {
                    await teamApi.removeTeamInvitation(invite.team.id, invite.id)
                    await this.fetchData()
                    this.$emit('invites-updated')
                } catch (err) {
                    Alerts.emit('Failed to delete invitation: ' + err.toString(), 'warning', 7500)
                }
            })
        },
        async resendInvite (invite) {
            return Dialog.show({
                header: 'Resend Invitation',
                kind: 'primary',
                html: `Do you want to resend the invitation to <i>${invite.invitee.name}</i> ?`,
                confirmLabel: 'Resend'
            }, async () => {
                try {
                    await teamApi.resendTeamInvitation(invite.team.id, invite.id)
                        .then(() => Alerts.emit('The invitation email was sent successfully', 'confirmation'))
                } catch (err) {
                    Alerts.emit('Failed to resend invitation: ' + err.toString(), 'warning', 7500)
                }
            })
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
