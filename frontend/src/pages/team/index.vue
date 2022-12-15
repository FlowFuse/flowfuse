<template>
    <Teleport v-if="mounted" to="#platform-sidenav">
        <SideNavigationTeamOptions />
    </Teleport>
    <main>
        <template v-if="pendingTeamChange">
            <Loading />
        </template>
        <div v-else-if="team">
            <Teleport v-if="mounted" to="#platform-banner">
                <div v-if="isVisitingAdmin" class="ff-banner" data-el="banner-team-as-admin">You are viewing this team as an Administrator</div>
                <SubscriptionExpiredBanner :team="team" />
            </Teleport>
            <router-view :team="team" :teamMembership="teamMembership" />
        </div>
    </main>
</template>

<script>
import { Roles } from '@core/lib/roles'
import { useRoute } from 'vue-router'
import { mapState } from 'vuex'

import Loading from '@/components/Loading'
import SideNavigationTeamOptions from '@/components/SideNavigationTeamOptions.vue'
import SubscriptionExpiredBanner from '@/components/banners/SubscriptionExpired.vue'

export default {
    name: 'TeamPage',
    components: {
        Loading,
        SideNavigationTeamOptions,
        SubscriptionExpiredBanner
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
        isVisitingAdmin: function () {
            return (this.teamMembership.role === Roles.Admin)
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
                '/team/' + this.team.slug + '/settings/danger'
            ]
            if (allowedRoutes.indexOf(route.path) === -1) {
                // if we're on a path that requires billing
                await this.checkBilling()
            }
        },
        checkBilling: async function () {
            // Team Billing
            if (this.features.billing && !this.team.billingSetup) {
                this.$router.push({
                    path: `/team/${this.team.slug}/billing`
                })
            }
        }
    }
}
</script>
