<template>
    <template v-if="pending">
        <div class="flex-grow flex flex-col items-center justify-center mx-auto text-gray-600 opacity-50">
            <FlowForgeLogo class="max-w-xs mx-auto w-full"/>
        </div>
    </template>
    <template v-if="!user.email_verified">
        <NoVerifiedEmail/>
    </template>
    <template v-else-if="teams.length === 0">
        <NoTeamsUser/>
    </template>
</template>

<script>

import { mapState } from 'vuex'
import FlowForgeLogo from '@/components/Logo'
import NoTeamsUser from './account/NoTeamsUser'
import NoVerifiedEmail from './account/NoVerifiedEmail'
import Breadcrumbs from '@/mixins/Breadcrumbs'

export default {
    name: 'Home',
    mixins: [Breadcrumbs],
    computed: {
        ...mapState('account', ['pending', 'user', 'team', 'teams'])
    },
    data () {
        return {
            projects: []
        }
    },
    watch: {
        team: 'redirectOnLoad',
        teams: 'redirectOnLoad'
    },
    created () {
        this.clearBreadcrumbs()
        this.redirectOnLoad()
    },
    methods: {
        redirectOnLoad () {
            if (this.user.email_verified) {
                if (this.team) {
                    this.$router.push({
                        name: 'Team',
                        params: {
                            team_slug: this.team.slug
                        }
                    })
                } else if (this.teams && this.teams.length > 0) {
                    this.$store.dispatch('account/setTeam', this.teams[0])
                    this.$router.push({
                        name: 'Team',
                        params: {
                            team_slug: this.teams[0].slug
                        }
                    })
                }
            }
        }
    },
    components: {
        FlowForgeLogo,
        NoTeamsUser,
        NoVerifiedEmail
    }
}
</script>
