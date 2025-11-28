<template>
    <main class="min-h-full">
        <template v-if="pending">
            <div class="grow flex flex-col items-center justify-center mx-auto text-gray-600 opacity-50">
                <FlowFuseLogo class="max-w-xs mx-auto w-full" />
            </div>
        </template>
        <ff-page v-else-if="teams.length === 0">
            <template v-if="canCreateTeam" #header>
                <ff-page-header title="Choose Team Type">
                    <template #context>
                        Choose which team type you'd like to get started with.
                    </template>
                </ff-page-header>
            </template>
            <TeamTypeSelection v-if="canCreateTeam" />
            <EmptyState v-else>
                <template #img>
                    <img src="../images/empty-states/team-instances.png">
                </template>
                <template #header>Team Creation is currently disabled</template>
                <template #message>
                    <p>You cannot create a team at the moment because this feature is disabled by an administrator.</p>
                    <p>
                        To join a team, you need to be invited by someone who is already a member.
                    </p>
                </template>
                <template #note>
                    <p>
                        Administrators can enable user team creation in the platform settings if needed.
                    </p>
                </template>
            </EmptyState>
        </ff-page>
    </main>
</template>

<script>

import { mapGetters, mapState } from 'vuex'

import EmptyState from '../components/EmptyState.vue'

import FlowFuseLogo from '../components/Logo.vue'

import TeamTypeSelection from '../components/TeamTypeSelection.vue'

export default {
    name: 'HomePage',
    components: {
        EmptyState,
        FlowFuseLogo,
        TeamTypeSelection
    },
    data () {
        return {
            projects: []
        }
    },
    computed: {
        ...mapState('account', ['pending', 'user', 'team', 'teams', 'redirectUrlAfterLogin', 'settings']),
        ...mapGetters('account', ['defaultUserTeam']),
        canCreateTeam () {
            if (this.user.admin) return true
            return Object.prototype.hasOwnProperty.call(this.settings, 'team:create') && this.settings['team:create'] === true
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
