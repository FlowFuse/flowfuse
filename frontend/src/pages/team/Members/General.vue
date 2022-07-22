<template>
    <ff-loading v-if="loading" message="Loading Team..." />
    <form v-else class="space-y-6 mb-8">
        <div class="text-right"></div>
        <ff-data-table :columns="userColumns" :rows="users" :show-search="true" search-placeholder="Search Team Members..." :search-fields="['name', 'username', 'role']">
            <template v-slot:actions>
                <ff-button kind="secondary" @click="inviteMember">
                    <template v-slot:icon-left><PlusSmIcon class="w-4" /></template>
                    Add member
                </ff-button>
            </template>
            <template v-slot:context-menu>
                <ff-list-item label="Change Role" @click="changeRoleDialog" />
                <ff-list-item label="Remove From Team" kind="danger" @click="removeUserDialog" />
            </template>
        </ff-data-table>
    </form>

    <ChangeTeamRoleDialog @roleUpdated="roleUpdated" ref="changeTeamRoleDialog" />
    <ConfirmTeamUserRemoveDialog @userRemoved="userRemoved" ref="confirmTeamUserRemoveDialog" />
    <InviteMemberDialog @invitationSent="$emit('invites-updated')" :team="team" v-if="canModifyMembers" ref="inviteMemberDialog" />
</template>

<script>
import { markRaw } from 'vue'

import UserCell from '@/components/tables/cells/UserCell'
import UserRoleCell from '@/components/tables/cells/UserRoleCell'
import ChangeTeamRoleDialog from '../dialogs/ChangeTeamRoleDialog'
import ConfirmTeamUserRemoveDialog from '../dialogs/ConfirmTeamUserRemoveDialog'
import InviteMemberDialog from '../dialogs/InviteMemberDialog'

import teamApi from '@/api/team'
import { PlusSmIcon } from '@heroicons/vue/outline'
import { Roles } from '@core/lib/roles'

export default {
    name: 'TeamUsersGeneral',
    emits: ['invites-updated'],
    data () {
        return {
            loading: false,
            users: [],
            userCount: 0,
            userColumns: [],
            ownerCount: 0,
            canModifyMembers: false
        }
    },
    watch: {
        team: 'fetchData'
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
            if (user.id === this.$store.state.account.user.id) {
                console.log('SELF REMOVAL')
            }
            this.fetchData()
        },
        async fetchData () {
            this.loading = true
            const members = await teamApi.getTeamMembers(this.team.id)
            this.userCount = members.count
            this.users = members.members
            this.ownerCount = 0

            const currentUser = this.users.find(user => user.username === this.$store.state.account.user.username)
            this.canModifyMembers = this.$store.state.account.user.admin || (currentUser && (currentUser.role === Roles.Owner))

            this.userColumns = [
                { label: 'User', key: 'name', sortable: true, class: ['flex-grow'], component: { is: markRaw(UserCell) } },
                { label: 'Role', key: 'role', sortable: true, class: ['w-40'], component: { is: markRaw(UserRoleCell) } }
            ]

            if (this.canModifyMembers) {
                if (this.users) {
                    this.users.forEach(u => {
                        if (u.role === Roles.Owner) {
                            this.ownerCount++
                        }
                    })
                }
            }
            this.loading = false
        }
    },
    props: ['team', 'teamMembership'],
    components: {
        ChangeTeamRoleDialog,
        ConfirmTeamUserRemoveDialog,
        PlusSmIcon,
        InviteMemberDialog
    }
}
</script>
