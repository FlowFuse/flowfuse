<template>
    <FeatureUnavailableToTeam v-if="teamUserLimitReached" :fullMessage="$t('ui.youHaveReachedTheUserLimitForThisTeam')" class="mt-0" />
    <ff-loading v-if="loading" :message="$t('ui.loadingTeam')" />
    <form v-else>
        <div class="text-right" />
        <ff-data-table
            data-el="members-table"
            :columns="columns"
            :rows="users"
            :show-search="true" :search-placeholder="$t('ui.searchTeamMembers')"
            :search-fields="['name', 'username', 'role']"
            :collapsible-row="collapsibleRow"
        >
            <template v-if="hasPermission('team:user:invite')" #actions>
                <ff-button data-action="member-invite-button" :disabled="teamUserLimitReached" kind="primary" @click="inviteMember">
                    <template #icon-left><UserPlusIcon class="w-4" /></template>
                    {{ $t('ui.inviteMembers') }}
                </ff-button>
            </template>
            <template v-if="canEditUser" #context-menu="{row}">
                <ff-kebab-item
                    v-if="((hasPermission('team:user:change-role') && !requiresBilling) || isAdminUser) && !ssoManaged({row})"
                    data-action="member-change-role"
                    :label="$t('ui.changeRole')" @click="changeRoleDialog(row)"
                />
                <ff-kebab-item
                    v-if="(hasPermission('team:user:remove') || isAdminUser) && !ssoManaged({row})"
                    data-action="member-remove-from-team"
                    :label="$t('ui.removeFromTeam')"
                    kind="danger"
                    @click="removeUserDialog(row)"
                />
                <ff-kebab-item
                    v-if="ssoManaged({row})"
                    :label="$t('ui.userRoleIsSsoManaged')"
                />
            </template>
        </ff-data-table>
    </form>

    <ChangeTeamRoleDialog ref="changeTeamRoleDialog" @role-updated="roleUpdated" />
    <ConfirmTeamUserRemoveDialog ref="confirmTeamUserRemoveDialog" @user-removed="userRemoved" />
    <InviteMemberDialog
        v-if="hasPermission('team:user:invite')"
        ref="inviteMemberDialog"
        :team="team"
        :inviteCount="inviteCount"
        :userCount="userCount"
        @invitation-sent="$emit('invites-updated')"
    />
    <EditApplicationPermissionsDialog ref="editApplicationPermissionsDialog" @user-updated="fetchTeamMembers(false)" />
</template>

<script>
import { UserPlusIcon } from '@heroicons/vue/20/solid'
import { mapActions, mapState } from 'pinia'
import { markRaw } from 'vue'

import teamApi from '../../../api/team.js'
import FeatureUnavailableToTeam from '../../../components/banners/FeatureUnavailableToTeam.vue'
import EditApplicationPermissionsDialog from '../../../components/dialogs/EditApplicationPermissionsDialog.vue'
import UserCell from '../../../components/tables/cells/UserCell.vue'
import UserRoleCell from '../../../components/tables/cells/UserRoleCell.vue'
import usePermissions from '../../../composables/Permissions.js'
import { getTeamProperty } from '../../../composables/TeamProperties.js'
import { t } from '../../../i18n.js'
import alerts from '../../../services/alerts.js'
import { Roles } from '../../../utils/roles.js'
import ChangeTeamRoleDialog from '../dialogs/ChangeTeamRoleDialog.vue'
import ConfirmTeamUserRemoveDialog from '../dialogs/ConfirmTeamUserRemoveDialog.vue'
import InviteMemberDialog from '../dialogs/InviteMemberDialog.vue'

import ApplicationPermissionOverride from './components/ApplicationPermissionOverride.vue'

import ApplicationPermissionRow from './components/ApplicationPermissionsRow.vue'

import { useAccountAuthStore } from '@/stores/account-auth.js'
import { useAccountSettingsStore } from '@/stores/account-settings.js'
import { useContextStore } from '@/stores/context.js'

