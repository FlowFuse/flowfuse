<template>
    <div v-if="team">
        <div class="ff-team-selection">
            <div>
                <img :src="team.avatar" class="ff-avatar"/>
                <div class="ff-team-selection-name">
                    <label>TEAM:</label>
                    <h5>{{ team.name }}</h5>
                </div>
            </div>
            <SwitchHorizontalIcon :class="{'active': teamSelectionOpen }" @click="switchTeam"/>
            <ul :class="{'active': teamSelectionOpen }">
                <li class="ff-nav-item"><label>Team Selection</label></li>
                <nav-item v-for="t in teams" :key="t.id" :label="t.name" :avatar="t?.avatar" @click="selectTeam(t)"></nav-item>
                <nav-item label="Create Team" :icon="plusIcon" @click="createTeam"></nav-item>
            </ul>
        </div>
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

import { SwitchHorizontalIcon, CollectionIcon, UsersIcon, DatabaseIcon, CurrencyDollarIcon, CogIcon, PlusIcon } from '@heroicons/vue/solid'
import NavItem from '@/components/NavItem'

export default {
    name: 'FFSideNavigationTeamOptions',
    props: ['mobile-menu-open'],
    emits: ['option-selected'],
    components: {
        NavItem,
        SwitchHorizontalIcon
    },
    computed: {
        ...mapState('account', ['user', 'team', 'teams', 'teamMembership']),
        ...mapState(['features']),
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
            teamSelectionOpen: false,
            plusIcon: PlusIcon,
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
        },
        switchTeam () {
            this.teamSelectionOpen = !this.teamSelectionOpen
        },
        selectTeam (team) {
            if (team) {
                this.$router.push({
                    name: 'Team',
                    params: {
                        team_slug: team.slug
                    }
                })
                this.switchTeam()
            }
        },
        createTeam () {
            this.$router.push({
                name: 'CreateTeam'
            })
            this.switchTeam()
        }
    }
}
</script>
