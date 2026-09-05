<template>
    <div>
        <ff-loading v-if="loading" :message="$t('ui.loadingInvitations')" />
        <form v-else class="space-y-6">
            <div class="text-right" />
            <ff-data-table data-el="invites-table" :columns="inviteColumns" :rows="invitations">
                <template #row-actions="{row}">
                    <ff-button
                        v-if="!!settings.email"
                        v-ff-tooltip:left="$t('ui.resendEmailInvitation')"
                        kind="tertiary"
                        class="ff-btn-xs ff-btn--tertiary"
                        data-action="remove-invite"
                        @click="resendInvite(row)"
                    >
                        <template #icon>
                            <ArrowPathIcon />
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
import { ArrowPathIcon, TrashIcon } from '@heroicons/vue/24/outline'

import { mapState } from 'pinia'
import { markRaw } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import teamApi from '../../../api/team.js'
import InviteUserCell from '../../../components/tables/cells/InviteUserCell.vue'
import usePermissions from '../../../composables/Permissions.js'

import { t } from '../../../i18n.js'
import Alerts from '../../../services/alerts.js'
import Dialog from '../../../services/dialog.js'

import { useAccountSettingsStore } from '@/stores/account-settings.js'
import { useContextStore } from '@/stores/context.js'

export default {
    name: 'MemberInviteTable',
    components: { TrashIcon, ArrowPathIcon },
    props: {
        inviteCount: {
            type: Number,
            required: true
        }
    },
    emits: ['updated', 'invites-updated'],
    setup () {
        const { hasPermission } = usePermissions()

        return { hasPermission }
    },
    data () {
        return {
            loading: false,
            invitations: [],
            inviteColumns: [
                { label: t('ui.user2'), class: ['grow'], component: { is: markRaw(InviteUserCell), map: { user: 'invitee' } }, key: 'invitee' },
                { label: t('ui.role'), class: ['w-40'], key: 'roleLabel' },
                { label: t('ui.expiresIn'), class: ['w-40'], key: 'expires' }
            ]
        }
    },
    computed: {
        ...mapState(useContextStore, ['team', 'teamMembership']),
        ...mapState(useAccountSettingsStore, ['settings'])
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
                header: t('ui.deleteInvitation'),
                kind: 'danger',
                html: `Are you sure you want to delete the invitation sent to <i>${invite.invitee.email || invite.invitee.name}</i> ?`,
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
                header: t('ui.resendInvitation'),
                kind: 'primary',
                html: `Do you want to resend the invitation to <i>${invite.invitee.email || invite.invitee.name}</i> ?`,
                confirmLabel: 'Resend'
            }, async () => {
                teamApi.resendTeamInvitation(invite.team.id, invite.id)
                    .then((res) => {
                        const idx = this.invitations.findIndex(inv => inv.id === res.id)

                        if (idx !== -1) {
                            this.invitations[idx] = res
                        }

                        Alerts.emit('The invitation email was sent successfully', 'confirmation')
                    })
                    .catch((err) => {
                        if (err.status === 429) {
                            const seconds = err.response?.headers['retry-after']
                            Alerts.emit(`Failed to resend invitation, rate limit exceeded. Please try again in ${seconds} seconds`, 'warning', 7500)
                        } else {
                            Alerts.emit('Failed to resend invitation: ' + err.toString(), 'warning', 7500)
                        }
                    })
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
