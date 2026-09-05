<template>
    <ff-dialog ref="dialog" :header="$t('ui.changeRole')" :confirm-label="$t('ui.change')" :disable-primary="ownerCount < 2 && isOwner" @confirm="confirm()">
        <template v-if="user" #default>
            <form class="space-y-6" @submit.prevent>
                <div class="space-y-2">
                    <template v-if="ownerCount < 2 && isOwner">
                        <p class="text-sm text-gray-500">
                            {{ $t('ui.youCannotChangeTheRoleFor') }} <span class="font-bold">{{ user.username }}</span> {{ $t('ui.asTheyAreTheOnlyOwnerOfTheTeam') }}
                        </p>
                    </template>
                    <template v-else>
                        <p class="text-sm text-gray-500 mb-6">
                            {{ $t('ui.selectARoleFor') }} <span class="font-bold">{{ user.username }}</span>:
                        </p>
                        <ff-radio-group v-model="input.role" orientation="vertical" :options="roleOptions" />
                    </template>
                </div>
            </form>
        </template>
    </ff-dialog>
</template>

<script>

import teamApi from '../../../api/team.js'
import { t } from '../../../i18n.js'
import alerts from '../../../services/alerts.js'
import { Roles } from '../../../utils/roles.js'

export default {
    name: 'ChangeTeamRoleDialog',
    emits: ['role-updated'],
    data () {
        return {
            ownerCount: 0,
            team: null,
            user: null,
            input: {
                role: ''
            },
            Roles
        }
    },
    methods: {
        async confirm () {
            if (!(this.ownerCount < 2 && this.isOwner)) {
                try {
                    await teamApi.changeTeamMemberRole(this.team.id, this.user.id, this.input.role)
                    this.user.role = this.input.role
                    this.$emit('role-updated', this.user)
                    alerts.emit("User's role successfully updated", 'confirmation')
                } catch (err) {
                    console.warn(err)
                    if (err.response?.status === 400 && err.response?.data.error === 'Cannot modify team membership for an SSO managed user') {
                        alerts.emit('User\'s roles are managed by SSO Groups', 'warning', 5000)
                    }
                }
            }
        }
    },
    computed: {
        isOwner: function () {
            return this.user?.role === Roles.Owner
        }
    },
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
            show (team, user, ownerCount) {
                this.$refs.dialog.show()
                this.team = team
                this.ownerCount = ownerCount
                this.user = user
                this.input.role = user.role
            }
        }
    }
}
</script>
