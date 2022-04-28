<template>
    <Teleport v-if="mounted" to="#platform-sidenav">
        <SideNavigation>
            <template v-slot:options>
                <li class="ff-navigation-divider">Admin Settings</li>
                <router-link v-for="route in navigation" :key="route.label" :to="route.path">
                    <nav-item :icon="route.icon" :label="route.name"></nav-item>
                </router-link>
            </template>
            <template v-slot:bottom>
                <router-link :to="{name: 'Team', params: {team_slug: team.slug}}">
                    <nav-item :icon="icons.chevronLeft" label="Back to Dashboard"></nav-item>
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
import Breadcrumbs from '@/mixins/Breadcrumbs'
import NavItem from '@/components/NavItem'
import SideNavigation from '@/components/SideNavigation'

import { ChevronLeftIcon, CollectionIcon, CogIcon, UsersIcon, UserGroupIcon, DesktopComputerIcon, TemplateIcon } from '@heroicons/vue/solid'

const navigation = [
    { name: 'Overview', path: '/admin/overview', icon: CollectionIcon },
    { name: 'Users', path: '/admin/users', icon: UsersIcon },
    { name: 'Teams', path: '/admin/teams', icon: UserGroupIcon },
    { name: 'Stacks', path: '/admin/stacks', icon: DesktopComputerIcon },
    { name: 'Templates', path: '/admin/templates', icon: TemplateIcon },
    { name: 'Settings', path: '/admin/settings', icon: CogIcon }
]

export default {
    name: 'AdminPage',
    mixins: [Breadcrumbs],
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
    created () {
        this.setBreadcrumbs([
            { label: 'Admin', to: { name: 'Admin Settings' } }
        ])
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
