<template>
    <Teleport v-if="mounted" to="#platform-sidenav">
        <SideNavigation>
            <template #options>
                <li class="ff-navigation-divider">User Settings</li>
                <router-link v-for="route in navigation" :key="route.label" :to="route.path" :data-nav="route.tag">
                    <nav-item :icon="route.icon" :label="route.name" :notifications="route.notifications" />
                </router-link>
            </template>
            <template v-if="team" #back>
                <router-link :to="{name: 'Team', params: {team_slug: team.slug}}" data-nav="team-overview">
                    <nav-item :icon="icons.chevronLeft" label="Back to Dashboard" />
                </router-link>
            </template>
            <template v-else #back>
                <router-link :to="{name: 'CreateTeam'}" data-nav="create-team">
                    <nav-item :icon="icons.chevronLeft" label="Back to Create Team" />
                </router-link>
            </template>
        </SideNavigation>
    </Teleport>
    <ff-page>
        <div class="flex items-center mb-8">
            <div class="mr-3"><img :src="user.avatar" class="h-14 v-14 rounded-md"></div>
            <div class="flex flex-col">
                <div class="text-xl font-bold">{{ user.name }}</div>
                <div class="text-l text-gray-400">{{ user.username }}</div>
            </div>
        </div>
        <div class="text-sm sm:px-6 mt-4 sm:mt-8">
            <router-view />
        </div>
    </ff-page>
</template>

<script>
import { ChevronLeftIcon, CogIcon, LockClosedIcon, UserGroupIcon } from '@heroicons/vue/solid'
import { mapGetters, mapState } from 'vuex'

import NavItem from '../../components/NavItem.vue'
import SideNavigation from '../../components/SideNavigation.vue'

export default {
    name: 'UserSettings',
    components: {
        SideNavigation,
        NavItem
    },
    data () {
        return {
            mounted: false,
            navigation: [
                { name: 'Settings', path: '/account/settings', tag: 'account-settings', icon: CogIcon },
                { name: 'Teams', path: '/account/teams', tag: 'account-teams', icon: UserGroupIcon },
                { name: 'Security', path: '/account/security', tag: 'account-security', icon: LockClosedIcon }
            ],
            icons: {
                chevronLeft: ChevronLeftIcon
            }
        }
    },
    computed: {
        ...mapState('account', ['user', 'team']),
        ...mapGetters('account', ['teamInvitationsCount'])
    },
    watch: {
        teamInvitationsCount: {
            handler: function () {
                this.updateNotifications()
            },
            deep: true
        }
    },
    mounted () {
        this.mounted = true
        this.updateNotifications()
    },
    methods: {
        updateNotifications () {
            this.navigation[1].notifications = this.teamInvitationsCount
        }
    }
}
</script>
