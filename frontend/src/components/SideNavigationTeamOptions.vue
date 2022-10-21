<template>
    <div v-if="team" class="ff-side-navigation" :class="{'minimised': nested}">
        <div class="ff-side-navigation--primary">
            <!-- Team Options: General -->
            <ul class="ff-side-navigation--options">
                <router-link v-for="route in routes.general" :key="route.label"
                             :class="{'router-link-active': atNestedRoute(route)}"
                             :to="'/team/' + team.slug + route.to" @click="$emit('option-selected')"
                             :data-nav="route.tag">
                    <nav-item :label="route.label" :icon="route.icon"></nav-item>
                </router-link>
            </ul>
            <span v-if="hasPermission('team:edit')" class="ff-navigation-divider">
                <label>Team Admin Zone</label>
            </span>
            <!-- Team Options: Admin -->
            <ul v-if="hasPermission('team:edit')" class="ff-side-navigation--admin">
                <router-link v-for="route in routes.admin" :key="route.label"
                             :to="'/team/' + team.slug + route.to"
                             :data-nav="route.tag">
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

import permissionsMixin from '@/mixins/Permissions'

import ProjectsIcon from '@/components/icons/Projects'
import { ChipIcon, UsersIcon, DatabaseIcon, TemplateIcon, CurrencyDollarIcon, CogIcon } from '@heroicons/vue/solid'
import NavItem from '@/components/NavItem'

export default {
    name: 'FFSideNavigationTeamOptions',
    props: ['mobile-menu-open'],
    emits: ['option-selected'],
    mixins: [permissionsMixin],
    components: {
        NavItem
    },
    computed: {
        ...mapState('account', ['user', 'team', 'teamMembership', 'features', 'notifications']),
        nested: function () {
            return (this.$slots['nested-menu'] && this.loaded) || this.closeNested
        }
    },
    data () {
        const routes = {
            general: [{
                label: 'Overview',
                to: '/overview',
                tag: 'team-overview',
                icon: TemplateIcon
            }, {
                label: 'Projects',
                to: '/projects',
                tag: 'team-projects',
                icon: ProjectsIcon
            }, {
                label: 'Devices',
                to: '/devices',
                tag: 'team-devices',
                icon: ChipIcon
            }, {
                label: 'Members',
                to: '/members',
                tag: 'team-members',
                icon: UsersIcon
            }],
            admin: [{
                label: 'Audit Log',
                to: '/audit-log',
                tag: 'team-audit',
                icon: DatabaseIcon
            }, {
                label: 'Team Settings',
                to: '/settings',
                tag: 'team-settings',
                icon: CogIcon
            }]
        }

        return {
            closeNested: false,
            loaded: false,
            routes
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
        // trigger animation reveal of the main bar if navigating
        // from a project/device page where we show the nested menu
        if (lastUrl && (lastUrl.indexOf('/project') === 0 || lastUrl.indexOf('/device') === 0)) {
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
            // the high-level route link to "/devices"
            if (route.to === '/devices') {
                // highlight it if we are currently viewing a single device
                if (this.$route.path.indexOf('/device') === 0) {
                    return true
                }
            }
            // the high-level route link to "/projects"
            if (route.to === '/projects') {
                // highlight it if we are currently viewing a single project
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
                    tag: 'team-billing',
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
