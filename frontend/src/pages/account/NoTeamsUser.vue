<template>
    <div class="forge-block flex flex-col justify-center">
        <div class="sm:max-w-xl mx-auto w-full space-y-2">
            <div class="max-w-xs mx-auto w-full mb-4">
                <Logo/>
                <h2 class="mt-2 text-center text-3xl font-bold text-gray-900">
                    <span>FLOW</span><span class="font-light">FORGE</span>
                </h2>
            </div>
            <form class="px-4 sm:px-6 lg:px-8 mt-8 space-y-4 text-center">
                <p class="text-gray-700 text-lg mt-10 ">You need to be in a team to create projects.</p>
                <div class="grid grid-cols-1 gap-4"  :class="invitationCount > 0?'sm:grid-cols-2':'max-w-xs mx-auto'">
                    <router-link to="/team/create" class="forge-button-secondary p-4 sm:h-36 inline-flex sm:flex-col items-center sm:justify-center gap-4">
                        <UserGroupIcon class="w-10" />
                        Create a new team
                    </router-link>
                    <router-link to="/account/teams" v-if="invitationCount>0" class="forge-button-secondary p-4 sm:h-36 inline-flex sm:flex-col items-center sm:justify-center gap-4">
                        <InboxInIcon class="w-10" />
                        You have {{ invitationCount }} team {{ $filters.pluralize(invitationCount,"invitation")}}
                    </router-link>
                </div>
            </form>
        </div>
    </div>
</template>

<script>

import userApi from '@/api/user'
import Logo from "@/components/Logo"
import UserInviteTable from '@/pages/account/components/UserInviteTable'
import { InboxInIcon, UserGroupIcon } from '@heroicons/vue/outline'

export default {
    name: 'NoTeamsUser',
    components: {
        Logo,
        UserInviteTable,
        UserGroupIcon,
        InboxInIcon
    },
    data() {
        return {
            invitationCount: 0
        }
    },
    mounted() {
        this.fetchData()
    },
    methods: {
        async fetchData () {
            const invitations = await userApi.getTeamInvitations()
            this.invitationCount = invitations.count;
        }
    },
}
</script>
