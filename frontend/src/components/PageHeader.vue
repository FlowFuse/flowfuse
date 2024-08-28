<template>
    <div class="ff-header" data-sentry-unmask>
        <!-- Mobile: Toggle(Team & Team Admin Options) -->
        <i v-if="shouldDisplayMenuToggle" class="ff-header--mobile-toggle" :class="{'active': mobileMenuOpen}">
            <MenuIcon class="ff-avatar" @click="$emit('menu-toggle')" />
        </i>
        <!-- FlowFuse Logo -->
        <img class="ff-logo" src="/ff-logo--wordmark-caps--dark.png" @click="home()">
        <!-- Mobile: Toggle(User Options) -->
        <div class="flex ff-mobile-navigation-right" data-el="mobile-nav-right">
            <NotificationsButton class="ff-header--mobile-notificationstoggle" :class="{'active': mobileTeamSelectionOpen}" />
            <i v-if="hasAvailableTeams" class="ff-header--mobile-usertoggle" :class="{'active': mobileTeamSelectionOpen}">
                <img :src="team ? team.avatar : defaultUserTeam.avatar" class="ff-avatar" @click="mobileTeamSelectionOpen = !mobileTeamSelectionOpen">
            </i>
            <i class="ff-header--mobile-usertoggle" :class="{'active': mobileUserOptionsOpen}">
                <img :src="user.avatar" class="ff-avatar" @click="mobileUserOptionsOpen = !mobileUserOptionsOpen">
            </i>
        </div>
        <!-- Mobile: User Options -->
        <div class="ff-navigation ff-navigation-right" :class="{'open': mobileUserOptionsOpen}" data-action="user-options">
            <nav-item
                v-for="option in navigationOptions" :key="option.label"
                :label="option.label" :icon="option.icon" :notifications="option.notifications"
                @click="mobileUserOptionsOpen = false; option.onclick(option.onclickparams)"
            />
        </div>
        <!-- Mobile: Team Selection -->
        <div class="ff-navigation ff-navigation-right" :class="{'open': mobileTeamSelectionOpen}" data-action="team-selection">
            <nav-item
                v-for="team in teams" :key="team.name"
                :label="team.name" :avatar="team.avatar"
                @click="mobileTeamSelectionOpen = false; $router.push({name: 'Team', params: {team_slug: team.slug}})"
            />
            <nav-item
                v-if="canCreateTeam"
                label="Create New Team" :icon="plusIcon"
                @click="mobileTeamSelectionOpen = false; $router.push({name: 'CreateTeam'})"
            />
        </div>
        <div class="hidden lg:flex ff-desktop-navigation-right" data-el="desktop-nav-right">
            <ff-team-selection data-action="team-selection" />
            <div class="px-4 flex flex-col justify-center" v-if="showInviteButton">
                <ff-button kind="secondary" @click="inviteTeamMembers">
                    <template #icon-left><UserAddIcon /></template>
                    Invite Members
                </ff-button>
            </div>
            <!-- Desktop: User Options -->
            <NotificationsButton />
            <ff-dropdown
                v-if="user"
                class="ff-navigation ff-user-options hidden lg:flex xl:flex md:flex sm:flex"
                options-align="right"
                data-action="user-options"
                data-cy="user-options"
            >
                <template #placeholder>
                    <div class="ff-user">
                        <img :src="user.avatar" class="ff-avatar">
                    </div>
                </template>
                <template #default>
                    <ff-dropdown-option v-for="option in navigationOptions" :key="option.label" @click="option.onclick(option.onclickparams)">
                        <nav-item :label="option.label" :icon="option.icon" :notifications="option.notifications" :data-nav="option.tag" />
                    </ff-dropdown-option>
                </template>
            </ff-dropdown>
        </div>
    </div>
</template>
<script>
import { AdjustmentsIcon, CogIcon, LogoutIcon, MenuIcon, PlusIcon, QuestionMarkCircleIcon, UserAddIcon } from '@heroicons/vue/solid'
import { ref } from 'vue'
import { mapGetters, mapState } from 'vuex'

import navigationMixin from '../mixins/Navigation.js'
import permissionsMixin from '../mixins/Permissions.js'

import NavItem from './NavItem.vue'
import NotificationsButton from './NotificationsButton.vue'

import TeamSelection from './TeamSelection.vue'

export default {
    name: 'NavBar',
    props: {
        mobileMenuOpen: {
            type: Boolean
        }
    },
    emits: ['menu-toggle'],
    mixins: [navigationMixin, permissionsMixin],
    computed: {
        ...mapState('account', ['user', 'team', 'teams']),
        ...mapGetters('account', ['notifications', 'hasAvailableTeams', 'defaultUserTeam', 'canCreateTeam']),
        ...mapGetters('ux', ['shouldShowLeftMenu']),
        navigationOptions () {
            return [
                {
                    label: 'User Settings',
                    icon: CogIcon,
                    tag: 'user-settings',
                    onclick: this.$router.push,
                    onclickparams: { name: 'User Settings' }
                },
                this.user.admin
                    ? {
                        label: 'Admin Settings',
                        icon: AdjustmentsIcon,
                        tag: 'admin-settings',
                        onclick: this.$router.push,
                        onclickparams: { name: 'Admin Settings' }
                    }
                    : undefined,
                {
                    label: 'Documentation',
                    icon: QuestionMarkCircleIcon,
                    tag: 'documentation',
                    onclick: this.to,
                    onclickparams: { url: 'https://flowfuse.com/docs/' }
                }, {
                    label: 'Sign Out',
                    icon: LogoutIcon,
                    tag: 'sign-out',
                    onclick: this.signOut
                }
            ].filter(option => option !== undefined)
        },
        showInviteButton () {
            return this.team && this.hasPermission('team:user:invite') && this.$route.name !== 'TeamMembers'
        },
        shouldDisplayMenuToggle () {
            return this.shouldShowLeftMenu(this.$route)
        }
    },
    watch: {
        notifications: {
            handler: function () {
                this.options[0].notifications = this.notifications.invitations
            },
            deep: true
        }
    },
    components: {
        NavItem,
        'ff-team-selection': TeamSelection,
        MenuIcon,
        UserAddIcon,
        NotificationsButton
    },
    data () {
        return {
            mobileTeamSelectionOpen: false,
            mobileUserOptionsOpen: false
        }
    },
    setup () {
        const open = ref(false)
        return {
            open,
            plusIcon: PlusIcon
        }
    },
    methods: {
        to (route) {
            window.open(route.url, '_blank')
        },
        inviteTeamMembers () {
            this.$router.push({
                name: 'TeamMembers',
                params: {
                    team_slug: this.team.slug
                },
                query: {
                    action: 'invite'
                }
            })
        }
    }
}

</script>