export default {
    name: 'TeamUsersGeneral',
    components: {
        EditApplicationPermissionsDialog,
        ChangeTeamRoleDialog,
        ConfirmTeamUserRemoveDialog,
        FeatureUnavailableToTeam,
        UserPlusIcon,
        InviteMemberDialog
    },
    props: {
        inviteCount: {
            type: Number,
            required: true
        }
    },
    emits: ['invites-updated'],
    setup () {
        const { hasPermission } = usePermissions()

        return { hasPermission }
    },
    data () {
        return {
            applications: [],
            loading: false,
            users: [],
            userCount: 0,
            userColumns: [],
            ownerCount: 0
        }
    },
    computed: {
        ...mapState(useContextStore, ['team']),
        ...mapState(useAccountSettingsStore, ['requiresBilling', 'featuresCheck']),
        ...mapState(useAccountAuthStore, ['user', 'isAdminUser']),
        canEditUser: function () {
            return this.hasPermission('team:user:remove') || this.hasPermission('team:user:change-role') || this.isAdminUser
        },
        teamUserLimitReached () {
            if (this.requiresBilling) {
                return true
            }
            let teamTypeUserLimit = getTeamProperty(this.team, 'users.limit')
            const currentUserCount = this.userCount + this.inviteCount
            if (this.team.billing?.trial && !this.team.billing?.active && getTeamProperty(this.team, 'trial.usersLimit')) {
                teamTypeUserLimit = getTeamProperty(this.team, 'trial.usersLimit')
            }
            return (teamTypeUserLimit > 0 && currentUserCount >= teamTypeUserLimit)
        },
        columns () {
            return [
                {
                    label: t('ui.user2'),
                    key: 'name',
                    sortable: true,
                    class: ['grow'],
                    component: { is: markRaw(UserCell) }
                },
                {
                    label: t('ui.access'),
                    key: 'role',
                    sortable: true,
                    class: ['w-40'],
                    component: { is: markRaw(UserRoleCell) }
                },
                {
                    label: '',
                    key: 'overrides',
                    sortable: false,
                    class: ['w-40'],
                    component: {
                        is: markRaw(ApplicationPermissionOverride)
                    }
                }
            ]
        },
        collapsibleRow () {
            if (!this.featuresCheck.isApplicationsRBACFeatureEnabled || (!this.isAdminUser && !this.hasPermission('application:access-control'))) {
                return null
            }

            return {
                is: markRaw(ApplicationPermissionRow),
                props: {
                    applications: this.applications
                },
                on: {
                    applicationRoleUpdated: this.onApplicationRoleClick
                }
            }
        }
    },
    watch: {
        team: 'fetchTeamMembers'
    },
    mounted () {
        this.fetchTeamMembers()
            .then(() => this.fetchApplications())
            .catch(err => console.warn(err))
            .finally(() => {
                this.loading = false
            })
        // do we auto-open the dialog?
        if (this.$route.query.action === 'invite') {
            this.$router.replace({ query: null })
            this.inviteMember()
        }
    },
    methods: {
        ...mapActions(useContextStore, ['refreshTeamMembership']),
        inviteMember () {
            this.$refs.inviteMemberDialog.show()
        },
        changeRoleDialog (row) {
            this.$refs.changeTeamRoleDialog.show(this.team, row, this.ownerCount)
        },
        removeUserDialog (row) {
            this.$refs.confirmTeamUserRemoveDialog.show(this.team, row, this.ownerCount)
        },
        roleUpdated (user) {
            this.fetchTeamMembers(false)
        },
        userRemoved (user) {
            this.fetchTeamMembers()
        },
        fetchTeamMembers (withLoading = true) {
            this.loading = withLoading

            return teamApi.getTeamMembers(this.team.id)
                .then(response => {
                    this.userCount = response.count
                    this.users = response.members
                    this.ownerCount = 0

                    this.refreshTeamMembership()

                    if (this.users) {
                        this.users.forEach(u => {
                            if (u.role === Roles.Owner) {
                                this.ownerCount++
                            }
                        })
                    }
                })
                .catch(err => {
                    alerts.emit(t('ui.failedToFetchTeamMembers') + err.toString(), 'warning')
                })
                .finally(() => {
                    this.loading = false
                })
        },
        fetchApplications () {
            return teamApi.getTeamApplications(this.team.id, { excludeOwnerFiltering: true })
                .then(response => {
                    this.applications = response.applications
                })
                .catch(err => {
                    alerts.emit(t('ui.failedToFetchApplications') + err.toString(), 'warning')
                })
        },
        onApplicationRoleClick ({ application, user }) {
            this.$refs.editApplicationPermissionsDialog.show(user, application)
        },
        ssoManaged (row) {
            return row.row.ssoManaged
        }
    }
}
</script>
