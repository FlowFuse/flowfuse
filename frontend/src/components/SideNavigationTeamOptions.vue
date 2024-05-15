<template>
    <div v-if="team" class="ff-side-navigation" :class="{'minimised': nested}">
        <div class="ff-side-navigation--primary">
            <!-- Team Options: General -->
            <ul class="ff-side-navigation--options">
                <div v-for="route in navigation.general" :key="route.label">
                    <router-link
                        v-if="route.label"
                        :class="{'router-link-active': atNestedRoute(route)}"
                        :to="'/team/' + team.slug + route.to" :data-nav="route.tag"
                        @click="$emit('option-selected')"
                    >
                        <nav-item :label="route.label" :icon="route.icon" :featureUnavailable="route.featureUnavailable" />
                    </router-link>
                    <div v-else class="ff-side-navigation-divider" />
                </div>
            </ul>
            <span v-if="hasPermission('team:edit')" class="ff-navigation-divider">
                <label>Team Admin Zone</label>
            </span>
            <!-- Team Options: Admin -->
            <ul v-if="hasPermission('team:edit')" class="ff-side-navigation--admin">
                <router-link
                    v-for="route in navigation.admin" :key="route.label"
                    :to="'/team/' + team.slug + route.to"
                    :data-nav="route.tag"
                >
                    <nav-item :icon="route.icon" :label="route.label" :featureUnavailable="route.featureUnavailable" />
                </router-link>
            </ul>
        </div>
        <div class="ff-side-navigation--nested">
            <slot name="nested-menu" />
        </div>
    </div>
</template>

<script>
import { ChipIcon, CogIcon, CurrencyDollarIcon, DatabaseIcon, FolderIcon, TemplateIcon, UsersIcon } from '@heroicons/vue/solid'
import { mapState } from 'vuex'

import permissionsMixin from '../mixins/Permissions.js'

import NavItem from './NavItem.vue'
import ProjectsIcon from './icons/Projects.js'

export default {
    name: 'FFSideNavigationTeamOptions',
    components: {
        NavItem
    },
    mixins: [permissionsMixin],
    props: {
        mobileMenuOpen: {
            type: Boolean,
            default: false
        }
    },
    emits: ['option-selected'],
    data () {
        return {
            closeNested: false,
            loaded: false
        }
    },
    computed: {
        ...mapState('account', ['user', 'team', 'teamMembership', 'features', 'notifications']),
        nested: function () {
            return (this.$slots['nested-menu'] && this.loaded) || this.closeNested
        },
        navigation () {
            const result = {
                general: [{
                    label: 'Applications',
                    to: '/applications',
                    tag: 'team-applications',
                    icon: TemplateIcon
                },
                {},
                {
                    label: 'Instances',
                    to: '/instances',
                    tag: 'team-instances',
                    icon: ProjectsIcon
                },
                {
                    label: 'Devices',
                    to: '/devices',
                    tag: 'team-devices',
                    icon: ChipIcon
                },
                {},
                {
                    label: 'Library',
                    to: '/library',
                    tag: 'shared-library',
                    icon: FolderIcon,
                    featureUnavailable: !this.features?.['shared-library'] || this.team?.type.properties.features?.['shared-library'] === false
                },
                {
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
                },
                {
                    label: 'Team Settings',
                    to: '/settings',
                    tag: 'team-settings',
                    icon: CogIcon
                }]
            }
            if (this.features?.billing) {
                // insert billing in second slot of admin
                result.admin.splice(1, 0, {
                    label: 'Billing',
                    to: '/billing',
                    tag: 'team-billing',
                    icon: CurrencyDollarIcon
                })
            }
            return result
        }
    },
    mounted () {
        this.loaded = true
    },
    beforeMount () {
        const lastUrl = this.$router.options.history.state.back
        // trigger animation reveal of the main bar if navigating
        // from a project/device page where we show the nested menu
        if (lastUrl && (lastUrl.indexOf('/instance') === 0 || lastUrl.indexOf('/device') === 0)) {
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
            if (route.to === '/applications') {
                // highlight it if we are currently viewing a single project
                if (this.$route.path.indexOf('/application') === 0) {
                    return true
                }
            }
            // the high-level route link to "/instances"
            if (route.to === '/instances') {
                // highlight it if we are currently viewing a single instance
                if (this.$route.path.indexOf('/instance') === 0) {
                    return true
                }
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
