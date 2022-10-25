<template>
    <main>
        <template v-if="pending">
            <div class="flex-grow flex flex-col items-center justify-center mx-auto text-gray-600 opacity-50">
                <FlowForgeLogo class="max-w-xs mx-auto w-full"/>
            </div>
        </template>
        <template v-else-if="teams.length === 0">
            <NoTeamsUser/>
        </template>
    </main>
</template>

<script>

import { mapState } from 'vuex'
import FlowForgeLogo from '@/components/Logo'
import NoTeamsUser from './account/NoTeamsUser'

export default {
    name: 'HomePage',
    computed: {
        ...mapState('account', ['pending', 'user', 'team', 'teams', 'redirectUrlAfterLogin'])
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
        this.redirectOnLoad()
    },
    methods: {
        redirectOnLoad () {
            // Only bounce to team view if there's no redirectUrlAfterLogin set
            if (!this.redirectUrlAfterLogin && this.user.email_verified) {
                if (this.team) {
                    this.$router.push({
                        name: 'Team',
                        params: {
                            team_slug: this.team.slug
                        }
                    })
                }
            }
        }
    },
    components: {
        FlowForgeLogo,
        NoTeamsUser
    }
}
</script>
