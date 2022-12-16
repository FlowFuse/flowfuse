<template>
    <Teleport v-if="mounted" to="#platform-sidenav">
        <SideNavigation>
            <template v-slot:options>
                <li class="ff-navigation-divider">Admin Settings</li>
                <router-link v-for="route in navigation" :key="route.label" :to="route.path">
                    <nav-item :icon="route.icon" :label="route.name" :data-nav="route.tag"></nav-item>
                </router-link>
            </template>
            <template v-slot:back v-if="team">
                <router-link :to="{name: 'Team', params: {team_slug: team.slug}}">
                    <nav-item :icon="icons.chevronLeft" label="Back to Dashboard" data-nav="team-overview"></nav-item>
                </router-link>
            </template>
            <template v-slot:back v-else>
                <router-link :to="{name: 'CreateTeam'}">
                    <nav-item :icon="icons.chevronLeft" label="Back to Create Team" data-nav="create-team"></nav-item>
                </router-link>
            </template>
        </SideNavigation>
    </Teleport>
    <main>
        <div class="">
            <router-view></router-view>
        </div>
    </main>
</template>

<script>
import { mapState } from 'vuex'
import NavItem from '@/components/NavItem'
import SideNavigation from '@/components/SideNavigation'

import { ChevronLeftIcon, CollectionIcon, CogIcon, UsersIcon, UserGroupIcon, DesktopComputerIcon, TemplateIcon, ColorSwatchIcon, DatabaseIcon } from '@heroicons/vue/solid'

const navigation = [
    { name: 'Overview', path: '/admin/overview', tag: 'admin-overview', icon: CollectionIcon },
    { name: 'Users', path: '/admin/users', tag: 'admin-users', icon: UsersIcon },
    { name: 'Teams', path: '/admin/teams', tag: 'admin-teams', icon: UserGroupIcon },
    { name: 'Project Types', path: '/admin/project-types', tag: 'admin-projecttypes', icon: ColorSwatchIcon },
    { name: 'Stacks', path: '/admin/stacks', tag: 'admin-stacks', icon: DesktopComputerIcon },
    { name: 'Templates', path: '/admin/templates', tag: 'admin-templates', icon: TemplateIcon },
    { name: 'Audit Log', path: '/admin/audit-log', tag: 'admin-auditlog', icon: DatabaseIcon },
    { name: 'Settings', path: '/admin/settings', tag: 'admin-settings', icon: CogIcon }
]

export default {
    name: 'AdminPage',
    computed: {
        ...mapState('account', ['user', 'team'])
    },
    data () {
        return {
            mounted: false,
            icons: {
                chevronLeft: ChevronLeftIcon
            }
        }
    },
    setup () {
        return {
            navigation
        }
    },
    mounted () {
        this.mounted = true
    },
    components: {
        SideNavigation,
        NavItem
    }
}
</script>
