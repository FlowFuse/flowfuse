<template>
    <Teleport v-if="mounted" to="#platform-sidenav">
        <SideNavigationTeamOptions/>
    </Teleport>
    <main>
        <template v-if="pendingTeamChange">
            <Loading />
        </template>
        <div v-else-if="team">
            <Teleport v-if="mounted && isVisitingAdmin" to="#platform-banner">
                <div class="ff-banner" data-el="banner-team-as-admin">You are viewing this team as an Administrator</div>
            </Teleport>
            <router-view :team="team" :teamMembership="teamMembership"></router-view>
        </div>
    </main>
</template>

<script>
import Loading from '@/components/Loading'
import { useRoute } from 'vue-router'
import { mapState } from 'vuex'
import { Roles } from '@core/lib/roles'

import SideNavigationTeamOptions from '@/components/SideNavigationTeamOptions.vue'

export default {
    name: 'TeamPage',
    computed: {
        ...mapState('account', ['user', 'team', 'teamMembership', 'pendingTeamChange', 'features']),
        isVisitingAdmin: function () {
            return (this.teamMembership.role === Roles.Admin)
        }
    },
    components: {
        Loading,
        SideNavigationTeamOptions
    },
    data () {
        return {
            mounted: false
        }
    },
    mounted () {
        this.mounted = true
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
    },
    async beforeMount () {
        await this.$store.dispatch('account/setTeam', useRoute().params.team_slug)
        this.checkRoute(this.$route)
    },
    async beforeRouteUpdate (to, from, next) {
        await this.$store.dispatch('account/setTeam', to.params.team_slug)
        // even if billing is not yet enabled, users should be able to see these screens,
        // in order to delete the project, or setup billing
        await this.checkRoute(to)
        next()
    }
}
</script>
