<template>
    <form class="py-8 text-center">
        <p class="text-gray-700 text-lg">You need to be in a team to create projects.</p>
        <p v-if="invitationCount === 0 && !user.admin && !settings['team:create']" class="text-gray-700 text-lg mt-10 ">Ask an Admin or Team Owner to add you to a team.</p>
        <div class="pt-4 justify-center flex gap-5" :class="invitationCount > 0?'sm:grid-cols-2':'max-w-xs mx-auto'">
            <router-link v-if="user.admin || settings['team:create']" to="/team/create" class="forge-button-secondary p-4 sm:h-36 inline-flex sm:flex-col items-center sm:justify-center gap-4">
                <UserGroupIcon class="w-10" />
                Create a new team
            </router-link>
            <router-link v-if="invitationCount>0" data-nav="team-invites" to="/account/teams/invitations" class="forge-button-secondary p-4 sm:h-36 inline-flex sm:flex-col items-center sm:justify-center gap-4">
                <InboxInIcon class="w-10" />
                You have {{ invitationCount }} team {{ $filters.pluralize(invitationCount,"invitation") }}
            </router-link>
        </div>
    </form>
</template>

<script>

import { InboxInIcon, UserGroupIcon } from '@heroicons/vue/outline'
import { mapGetters, mapState } from 'vuex'

export default {
    name: 'NoTeamsUser',
    components: {
        UserGroupIcon,
        InboxInIcon
    },
    computed: {
        ...mapState('account', ['settings', 'user']),
        ...mapGetters('account', {
            invitationCount: 'teamInvitationsCount'
        })
    },
    mounted () {
        this.fetchData()
    },
    methods: {
        async fetchData () {
            await this.$store.dispatch('account/getInvitations')
        }
    }
}
</script>
