<template>
    <template v-if="canAccessTeam && team">
        <Teleport v-if="mounted" to="#platform-banner">
            <div v-if="isVisitingAdmin" class="ff-banner" data-el="banner-team-as-admin">You are viewing this team as an Administrator</div>
            <TeamSuspendedBanner v-if="team.suspended" :team="team" />
            <SubscriptionExpiredBanner v-else :team="team" />
            <TeamTrialBanner v-if="team.billing?.trial" :team="team" />
        </Teleport>
        <router-view :key="team.id" />
    </template>
    <template v-else-if="!canAccessTeam">
        <TeamInstances :dashboard-role-only="true" />
    </template>
</template>

<script>
import { mapGetters, mapState } from 'vuex'

import SubscriptionExpiredBanner from '../../components/banners/SubscriptionExpired.vue'
import TeamSuspendedBanner from '../../components/banners/TeamSuspended.vue'
import TeamTrialBanner from '../../components/banners/TeamTrial.vue'
import { Roles } from '../../utils/roles.js'

import TeamInstances from './Instances.vue'

export default {
    name: 'TeamPage',
    components: {
        TeamInstances,
        SubscriptionExpiredBanner,
        TeamSuspendedBanner,
        TeamTrialBanner
    },
    async beforeRouteUpdate (to, from, next) {
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
        ...mapGetters('account', ['requiresBilling', 'isAdminUser']),
        ...mapState('ux/tours', ['shouldPresentTour']),
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
            return this.isAdminUser || this.teamMembership?.role >= Roles.Viewer
        }
    },
    watch: {
        '$route.params.team_slug' (slug) {
            this.$store.dispatch('account/setTeam', slug)
        },
        team () {
            this.checkRoute(this.$route)
        },
        shouldPresentTour: {
            handler (should) {
                if (should) {
                    this.dispatchTour()
                }
            }
        }
    },
    mounted () {
        this.mounted = true

        if (this.shouldPresentTour) {
            // given we've loaded resources, check for tour status
            this.dispatchTour()
        }
    },
    async beforeMount () {
        this.checkRoute(this.$route)
    },
    methods: {
        checkRoute: async function (route) {
            const allowedRoutes = []

            if (this.team) {
                allowedRoutes.push('/team/' + this.team.slug + '/billing')
                allowedRoutes.push('/team/' + this.team.slug + '/settings')
                allowedRoutes.push('/team/' + this.team.slug + '/settings/general')
                allowedRoutes.push('/team/' + this.team.slug + '/settings/danger')
                allowedRoutes.push('/team/' + this.team.slug + '/settings/change-type')

                if (allowedRoutes.indexOf(route.path) === -1) {
                    // if we're on a path that requires billing
                    await this.checkBilling()
                }
            }
        },
        checkBilling: async function () {
            // Team Billing
            if (this.requiresBilling) {
                this.$router.push({
                    path: `/team/${this.team.slug}/billing`
                })
            }
        },
        dispatchTour () {
            return this.$store.dispatch(
                'ux/tours/setWelcomeTour',
                () => this.$store.dispatch('ux/tours/openModal', 'education')
            )
                .catch(e => e)
        }
    }
}
</script>
