<template>
    <div>
        <FormHeading>
            Pending Invitations
        </FormHeading>
        <form class="space-y-6">
            <div class="text-right"></div>
            <ItemTable :items="invitations" :columns="inviteColumns" />
        </form>
    </div>
</template>

<script>
import adminApi from '@/api/admin'
import { markRaw } from "vue"
import FormHeading from '@/components/FormHeading'
import ItemTable from '@/components/tables/ItemTable'
import InviteUserCell from '@/components/tables/cells/InviteUserCell'
import { TrashIcon } from '@heroicons/vue/outline'
import { useRoute, useRouter } from 'vue-router';

const MemberInviteRemoveButton = {
    template: `<button type="button" class="forge-button-inline px-2 py-2" @click="removeInvite"><TrashIcon class="w-5" /></button>`,
    props: ['id','team','onremove'],
    components: {
        TrashIcon
    },
    methods: {
        async removeInvite() {
            await this.onremove(this.team.id, this.id)
        }
    }
}

export default {
    name: 'UserInviteTable',
    data() {
        return {
            invitations: [],
            inviteColumns: [
                {name: 'User', component: { is: markRaw(InviteUserCell) }, property: 'invitee'},
                {name: 'Team', property:'teamName'},
                {name: 'Invited By',property:'invitor', component: { is: markRaw(InviteUserCell) }},
                {name: 'Expires In', property: 'expires'},
                {name: '', class: ['w-16'], component: {is: markRaw(MemberInviteRemoveButton) } }
            ]
        }
    },
    mounted() {
        this.fetchData()
    },
    methods: {
        async removeInvite(teamId, inviteId) {
            // await adminApi.removeTeamInvitation(teamId, inviteId)
            // await this.fetchData();
        },
        async fetchData () {
            const invitations = await adminApi.getInvitations()
            this.invitations = invitations.invitations.map(invite => {
                invite.teamName = invite.team.name;
                invite.onremove = (teamId, inviteId) => { this.removeInvite(teamId,inviteId) }
                return invite;
            })
        }
    },
    components: {
        FormHeading,
        ItemTable
    }
}

</script>
