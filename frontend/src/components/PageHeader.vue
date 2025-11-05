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
        <router-link :to="homeLink" class="ff-logo-wrapper">
            <!-- Mobile: Icon-only logo -->
            <img class="ff-logo lg:hidden" src="/ff-minimal-red.svg" alt="FlowFuse">
            <!-- Desktop: Full wordmark logo -->
            <img class="ff-logo hidden lg:block" src="/ff-logo--wordmark--light.svg" alt="FlowFuse">
        </router-link>
        <global-search v-if="teams.length > 0 && hasAMinimumTeamRoleOf(Roles.Viewer)" />
        <!-- Mobile: Toggle(User Options) -->
        <div class="flex ff-mobile-navigation-right" data-el="mobile-nav-right">
            <i class="ff-header--mobile-usertoggle" :class="{'active': mobileUserOptionsOpen}">
                <img :src="user.avatar" class="ff-avatar" @click="mobileUserOptionsOpen = !mobileUserOptionsOpen">
            </i>
            <NotificationsButton class="ff-header--mobile-notificationstoggle" :class="{'active': mobileTeamSelectionOpen}" />
            <i v-if="hasAvailableTeams" class="ff-header--mobile-usertoggle" :class="{'active': mobileTeamSelectionOpen}">
                <img :src="team ? team.avatar : defaultUserTeam.avatar" class="ff-avatar" @click="toggleMobileTeamSelectionMenu">
            </i>
            <ExpertButton class="ff-header--mobile-experttoggle" />
        </div>
        <!-- Mobile: User Options -->
        <div
            v-click-outside="closeUserOptions"
            class="ff-navigation ff-navigation-right"
            :class="{'open': mobileUserOptionsOpen}"
            data-action="user-options"
        >
            <ul>
                <nav-item
                    v-for="option in navigationOptions" :key="option.label"
                    :label="option.label" :icon="option.icon" :notifications="option.notifications"
                    :class="option.class ?? ''"
                    @click="mobileUserOptionsOpen = false; option.onclick(option.onclickparams)"
                />
            </ul>
        </div>
        <!-- Mobile: Team Selection -->
        <div
            v-click-outside="closeTeamSelection"
            class="ff-navigation ff-navigation-right"
            :class="{'open': mobileTeamSelectionOpen, 'without-divider': !canCreateTeam}"
            data-action="team-selection"
        >
            <ul>
                <nav-item
                    v-for="team in teams" :key="team.name"
                    :label="team.name" :avatar="team.avatar"
                    @click="mobileTeamSelectionOpen = false; $router.push({name: 'Team', params: {team_slug: team.slug}})"
                />
                <nav-item
                    v-if="canCreateTeam"
                    label="Create New Team" :icon="plusIcon"
                    class="create"
                    @click="mobileTeamSelectionOpen = false; $router.push({name: 'CreateTeam'})"
                />
            </ul>
        </div>
        <div class="hidden lg:flex items-stretch ff-desktop-navigation-right" data-el="desktop-nav-right">
            <!-- Desktop: User Options -->
            <ExpertButton />
            <ff-team-selection data-action="team-selection" />
            <NotificationsButton />
            <ff-dropdown
                v-if="user"
                :show-chevron="false"
                class="ff-navigation ff-user-options"
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
                    <ff-dropdown-option
                        v-for="option in navigationOptions"
                        :key="option.label"
                        :class="option.class ?? ''"
                        @click="option.onclick(option.onclickparams)"
                    >
                        <nav-item
                            :label="option.label"
                            :icon="option.icon"
                            :notifications="option.notifications"
                            :data-nav="option.tag"
                        />
                    </ff-dropdown-option>
                </template>
            </ff-dropdown>
        </div>
    </div>
</template>
<script>
import { AcademicCapIcon, AdjustmentsIcon, CogIcon, CursorClickIcon, LogoutIcon, MenuIcon, PlusIcon, QuestionMarkCircleIcon, XIcon } from '@heroicons/vue/solid'
import { ref } from 'vue'
import { mapActions, mapGetters, mapState } from 'vuex'

