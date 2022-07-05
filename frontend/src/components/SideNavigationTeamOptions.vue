<template>
    <div v-if="team" class="ff-side-navigation" :class="{'minimised': nested}">
        <div class="ff-side-navigation--primary">
            <!-- Team Options: General -->
            <ul class="ff-side-navigation--options">
                <router-link v-for="route in routes.general" :key="route.label"
                             :class="{'router-link-active': atNestedRoute(route)}"
                             :to="'/team/' + team.slug + route.to" @click="$emit('option-selected')">
                    <nav-item :label="route.label" :icon="route.icon"></nav-item>
                </router-link>
            </ul>
            <span v-if="showAdmin" class="ff-navigation-divider">
                <label>Team Admin Zone</label>
            </span>
            <!-- Team Options: Admin -->
            <ul v-if="showAdmin" class="ff-side-navigation--admin">
                <router-link v-for="route in routes.admin" :key="route.label" :to="'/team/' + team.slug + route.to">
                    <nav-item :icon="route.icon" :label="route.label"></nav-item>
                </router-link>
            </ul>
        </div>
        <div class="ff-side-navigation--nested">
            <slot name="nested-menu"></slot>
        </div>
    </div>
</template>

<script>
import { mapState } from 'vuex'

import { Roles } from '@core/lib/roles'

import ProjectsIcon from '@/components/icons/Projects'
import { ChipIcon, UsersIcon, DatabaseIcon, TemplateIcon, CurrencyDollarIcon, CogIcon } from '@heroicons/vue/solid'
import NavItem from '@/components/NavItem'

export default {
    name: 'FFSideNavigationTeamOptions',
    props: ['mobile-menu-open'],
    emits: ['option-selected'],
    components: {
        NavItem
    },
    computed: {
        ...mapState('account', ['user', 'team', 'teamMembership', 'features', 'notifications']),
        showAdmin: function () {
            return this.teamMembership.role === Roles.Admin || this.teamMembership.role === Roles.Owner
        },
        nested: function () {
            return (this.$slots['nested-menu'] && this.loaded) || this.closeNested
        }
    },
    data () {
        const routes = {
            general: [{
                label: 'Overview',
                to: '/overview',
                icon: TemplateIcon
            }, {
                label: 'Projects',
                to: '/projects',
                icon: ProjectsIcon
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
            closeNested: false,
            loaded: false,
            routes: routes
        }
    },
    mounted () {
        this.checkFeatures()
        window.setTimeout(() => {
            this.loaded = true
        }, 0)
    },
    beforeMount () {
        const lastUrl = this.$router.options.history.state.back
        if (lastUrl?.indexOf('/project') === 0) {
            this.closeNested = true
            setTimeout(() => {
                this.closeNested = false
            }, 50)
        }
    },
    beforeUnmount () {
        this.loaded = false
    },
    methods: {
        // to prevent messy vue-router children hierarchy,
        // check manually for when we are viewing a project in order to highlight the "parent" Projects view
        atNestedRoute (route) {
            if (route.to === '/projects') {
                if (this.$route.path.indexOf('/project') === 0) {
                    return true
                }
            }
        },
        checkFeatures () {
            if (this.features.billing) {
                // insert billing in second slot of admin
                this.routes.admin.splice(1, 0, {
                    label: 'Billing',
                    to: '/billing',
                    icon: CurrencyDollarIcon
                })
            }
            if (this.features.devices) {
                this.routes.general.splice(2, 0, {
                    label: 'Devices',
                    to: '/devices',
                    icon: ChipIcon
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
