<template>
    <FormHeading>
        Team Members
        <template v-slot:tools v-if="canModifyMembers">
            <ff-button kind="secondary" size="small" @click="inviteMember">
                <template v-slot:icon-left><PlusSmIcon class="w-4" /></template>
                Add member
            </ff-button>
        </template>
    </FormHeading>
    <ff-loading v-if="loading" message="Loading Team..." />
    <form v-else class="space-y-6 mb-8">
        <div class="text-right"></div>
        <ItemTable :items="users" :columns="userColumns" />
    </form>

    <ChangeTeamRoleDialog @roleUpdated="roleUpdated" ref="changeTeamRoleDialog" />
    <ConfirmTeamUserRemoveDialog @userRemoved="userRemoved" ref="confirmTeamUserRemoveDialog" />
    <InviteMemberDialog :team="team" v-if="canModifyMembers" ref="inviteMemberDialog" />
</template>

<script>
import { markRaw } from 'vue'

import FormHeading from '@/components/FormHeading'
import ItemTable from '@/components/tables/ItemTable'
import UserCell from '@/components/tables/cells/UserCell'
import UserRoleCell from '@/components/tables/cells/UserRoleCell'
import TeamUserEditButton from '../components/TeamUserEditButton'
import ChangeTeamRoleDialog from '../dialogs/ChangeTeamRoleDialog'
import ConfirmTeamUserRemoveDialog from '../dialogs/ConfirmTeamUserRemoveDialog'
import InviteMemberDialog from '../dialogs/InviteMemberDialog'

import teamApi from '@/api/team'
import { PlusSmIcon } from '@heroicons/vue/outline'
import { Roles } from '@core/lib/roles'

export default {
    name: 'TeamUsersGeneral',
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
        handleUserAction (user, action) {
            if (action === 'changerole') {
                this.$refs.changeTeamRoleDialog.show(this.team, user, this.ownerCount)
            } else {
                this.$refs.confirmTeamUserRemoveDialog.show(this.team, user, this.ownerCount)
            }
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
                { name: 'User', class: ['flex-grow'], component: { is: markRaw(UserCell) } },
                { name: 'Role', class: ['w-40'], component: { is: markRaw(UserRoleCell) } }
            ]

            if (this.canModifyMembers) {
                if (this.users) {
                    this.users.forEach(u => {
                        if (u.role === Roles.Owner) {
                            this.ownerCount++
                        }
                        u.onselect = (action) => { this.handleUserAction(u, action) }
                    })
                    this.userColumns.push({ name: '', class: ['w-16'], component: { is: markRaw(TeamUserEditButton) } })
                }
            }
            this.loading = false
        }
    },
    props: ['team', 'teamMembership'],
    components: {
        ItemTable,
        FormHeading,
        ChangeTeamRoleDialog,
        ConfirmTeamUserRemoveDialog,
        PlusSmIcon,
        InviteMemberDialog
    }
}
</script>
