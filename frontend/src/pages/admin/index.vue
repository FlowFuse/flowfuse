<template>
    <Teleport v-if="mounted" to="#platform-sidenav">
        <SideNavigation>
            <template #options>
                <li class="ff-navigation-divider">Admin Settings</li>
                <router-link v-for="route in navigation" :key="route.label" :to="route.path">
                    <nav-item :icon="route.icon" :label="route.name" :data-nav="route.tag" :featureUnavailable="route.featureUnavailable" />
                </router-link>
            </template>
            <template v-if="team" #back>
                <router-link :to="{name: 'Team', params: {team_slug: team.slug}}">
                    <nav-item :icon="icons.chevronLeft" label="Back to Dashboard" data-nav="team-overview" />
                </router-link>
            </template>
            <template v-else #back>
                <router-link :to="{name: 'CreateTeam'}">
                    <nav-item :icon="icons.chevronLeft" label="Back to Create Team" data-nav="create-team" />
                </router-link>
            </template>
        </SideNavigation>
    </Teleport>
    <ff-page>
        <div class="">
            <router-view />
        </div>
    </ff-page>
</template>

<script>
import { ChevronLeftIcon, CogIcon, CollectionIcon, ColorSwatchIcon, DatabaseIcon, DesktopComputerIcon, TemplateIcon, UserGroupIcon, UsersIcon } from '@heroicons/vue/solid'
import { mapState } from 'vuex'

import adminApi from '../../api/admin.js'

import NavItem from '../../components/NavItem.vue'
import SideNavigation from '../../components/SideNavigation.vue'

export default {
    name: 'AdminPage',
    components: {
        SideNavigation,
        NavItem
    },
    data () {
        return {
            mounted: false,
            icons: {
                chevronLeft: ChevronLeftIcon
            }
        }
    },
    computed: {
        ...mapState('account', ['features', 'user', 'team']),
        navigation: function () {
            return [
                { name: 'Overview', path: '/admin/overview', tag: 'admin-overview', icon: CollectionIcon },
                { name: 'Users', path: '/admin/users', tag: 'admin-users', icon: UsersIcon },
                { name: 'Teams', path: '/admin/teams', tag: 'admin-teams', icon: UserGroupIcon },
                { name: 'Team Types', path: '/admin/team-types', tag: 'admin-teamtypes', icon: ColorSwatchIcon },
                { name: 'Instance Types', path: '/admin/instance-types', tag: 'admin-instancetypes', icon: ColorSwatchIcon },
                { name: 'Stacks', path: '/admin/stacks', tag: 'admin-stacks', icon: DesktopComputerIcon },
                { name: 'Templates', path: '/admin/templates', tag: 'admin-templates', icon: TemplateIcon },
                { name: 'Flow Blueprints', path: '/admin/flow-blueprints', tag: 'admin-flow-blueprints', icon: TemplateIcon, featureUnavailable: !this.features.flowBlueprints },
                { name: 'Activity', path: '/admin/audit-log', tag: 'admin-auditlog', icon: DatabaseIcon },
                { name: 'Settings', path: '/admin/settings', tag: 'admin-settings', icon: CogIcon }
            ]
        }
    },
    async mounted () {
        try {
            await adminApi.getLicenseDetails()
        } catch (err) {
            if (err.response?.status === 403 || !err.response) {
                this.$router.push('/')
            } else {
                throw err
            }
        }
        this.mounted = true
    }
}
</script>

<style lang="scss">
@import "../../stylesheets/pages/admin.scss";
</style>
