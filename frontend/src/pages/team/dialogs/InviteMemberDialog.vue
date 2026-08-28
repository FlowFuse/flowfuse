<template>
    <ff-dialog ref="dialog" :header="$t('ui.inviteTeamMember')" :confirm-label="$t('ui.invite')" :disable-primary="disableConfirm" @confirm="confirm()">
        <template #default>
            <form class="space-y-2" @submit.prevent>
                <template v-if="!responseErrors">
                    <p v-if="!exceedsUserLimit">{{ $t('ui.inviteAUserToJoinTheTeamByUsername') }}<span v-if="externalEnabled"> {{ $t('ui.orEmail') }}</span>. Please use a comma-separated list to invite multiple new users.</p>
                    <p v-if="hasUserLimit">{{ $t('ui.yourTeamCanHaveAMaximumOfP0Members', { p0: userLimit }) }}</p>
                    <p v-if="exceedsUserLimit">{{ $t('ui.youCurrentlyHaveP0IncludingExistingInvitesSoCann', { p0: totalMembers }) }}</p>
                    <div v-if="!exceedsUserLimit" class="space-y-4 pt-2">
                        <FormRow id="userInfo" v-model="input.userInfo" :error="errors.userInfo" :placeholder="'username, username2, ...' + (externalEnabled?' or email1, email2, ...':'')" />
                        <ff-radio-group v-model="input.role" orientation="vertical" :options="roleOptions" />
                    </div>
                </template>
                <template v-else>
                    <ul>
                        <li v-for="(value, name) in responseErrors" :key="name" class="text-sm">
                            <span class="font-medium">{{ name }}</span>: <span>{{ value }}</span>
                        </li>
                    </ul>
                </template>
            </form>
        </template>
    </ff-dialog>
</template>

<script>
import { mapState } from 'pinia'

import teamApi from '../../../api/team.js'
import FormRow from '../../../components/FormRow.vue'
import { getTeamProperty } from '../../../composables/TeamProperties.js'

import { t } from '../../../i18n.js'
import alerts from '../../../services/alerts.js'
import { Roles } from '../../../utils/roles.js'

import { useAccountSettingsStore } from '@/stores/account-settings.js'

export default {
    name: 'InviteMemberDialog',
    components: {
        FormRow
    },
    props: {
        team: {
            type: Object,
            required: true
        },
        userCount: {
            type: Number,
            required: true
        },
        inviteCount: {
            type: Number,
            required: true
        }
    },
    emits: ['invitation-sent'],
    setup () {
        return {
            roleOptions: [{
                label: t('ui.owner'),
                value: Roles.Owner,
                description: t('ui.ownersCanAddAndRemoveMembersToTheTeamAndCreateAp')
            }, {
                label: t('ui.member'),
                value: Roles.Member,
                description: t('ui.membersCanAccessTheTeamInstances')
            }, {
                label: t('ui.viewer'),
                value: Roles.Viewer,
                description: t('ui.viewersCanAccessTheTeamInstancesButNotMakeAnyCha')
            }, {
                label: t('ui.dashboardOnly'),
                value: Roles.Dashboard,
                description: t('ui.dashboardUsersCanOnlyAccessTheDashboardsOrHttpEn')
            }],
            show () {
                this.$refs.dialog.show()
                this.responseErrors = null
                this.input.userInfo = ''
                this.errors.userInfo = null
            }
        }
    },
    data () {
        return {
            input: {
                userInfo: '',
                role: Roles.Member
            },
            errors: {
                userInfo: null
            },
            responseErrors: null,
            Roles
        }
    },
    computed: {
        ...mapState(useAccountSettingsStore, ['settings']),
        externalEnabled () {
            return this.settings.email && this.settings['team:user:invite:external']
        },
        disableConfirm () {
            return !!(this.exceedsUserLimit || this.responseErrors || !this.input.userInfo.trim() || this.errors.userInfo)
        },
        totalMembers () {
            const count = this.userCount + this.inviteCount
            return count + ' member' + (count > 1 ? 's' : '')
        },
        userLimit () {
            return getTeamProperty(this.team, 'user.limit') || 0
        },
        hasUserLimit () {
            return this.userLimit > 0
        },
        exceedsUserLimit () {
            return this.hasUserLimit && (this.userCount + this.inviteCount) >= this.userLimit
        }
    },
    watch: {
        'input.userInfo': function () {
            if (!this.externalEnabled) {
                if (/@/.test(this.input.userInfo)) {
                    this.errors.userInfo = t('ui.emailInvitationsNotAvailable')
                } else {
                    this.errors.userInfo = null
                }
            }
        }
    },
    methods: {
        async confirm () {
            try {
                const result = await teamApi.createTeamInvitation(this.team.id, this.input.userInfo, parseInt(this.input.role))
                if (result.error) {
                    // result.error - an object of { username: error_message }
                    this.responseErrors = result.error
                    for (const [user, reason] of Object.entries(result.error)) {
                        alerts.emit(`Unable to invite ${user}: ${reason}`, 'warning')
                    }
                } else {
                    alerts.emit(t('ui.inviteSentTo') + this.input.userInfo, 'confirmation')
                    this.$emit('invitation-sent')
                }
            } catch (err) {
                if (err.response?.data) {
                    alerts.emit(`Unable to invite users: ${err.response.data.error}`)
                } else {
                    console.error(err)
                }
            }
        }
    }
}
</script>
