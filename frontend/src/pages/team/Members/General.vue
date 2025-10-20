<template>
    <FeatureUnavailableToTeam v-if="teamUserLimitReached" fullMessage="You have reached the user limit for this team." class="mt-0" />
    <ff-loading v-if="loading" message="Loading Team..." />
    <form v-else>
        <div class="text-right" />
        <ff-data-table
            data-el="members-table"
            :columns="columns"
            :rows="users"
            :show-search="true" search-placeholder="Search Team Members..."
            :search-fields="['name', 'username', 'role']"
            :collapsible-row="collapsibleRow"
        >
            <template v-if="hasPermission('team:user:invite')" #actions>
                <ff-button data-action="member-invite-button" :disabled="teamUserLimitReached" kind="primary" @click="inviteMember">
                    <template #icon-left><UserAddIcon class="w-4" /></template>
                    Invite Members
                </ff-button>
            </template>
            <template v-if="canEditUser" #context-menu="{row}">
                <ff-list-item
                    v-if="hasPermission('team:user:change-role')"
                    data-action="member-change-role"
                    label="Change Role" @click="changeRoleDialog(row)"
                />
                <ff-list-item
                    v-if="hasPermission('team:user:remove')"
                    data-action="member-remove-from-team"
                    label="Remove From Team"
                    kind="danger"
                    @click="removeUserDialog(row)"
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
import { UserAddIcon } from '@heroicons/vue/solid'
import { markRaw } from 'vue'
import { mapGetters, mapState } from 'vuex'

import teamApi from '../../../api/team.js'
import FeatureUnavailableToTeam from '../../../components/banners/FeatureUnavailableToTeam.vue'
import EditApplicationPermissionsDialog from '../../../components/dialogs/EditApplicationPermissionsDialog.vue'
import UserCell from '../../../components/tables/cells/UserCell.vue'
import UserRoleCell from '../../../components/tables/cells/UserRoleCell.vue'
import usePermissions from '../../../composables/Permissions.js'
import { getTeamProperty } from '../../../composables/TeamProperties.js'
import alerts from '../../../mixins/Alerts.js'
import { Roles } from '../../../utils/roles.js'
import ChangeTeamRoleDialog from '../dialogs/ChangeTeamRoleDialog.vue'
import ConfirmTeamUserRemoveDialog from '../dialogs/ConfirmTeamUserRemoveDialog.vue'
import InviteMemberDialog from '../dialogs/InviteMemberDialog.vue'

import ApplicationPermissionOverride from './components/ApplicationPermissionOverride.vue'

import ApplicationPermissionRow from './components/ApplicationPermissionsRow.vue'
export default {
    name: 'TeamUsersGeneral',
    components: {
        EditApplicationPermissionsDialog,
        ChangeTeamRoleDialog,
        ConfirmTeamUserRemoveDialog,
        FeatureUnavailableToTeam,
        UserAddIcon,
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
        ...mapState('account', ['user', 'team']),
        ...mapGetters('account', ['requiresBilling', 'featuresCheck']),
        canEditUser: function () {
            return this.hasPermission('team:user:remove') || this.hasPermission('team:user:change-role')
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
                    label: 'User',
                    key: 'name',
                    sortable: true,
                    class: ['flex-grow'],
                    component: { is: markRaw(UserCell) }
                },
                {
                    label: 'Role',
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
            if (
                !this.featuresCheck.isRBACApplicationFeatureEnabled ||
                !this.hasPermission('application:access-control')
            ) return null

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

                    if (this.users) {
                        this.users.forEach(u => {
                            if (u.role === Roles.Owner) {
                                this.ownerCount++
                            }
                        })
                    }
                })
                .catch(err => {
                    alerts.emit('Failed to fetch team members: ' + err.toString(), 'warning')
                })
                .finally(() => {
                    this.loading = false
                })
        },
        fetchApplications () {
            return teamApi.getTeamApplications(this.team.id)
                .then(response => {
                    this.applications = response.applications
                })
                .catch(err => {
                    alerts.emit('Failed to fetch applications: ' + err.toString(), 'warning')
                })
        },
        onApplicationRoleClick ({ application, user }) {
            this.$refs.editApplicationPermissionsDialog.show(user, application)
        }
    }
}
</script>
