<template>
    <div class="ff-side-navigation">
        <div class="ff-team-selection">
            <div>
                <img :src="team.avatar" class="ff-avatar"/>
                <div class="ff-team-selection-name">
                    <label>TEAM:</label>
                    <h5>{{ team.name }}</h5>
                </div>
            </div>
            <SwitchHorizontalIcon />
        </div>
        <ul class="ff-side-navigation--options">
            <router-link v-for="route in routes.general" :key="route.label" :to="'/team/' + team.slug + route.to">
                <li>
                    <component :is="route.icon" />
                    <label>{{ route.label }}</label>
                </li>
            </router-link>
        </ul>
        <ul class="ff-side-navigation--admin">
            <router-link v-for="route in routes.admin" :key="route.label" :to="'/team/' + team.slug + route.to">
                <li>
                    <component :is="route.icon" />
                    <label>{{ route.label }}</label>
                </li>
            </router-link>
        </ul>
    </div>
</template>

<script>
import { mapState } from 'vuex'

import { SwitchHorizontalIcon, CollectionIcon, UsersIcon, DatabaseIcon, CurrencyDollarIcon, CogIcon } from '@heroicons/vue/solid'

export default {
    name: 'FFSideNavigation',
    components: {
        SwitchHorizontalIcon
    },
    computed: {
        ...mapState('account', ['user', 'team', 'teamMembership'])
    },
    data () {
        return {
            routes: {
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
                    label: 'Billing',
                    to: '/settings/billing',
                    icon: CurrencyDollarIcon
                }, {
                    label: 'Team Settings',
                    to: '/settings/general',
                    icon: CogIcon
                }]
            }
        }
    }
}
</script>
