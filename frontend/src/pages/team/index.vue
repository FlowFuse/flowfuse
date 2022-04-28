<template>
    <template v-if="pendingTeamChange">
        <Loading />
    </template>
    <div class="forge-block" v-else-if="team">
        <div class="">
            <router-view :team="team" :teamMembership="teamMembership"></router-view>
        </div>
    </div>
</template>

<script>
import billingApi from '@/api/billing'

import Breadcrumbs from '@/mixins/Breadcrumbs'

import Loading from '@/components/Loading'
import { useRoute } from 'vue-router'
import { mapState } from 'vuex'

export default {
    name: 'TeamPage',
    mixins: [Breadcrumbs],
    computed: {
        ...mapState('account', ['user', 'team', 'teamMembership', 'pendingTeamChange']),
        ...mapState(['features'])
    },
    components: {
        Loading
    },
    methods: {
        checkRoute: async function (route) {
            const allowedRoutes = [
                '/team/' + this.team.slug + '/settings/billing',
                '/team/' + this.team.slug + '/settings/danger'
            ]
            if (allowedRoutes.indexOf(route.path) === -1) {
                // if we're on a path that requires billing
                await this.checkBilling()
            }
        },
        checkBilling: async function () {
            // Team Billing
            if (this.features.billing) {
                try {
                    await billingApi.getSubscriptionInfo(this.team.id)
                } catch (err) {
                    const path = '/team/' + this.team.slug + '/settings/billing'
                    // if 404 - no billing setup, but are we running in EE?
                    if (err.response.status === 404) {
                        this.$router.push({
                            path
                        })
                    }
                }
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
