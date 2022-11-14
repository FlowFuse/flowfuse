<template>
    <form class="px-4 sm:px-6 lg:px-8 mt-4 space-y-4 text-center">
        <p class="text-gray-700 text-lg">You need to be in a team to create projects.</p>
        <p v-if="invitationCount === 0 && !user.admin && !settings['team:create']" class="text-gray-700 text-lg mt-10 ">Ask an Admin or Team Owner to add you to a team.</p>
        <div class="flex justify-center"  :class="invitationCount > 0?'sm:grid-cols-2':'max-w-xs mx-auto'">
            <router-link v-if="user.admin || settings['team:create']" to="/team/create" class="forge-button-secondary p-4 sm:h-36 inline-flex sm:flex-col items-center sm:justify-center gap-4">
                <UserGroupIcon class="w-10" />
                Create a new team
            </router-link>
            <router-link v-if="invitationCount>0" data-nav="team-invites" to="/account/teams/invitations" class="forge-button-secondary p-4 sm:h-36 inline-flex sm:flex-col items-center sm:justify-center gap-4">
                <InboxInIcon class="w-10" />
                You have {{ invitationCount }} team {{ $filters.pluralize(invitationCount,"invitation")}}
            </router-link>
        </div>
    </form>
</template>

<script>

import userApi from '@/api/user'
import { mapState } from 'vuex'
import { InboxInIcon, UserGroupIcon } from '@heroicons/vue/outline'

export default {
    name: 'NoTeamsUser',
    components: {
        UserGroupIcon,
        InboxInIcon
    },
    computed: {
        ...mapState('account', ['settings', 'user'])
    },
    data () {
        return {
            invitationCount: 0
        }
    },
    mounted () {
        this.fetchData()
    },
    methods: {
        async fetchData () {
            const invitations = await userApi.getTeamInvitations()
            this.invitationCount = invitations.count
        }
    }
}
</script>
