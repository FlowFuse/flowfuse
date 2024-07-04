<template>
    <main>
        <template v-if="pending">
            <div class="flex-grow flex flex-col items-center justify-center mx-auto text-gray-600 opacity-50">
                <FlowFuseLogo class="max-w-xs mx-auto w-full" />
            </div>
        </template>
        <template v-else-if="teams.length === 0">
            <NoTeamsUser />
        </template>
    </main>
</template>

<script>

import { mapGetters, mapState } from 'vuex'

import FlowFuseLogo from '../components/Logo.vue'

import NoTeamsUser from './account/NoTeamsUser.vue'

export default {
    name: 'HomePage',
    components: {
        FlowFuseLogo,
        NoTeamsUser
    },
    data () {
        return {
            projects: []
        }
    },
    computed: {
        ...mapState('account', ['pending', 'user', 'team', 'teams', 'redirectUrlAfterLogin']),
        ...mapGetters('account', ['defaultUserTeam'])
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
            if (this.redirectUrlAfterLogin) {
                return this.$router.push(this.redirectUrlAfterLogin)
            }

            // Only bounce to team view if there's no redirectUrlAfterLogin set
            if (this.user.email_verified) {
                if (this.team || this.defaultUserTeam) {
                    this.$router.push({
                        name: 'Team',
                        params: {
                            team_slug: this.team?.slug || this.defaultUserTeam?.slug
                        }
                    })
                }
            }
        }
    }
}
</script>
