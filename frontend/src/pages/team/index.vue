<template>
    <template v-if="pendingTeamChange">
        <Loading />
    </template>
    <div class="forge-block" v-else-if="team">
        <SectionTopMenu :options="navigation">
            <template v-slot:hero>
                <router-link :to="navigation[0]?navigation[0].path:''" class="flex items-center">
                    <div class="mr-3 rounded"><img :src="team.avatar" class="h-6 v-6 rounded-md"/></div>
                    <div class="text-gray-800 text-xl font-bold">{{ team.name }}</div>
                </router-link>
            </template>
        </SectionTopMenu>
        <div class="">
            <router-view :team="team" :teamMembership="teamMembership"></router-view>
        </div>
    </div>
</template>

<script>
import billingApi from '@/api/billing'

import Breadcrumbs from '@/mixins/Breadcrumbs'

import SectionTopMenu from '@/components/SectionTopMenu'
import Loading from '@/components/Loading'
import { useRoute } from 'vue-router'
import { mapState } from 'vuex'
import { Roles } from '@core/lib/roles'

export default {
    name: 'TeamPage',
    mixins: [Breadcrumbs],
    computed: {
        ...mapState('account', ['user', 'team', 'teamMembership', 'pendingTeamChange']),
        ...mapState(['features'])
    },
    data: function () {
        return {
            navigation: []
        }
    },
    components: {
        SectionTopMenu,
        Loading
    },
    methods: {
        updateTeam: function (newVal, oldVal) {
            if (this.team && this.teamMembership) {
                this.navigation = [
                    { name: 'Overview', path: `/team/${this.team.slug}/overview` },
                    { name: 'Projects', path: `/team/${this.team.slug}/projects` },
                    { name: 'Members', path: `/team/${this.team.slug}/members` }
                ]
                // const teamUser = this.team.users.filter(u => { console.log(u,this.$store.state.account.user.email); return  u.email === this.$store.state.account.user.email })
                // if (teamUser.role === Roles.Owner) {
                if (this.teamMembership.role === Roles.Owner) {
                    this.navigation.push({ name: 'Audit Log', path: `/team/${this.team.slug}/audit-log` })
                    this.navigation.push({ name: 'Settings', path: `/team/${this.team.slug}/settings` })
                }
                // }
                this.setBreadcrumbs([
                    { type: 'TeamPicker' }
                    // { type: "CreateProject" }
                ])
            }
        },
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
    },
    mounted () {
        this.updateTeam()
    },
    watch: {
        team: 'updateTeam',
        teamMembership: 'updateTeam'
    }
}
</script>
