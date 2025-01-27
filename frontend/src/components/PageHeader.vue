<template>
    <div class="ff-header" data-sentry-unmask>
        <!-- Mobile: Toggle(Team & Team Admin Options) -->
        <i v-if="!hiddenLeftDrawer" class="ff-header--mobile-toggle">
            <transition name="mobile-menu-fade" mode="out-in">
                <MenuIcon v-if="!leftDrawer.state" class="ff-avatar cursor-pointer" @click="toggleLeftDrawer" />
                <XIcon v-else class="ff-avatar cursor-pointer" @click="toggleLeftDrawer" />
            </transition>
        </i>
        <!-- FlowFuse Logo -->
        <router-link :to="homeLink">
            <img class="ff-logo" src="/ff-logo--wordmark--dark.png">
        </router-link>
        <global-search v-if="teams.length > 0 && hasAMinimumTeamRoleOf(Roles.Viewer)" />
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
        <div class="ff-navigation ff-navigation-right" :class="{'open': mobileTeamSelectionOpen, 'without-divider': !canCreateTeam}" data-action="team-selection">
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
                <ff-button kind="secondary" type="anchor" :to="{ name: 'team-members', params: { team_slug: team.slug }, query: { action: 'invite' } }">
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
import { AcademicCapIcon, AdjustmentsIcon, CogIcon, LogoutIcon, MenuIcon, PlusIcon, QuestionMarkCircleIcon, UserAddIcon, XIcon } from '@heroicons/vue/solid'
import { ref } from 'vue'
import { mapActions, mapGetters, mapState } from 'vuex'

import navigationMixin from '../mixins/Navigation.js'
import permissionsMixin from '../mixins/Permissions.js'
import product from '../services/product.js'
import { Roles } from '../utils/roles.js'

import NavItem from './NavItem.vue'
import NotificationsButton from './NotificationsButton.vue'

import TeamSelection from './TeamSelection.vue'
import GlobalSearch from './global-search/GlobalSearch.vue'

export default {
    name: 'PageHeader',
    mixins: [navigationMixin, permissionsMixin],
    computed: {
        Roles () {
            return Roles
        },
        ...mapState('account', ['user', 'team', 'teams']),
        ...mapState('ux', ['leftDrawer']),
        ...mapGetters('account', ['notifications', 'hasAvailableTeams', 'defaultUserTeam', 'canCreateTeam', 'isTrialAccount']),
        ...mapGetters('ux', ['hiddenLeftDrawer']),
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
                    onclick: (route) => window.open(route.url, '_blank'),
                    onclickparams: { url: 'https://flowfuse.com/docs/' }
                },
                this.isTrialAccount
                    ? {
                        label: 'Getting Started',
                        icon: AcademicCapIcon,
                        tag: 'getting-started',
                        onclick: this.openEducationModal
                    }
                    : undefined,
                {
                    label: 'Sign Out',
                    icon: LogoutIcon,
                    tag: 'sign-out',
                    onclick: this.signOut
                }
            ].filter(option => option !== undefined)
        },
        showInviteButton () {
            return this.team && this.hasPermission('team:user:invite') && this.$route.name !== 'team-members-members'
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
        GlobalSearch,
        NavItem,
        'ff-team-selection': TeamSelection,
        MenuIcon,
        XIcon,
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
        ...mapActions('ux', ['toggleLeftDrawer', 'activateTour']),
        ...mapGetters('account', ['featuresCheck']),
        openEducationModal () {
            this.activateTour('education')
            product.capture('clicked-open-education-modal')
        }
    }
}

</script>
