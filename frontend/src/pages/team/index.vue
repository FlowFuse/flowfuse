<template>
    <Teleport v-if="canAccessTeam && mounted" to="#platform-sidenav">
        <SideNavigationTeamOptions />
    </Teleport>
    <div>
        <template v-if="pendingTeamChange">
            <Loading />
        </template>
        <div v-else-if="canAccessTeam && team">
            <Teleport v-if="mounted" to="#platform-banner">
                <div v-if="isVisitingAdmin" class="ff-banner" data-el="banner-team-as-admin">You are viewing this team as an Administrator</div>
                <SubscriptionExpiredBanner :team="team" />
                <TeamTrialBanner v-if="team.billing?.trial" :team="team" />
            </Teleport>
            <router-view />
        </div>
        <div v-else-if="!canAccessTeam">
            <EmptyState>
                <template #img>
                    <img src="../../images/empty-states/no-access_dashboard-only.png">
                </template>
                <template #header>No Access</template>
                <template #message>
                    <p>You have a dashboard-only role in this team.</p>
                    <p>
                        This means you can access the pages created by the Node-RED instances in this team, but
                        you cannot access their FlowFuse settings.
                    </p>
                </template>
            </EmptyState>
        </div>
    </div>
</template>

<script>
import { useRoute } from 'vue-router'
import { mapGetters, mapState } from 'vuex'

import { Roles } from '../../../../forge/lib/roles.js'

import EmptyState from '../../components/EmptyState.vue'
import Loading from '../../components/Loading.vue'
import SideNavigationTeamOptions from '../../components/SideNavigationTeamOptions.vue'
import SubscriptionExpiredBanner from '../../components/banners/SubscriptionExpired.vue'
import TeamTrialBanner from '../../components/banners/TeamTrial.vue'

export default {
    name: 'TeamPage',
    components: {
        EmptyState,
        Loading,
        SideNavigationTeamOptions,
        SubscriptionExpiredBanner,
        TeamTrialBanner
    },
    async beforeRouteUpdate (to, from, next) {
        await this.$store.dispatch('account/setTeam', to.params.team_slug)
        // even if billing is not yet enabled, users should be able to see these screens,
        // in order to delete the project, or setup billing
        await this.checkRoute(to)
        next()
    },
    data () {
        return {
            mounted: false
        }
    },
    computed: {
        ...mapState('account', ['user', 'team', 'teamMembership', 'pendingTeamChange', 'features']),
        ...mapGetters('account', ['noBilling']),
        isVisitingAdmin: function () {
            return (this.teamMembership.role === Roles.Admin)
        },
        isTrialEnded: function () {
            if (this.team.billing?.trialEndsAt) {
                const trialEndDate = new Date(this.team.billing?.trialEndsAt)
                return trialEndDate < Date.now()
            }
            return true
        },
        canAccessTeam: function () {
            return this.teamMembership?.role >= Roles.Viewer
        }
    },
    mounted () {
        this.mounted = true
    },
    async beforeMount () {
        await this.$store.dispatch('account/setTeam', useRoute().params.team_slug)
        this.checkRoute(this.$route)
    },
    methods: {
        checkRoute: async function (route) {
            const allowedRoutes = [
                '/team/' + this.team.slug + '/billing',
                '/team/' + this.team.slug + '/settings',
                '/team/' + this.team.slug + '/settings/general',
                '/team/' + this.team.slug + '/settings/danger',
                '/team/' + this.team.slug + '/settings/change-type'
            ]
            if (allowedRoutes.indexOf(route.path) === -1) {
                // if we're on a path that requires billing
                await this.checkBilling()
            }
        },
        checkBilling: async function () {
            // Team Billing
            if (this.noBilling) {
                this.$router.push({
                    path: `/team/${this.team.slug}/billing`
                })
            }
        }
    }
}
</script>
