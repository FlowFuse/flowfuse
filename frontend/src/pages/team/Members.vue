<template>
    <FormHeading>
        Team Members
        <template v-slot:tools v-if="isOwner">
            <button type="button" class="forge-button-secondary pl-2 pl-1" @click="inviteMember"><PlusSmIcon class="w-4" /><span class="text-xs">Add member</span></button>
        </template>
    </FormHeading>
    <form class="space-y-6 mb-8">
        <div class="text-right"></div>
        <ItemTable :items="users" :columns="userColumns" />
    </form>

    <MemberInviteTable :team="team" v-if="isOwner" ref="memberInviteTable"/>

    <ChangeTeamRoleDialog @roleUpdated="roleUpdated" ref="changeTeamRoleDialog" />
    <ConfirmTeamUserRemoveDialog @userRemoved="userRemoved" ref="confirmTeamUserRemoveDialog" />
    <InviteMemberDialog @invitationSent="invitationSent" :team="team" v-if="isOwner" ref="inviteMemberDialog" />
</template>

<script>
import FormHeading from '@/components/FormHeading'
import ItemTable from '@/components/tables/ItemTable'
import Breadcrumbs from '@/mixins/Breadcrumbs'
import UserCell from '@/components/tables/cells/UserCell'
import TeamUserEditButton from './components/TeamUserEditButton'
import { markRaw } from "vue"
import ChangeTeamRoleDialog from './dialogs/ChangeTeamRoleDialog'
import ConfirmTeamUserRemoveDialog from './dialogs/ConfirmTeamUserRemoveDialog'
import teamApi from '@/api/team'
import { PlusSmIcon, UsersIcon, ChevronRightIcon } from '@heroicons/vue/outline'
import MemberInviteTable from './components/MemberInviteTable'
import InviteMemberDialog from './dialogs/InviteMemberDialog'

export default {
    name: 'TeamUsers',
    data() {
        return {
            users: [],
            userCount: 0,
            userColumns: [],
            ownerCount: 0,
            isOwner: false,
        }
    },
    watch: {
         team: 'fetchData'
    },
    mounted() {
        this.fetchData()
    },
    methods: {
        inviteMember() {
            this.$refs.inviteMemberDialog.show()
        },
        invitationSent() {
            this.$refs.memberInviteTable.fetchData()
        },
        handleUserAction(user,action) {
            if (action === "changerole") {
                this.$refs.changeTeamRoleDialog.show(this.team, user, this.ownerCount);
            } else {
                this.$refs.confirmTeamUserRemoveDialog.show(this.team, user, this.ownerCount);
            }
        },
        roleUpdated(user) {
            this.fetchData();
        },
        userRemoved(user) {
            if (user.id === this.$store.state.account.user.id) {
                console.log("SELF REMOVAL")
            }
            this.fetchData();
        },
        async fetchData () {
            const members = await teamApi.getTeamMembers(this.team.id)
            this.userCount = members.count;
            this.users = members.members;
            this.ownerCount = 0;

            const currentUser = this.users.find(user => user.username === this.$store.state.account.user.username )
            this.isOwner = currentUser && currentUser.role === 'owner';

            this.userColumns = [
                {name: 'User', class:['flex-grow'], component: { is: markRaw(UserCell) }},
                {name: 'Role',class: ['w-40'], property: 'role'}
            ]

            if (this.isOwner) {
                if (this.users) {
                    this.users.forEach(u => {
                        if (u.role === 'owner') {
                            this.ownerCount++;
                        }
                        u.onselect = (action) => { this.handleUserAction(u,action)}
                    })
                    this.userColumns.push({name: '', class: ['w-16'], component: { is: markRaw(TeamUserEditButton)}})
                }
            }
        }
    },
    props:[ "team" ],
    components: {
        ItemTable,
        FormHeading,
        ChangeTeamRoleDialog,
        ConfirmTeamUserRemoveDialog,
        PlusSmIcon,
        MemberInviteTable,
        InviteMemberDialog
    }
}
</script>
