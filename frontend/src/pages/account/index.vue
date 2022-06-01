<template>
    <Teleport v-if="mounted" to="#platform-sidenav">
        <SideNavigation>
            <template v-slot:options>
                <li class="ff-navigation-divider">User Settings</li>
                <router-link v-for="route in navigation" :key="route.label" :to="route.path">
                    <nav-item :icon="route.icon" :label="route.name"></nav-item>
                </router-link>
            </template>
            <template v-slot:back v-if="team">
                <router-link :to="{name: 'Team', params: {team_slug: team.slug}}">
                    <nav-item :icon="icons.chevronLeft" label="Back to Dashboard"></nav-item>
                </router-link>
            </template>
            <template v-slot:back v-else>
                <router-link :to="{name: 'CreateTeam'}">
                    <nav-item :icon="icons.chevronLeft" label="Back to Create Team"></nav-item>
                </router-link>
            </template>
        </SideNavigation>
    </Teleport>
    <main>
        <div class="flex items-center mb-8">
            <div class="mr-3"><img :src="user.avatar" class="h-14 v-14 rounded-md"/></div>
            <div class="flex flex-col">
                <div class="text-xl font-bold">{{ user.name }}</div>
                <div class="text-l text-gray-400">{{ user.username }}</div>
            </div>
        </div>
        <div class="text-sm sm:px-6 mt-4 sm:mt-8">
            <router-view></router-view>
        </div>
    </main>
</template>

<script>
import { mapState } from 'vuex'
import SideNavigation from '@/components/SideNavigation'
import NavItem from '@/components/NavItem'

import { ChevronLeftIcon, CogIcon, UserGroupIcon, LockClosedIcon } from '@heroicons/vue/solid'

const navigation = [
    { name: 'Settings', path: '/account/settings', icon: CogIcon },
    { name: 'Teams', path: '/account/teams', icon: UserGroupIcon },
    { name: 'Security', path: '/account/security', icon: LockClosedIcon }
]

export default {
    name: 'UserSettings',
    computed: {
        ...mapState('account', ['user', 'team'])
    },
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
    setup () {
        return {
            navigation
        }
    },
    mounted () {
        this.mounted = true
    }
}
</script>
