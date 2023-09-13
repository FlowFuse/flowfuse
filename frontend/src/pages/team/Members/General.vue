<template>
    <ff-loading v-if="loading" message="Loading Team..." />
    <form v-else class="mb-8">
        <div class="text-right"></div>
        <ff-data-table data-el="members-table" :columns="userColumns" :rows="users" :show-search="true" search-placeholder="Search Team Members..." :search-fields="['name', 'username', 'role']">
            <template v-if="hasPermission('team:user:invite')" #actions>
                <ff-button data-action="member-invite-button" kind="primary" @click="inviteMember">
                    <template #icon-left><PlusSmIcon class="w-4" /></template>
                    Invite Member
                </ff-button>
            </template>
            <template v-if="canEditUser" #context-menu="{row}">
                <ff-list-item v-if="hasPermission('team:user:change-role')" data-action="member-change-role" label="Change Role" @click="changeRoleDialog(row)" />
                <ff-list-item v-if="hasPermission('team:user:remove')" data-action="member-remove-from-team" label="Remove From Team" kind="danger" @click="removeUserDialog(row)" />
            </template>
        </ff-data-table>
    </form>

    <ChangeTeamRoleDialog ref="changeTeamRoleDialog" @role-updated="roleUpdated" />
    <ConfirmTeamUserRemoveDialog ref="confirmTeamUserRemoveDialog" @user-removed="userRemoved" />
    <InviteMemberDialog v-if="hasPermission('team:user:invite')" ref="inviteMemberDialog" :team="team" :inviteCount="inviteCount" :userCount="userCount" @invitation-sent="$emit('invites-updated')" />
</template>

<script>
import { PlusSmIcon } from '@heroicons/vue/outline'
import { markRaw } from 'vue'
import { mapState } from 'vuex'

import { Roles } from '../../../../../forge/lib/roles.js'
import teamApi from '../../../api/team.js'
import UserCell from '../../../components/tables/cells/UserCell.vue'
import UserRoleCell from '../../../components/tables/cells/UserRoleCell.vue'
import permissionsMixin from '../../../mixins/Permissions.js'
import ChangeTeamRoleDialog from '../dialogs/ChangeTeamRoleDialog.vue'
import ConfirmTeamUserRemoveDialog from '../dialogs/ConfirmTeamUserRemoveDialog.vue'
import InviteMemberDialog from '../dialogs/InviteMemberDialog.vue'

export default {
    name: 'TeamUsersGeneral',
    props: ['team', 'teamMembership', 'inviteCount'],
    emits: ['invites-updated'],
    mixins: [permissionsMixin],
    data () {
        return {
            loading: false,
            users: [],
            userCount: 0,
            userColumns: [],
            ownerCount: 0
        }
    },
    watch: {
        team: 'fetchData'
    },
    computed: {
        ...mapState('account', ['user']),
        canEditUser: function () {
            return this.hasPermission('team:user:remove') || this.hasPermission('team:user:change-role')
        }
    },
    mounted () {
        this.fetchData()
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
            this.fetchData()
        },
        userRemoved (user) {
            this.fetchData()
        },
        async fetchData () {
            this.loading = true
            const members = await teamApi.getTeamMembers(this.team.id)
            this.userCount = members.count
            this.users = members.members
            this.ownerCount = 0

            this.userColumns = [
                { label: 'User', key: 'name', sortable: true, class: ['flex-grow'], component: { is: markRaw(UserCell) } },
                { label: 'Role', key: 'role', sortable: true, class: ['w-40'], component: { is: markRaw(UserRoleCell) } }
            ]
            if (this.users) {
                this.users.forEach(u => {
                    if (u.role === Roles.Owner) {
                        this.ownerCount++
                    }
                })
            }
            this.loading = false
        }
    },
    components: {
        ChangeTeamRoleDialog,
        ConfirmTeamUserRemoveDialog,
        PlusSmIcon,
        InviteMemberDialog
    }
}
</script>