import usePermissions from '../composables/Permissions.js'

import navigationMixin from '../mixins/Navigation.js'
import product from '../services/product.js'
import { Roles } from '../utils/roles.js'

import ExpertButton from './ExpertButton.vue'
import NavItem from './NavItem.vue'
import NotificationsButton from './NotificationsButton.vue'

import TeamSelection from './TeamSelection.vue'
import GlobalSearch from './global-search/GlobalSearch.vue'

export default {
    name: 'PageHeader',
    mixins: [navigationMixin],
    computed: {
        Roles () {
            return Roles
        },
        ...mapState('account', ['user', 'team', 'teams']),
        ...mapState('ux/drawers', ['leftDrawer']),
        ...mapGetters('account', ['notifications', 'hasAvailableTeams', 'defaultUserTeam', 'canCreateTeam', 'isTrialAccount', 'featuresCheck']),
        ...mapGetters('ux/drawers', ['hiddenLeftDrawer']),
        navigationOptions () {
            return [
                {
                    label: 'User Settings',
                    icon: CogIcon,
                    tag: 'user-settings',
                    onclick: this.$router.push,
                    onclickparams: { name: 'User Settings' },
                    hidden: false
                },
                {
                    label: 'Admin Settings',
                    icon: AdjustmentsIcon,
                    tag: 'admin-settings',
                    onclick: this.$router.push,
                    onclickparams: { name: 'Admin Settings' },
                    hidden: !this.user.admin
                },
                {
                    label: 'Documentation',
                    icon: QuestionMarkCircleIcon,
                    tag: 'documentation',
                    onclick: (route) => window.open(route.url, '_blank'),
                    onclickparams: { url: 'https://flowfuse.com/docs/' }
                },
                {
                    label: 'Getting Started',
                    icon: AcademicCapIcon,
                    tag: 'getting-started',
                    onclick: this.openEducationModal
                },
                {
                    label: 'Welcome Tour',
                    icon: CursorClickIcon,
                    tag: 'welcome-tour',
                    onclick: this.startWelcomeTour
                },
                {
                    label: 'Sign Out',
                    icon: LogoutIcon,
                    tag: 'sign-out',
                    onclick: this.signOut,
                    class: 'danger'
                }
            ].filter(option => !option.hidden)
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
        NotificationsButton,
        ExpertButton
    },
    data () {
        return {
            mobileTeamSelectionOpen: false,
            mobileUserOptionsOpen: false
        }
    },
    setup () {
        const open = ref(false)
        const { hasPermission, hasAMinimumTeamRoleOf } = usePermissions()

        return {
            open,
            plusIcon: PlusIcon,
            hasPermission,
            hasAMinimumTeamRoleOf
        }
    },
    methods: {
        ...mapActions('ux/drawers', ['toggleLeftDrawer']),
        openEducationModal () {
            this.$store.dispatch('ux/tours/openModal', 'education')
                .then(() => product.capture('clicked-open-education-modal'))
                .catch(e => e)
        },
        startWelcomeTour () {
            return this.$store.dispatch('ux/tours/resetTours')
                .then(() => this.$router.push({ name: 'team-home', params: { team_slug: this.team.slug } }))
                .then(() => this.$store.dispatch('ux/tours/presentTour'))
        },
        toggleMobileTeamSelectionMenu () {
            this.mobileTeamSelectionOpen = !this.mobileTeamSelectionOpen
        },
        closeTeamSelection () {
            if (this.mobileTeamSelectionOpen) {
                this.$nextTick(() => {
                    this.mobileTeamSelectionOpen = false
                })
            }
        },
        closeUserOptions () {
            if (this.mobileUserOptionsOpen) {
                this.$nextTick(() => {
                    this.mobileUserOptionsOpen = false
                })
            }
        }
    }
}

</script>
