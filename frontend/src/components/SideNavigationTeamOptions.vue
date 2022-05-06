<template>
    <div v-if="team">
        <ff-team-selection></ff-team-selection>
        <!-- Team Options: General -->
        <ul class="ff-side-navigation--options">
            <router-link v-for="route in routes.general" :key="route.label"
                         :to="'/team/' + team.slug + route.to" @click="$emit('option-selected')">
                <nav-item :label="route.label" :icon="route.icon"></nav-item>
            </router-link>
        </ul>
        <span v-if="showAdmin" class="ff-navigation-divider">Team Admin Zone</span>
        <!-- Team Options: Admin -->
        <ul v-if="showAdmin" class="ff-side-navigation--admin">
            <router-link v-for="route in routes.admin" :key="route.label" :to="'/team/' + team.slug + route.to">
                <nav-item :icon="route.icon" :label="route.label"></nav-item>
            </router-link>
        </ul>
    </div>
</template>

<script>
import { mapState } from 'vuex'

import { Roles } from '@core/lib/roles'

import { CollectionIcon, UsersIcon, DatabaseIcon, CurrencyDollarIcon, CogIcon } from '@heroicons/vue/solid'
import NavItem from '@/components/NavItem'
import SideTeamSelection from '@/components/SideTeamSelection'

export default {
    name: 'FFSideNavigationTeamOptions',
    props: ['mobile-menu-open'],
    emits: ['option-selected'],
    components: {
        NavItem,
        'ff-team-selection': SideTeamSelection
    },
    computed: {
        ...mapState('account', ['user', 'team', 'teamMembership', 'features']),
        showAdmin: function () {
            return this.teamMembership.role === Roles.Admin || this.teamMembership.role === Roles.Owner
        }
    },
    data () {
        const routes = {
            general: [{
                label: 'Overview',
                to: '/overview',
                icon: CollectionIcon
            }, {
                label: 'Projects',
                to: '/projects',
                icon: CollectionIcon
            }, {
                label: 'Members',
                to: '/members',
                icon: UsersIcon
            }],
            admin: [{
                label: 'Audit Log',
                to: '/audit-log',
                icon: DatabaseIcon
            }, {
                label: 'Team Settings',
                to: '/settings',
                icon: CogIcon
            }]
        }

        return {
            routes: routes
        }
    },
    mounted () {
        this.checkFeatures()
    },
    methods: {
        checkFeatures () {
            if (this.features.billing) {
                // insert billing in second slot of admin
                this.routes.admin.splice(1, 0, {
                    label: 'Billing',
                    to: '/billing',
                    icon: CurrencyDollarIcon
                })
            }
        }
    }
}
</script>
