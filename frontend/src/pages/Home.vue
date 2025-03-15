<template>
    <main class="min-h-full">
        <template v-if="pending">
            <div class="flex-grow flex flex-col items-center justify-center mx-auto text-gray-600 opacity-50">
                <FlowFuseLogo class="max-w-xs mx-auto w-full" />
            </div>
        </template>
        <ff-page v-else-if="teams.length === 0">
            <template #header>
                <ff-page-header title="Choose Team Type">
                    <template #context>
                        Choose which team type you'd like to get started with.
                    </template>
                </ff-page-header>
            </template>
            <TeamTypeSelection />
        </ff-page>
    </main>
</template>

<script>

import { mapGetters, mapState } from 'vuex'

import FlowFuseLogo from '../components/Logo.vue'

import TeamTypeSelection from '../components/TeamTypeSelection.vue'

export default {
    name: 'HomePage',
    components: {
        FlowFuseLogo,
        TeamTypeSelection
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
