<template>
    <div class="ff-header">
        <!-- Mobile: Toggle(Team & Team Admin Options) -->
        <i class="ff-header--mobile-toggle" :class="{'active': mobileMenuOpen}">
            <MenuIcon class="ff-avatar" @click="$emit('menu-toggle')"/>
        </i>
        <!-- FlowForge Logo -->
        <img class="ff-logo" src="@/images/ff-logo--wordmark-caps--dark.png" @click="home()"/>
        <!-- Mobile: Toggle(User Options) -->
        <div class="flex" v-if="team">
            <i class="ff-header--mobile-usertoggle" :class="{'active': mobileTeamSelectionOpen}">
                <img :src="team.avatar" class="ff-avatar" @click="mobileTeamSelectionOpen = !mobileTeamSelectionOpen" />
            </i>
            <i class="ff-header--mobile-usertoggle" :class="{'active': mobileUserOptionsOpen}">
                <img :src="user.avatar" class="ff-avatar" @click="mobileUserOptionsOpen = !mobileUserOptionsOpen" />
            </i>
        </div>
        <!-- Mobile: User Options -->
        <div class="ff-navigation ff-navigation-right" :class="{'open': mobileUserOptionsOpen}" data-action="user-options">
            <nav-item v-for="option in options" :key="option.label"
                      :label="option.label" :icon="option.icon" :notifications="option.notifications"
                      @click="mobileUserOptionsOpen = false; option.onclick(option.onclickparams)"></nav-item>
        </div>
        <!-- Mobile: Team Selection -->
        <div class="ff-navigation ff-navigation-right" :class="{'open': mobileTeamSelectionOpen}" data-action="team-selection">
            <nav-item v-for="team in teams" :key="team.name"
                      :label="team.name" :avatar="team.avatar"
                      @click="mobileTeamSelectionOpen = false; $router.push({name: 'Team', params: {team_slug: team.slug}})"></nav-item>
            <nav-item label="Create New Team" :icon="plusIcon"
                      @click="mobileTeamSelectionOpen = false; $router.push({name: 'CreateTeam'})"></nav-item>
        </div>
        <div class="hidden sm:flex">
            <ff-team-selection  data-action="team-selection" />
            <!-- Desktop: User Options -->
            <ff-dropdown v-if="user" class="ff-navigation ff-user-options" options-align="right" data-action="user-options" data-cy="user-options">
                <template v-slot:placeholder>
                    <div class="ff-user">
                        <img :src="user.avatar" class="ff-avatar"/>
                        <ff-notification-pill v-if="notifications.total > 0" data-el="notification-pill" class="ml-3" :count="notifications.total"/>
                        <!-- <label>{{ user.name }}</label> -->
                    </div>
                </template>
                <template v-slot:default>
                    <ff-dropdown-option v-for="option in options" :key="option.label" @click="option.onclick(option.onclickparams)">
                        <nav-item :label="option.label" :icon="option.icon" :notifications="option.notifications" :data-nav="option.tag"></nav-item>
                    </ff-dropdown-option>
                </template>
            </ff-dropdown>
        </div>
    </div>
</template>
<script>
import { ref } from 'vue'
import { mapState, mapGetters } from 'vuex'
import router from '@/routes'

import { MenuIcon, PlusIcon, QuestionMarkCircleIcon, AdjustmentsIcon, CogIcon, LogoutIcon } from '@heroicons/vue/solid'

import NavItem from '@/components/NavItem'
import TeamSelection from '@/components/TeamSelection'

export default {
    name: 'NavBar',
    props: {
        'mobile-menu-open': {
            type: Boolean
        }
    },
    emits: ['menu-toggle'],
    computed: {
        profile: function () {
            const profileLinks = router.options.routes.filter(r => {
                return r.profileLink && (!r.adminOnly || this.user.admin)
            })
            profileLinks.sort((A, B) => {
                return (A.profileMenuIndex || 0) - (B.profileMenuIndex || 0)
            })
            return profileLinks
        },
        ...mapState('account', ['user', 'team', 'teams']),
        ...mapGetters('account', ['notifications'])
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
        MenuIcon
    },
    data () {
        return {
            mobileTeamSelectionOpen: false,
            mobileUserOptionsOpen: false,
            options: [{
                label: 'User Settings',
                icon: CogIcon,
                tag: 'user-settings',
                onclick: this.$router.push,
                onclickparams: { name: 'User Settings' }
            }, {
                label: 'Documentation',
                icon: QuestionMarkCircleIcon,
                tag: 'documentation',
                onclick: this.to,
                onclickparams: { url: 'https://flowforge.com/docs/' }
            }, {
                label: 'Sign Out',
                icon: LogoutIcon,
                tag: 'sign-out',
                onclick: this.signout
            }]
        }
    },
    setup () {
        const open = ref(false)
        return {
            open,
            plusIcon: PlusIcon
        }
    },
    mounted () {
        if (this.user.admin) {
            this.options.splice(1, 0, {
                label: 'Admin Settings',
                icon: AdjustmentsIcon,
                tag: 'admin-settings',
                onclick: this.$router.push,
                onclickparams: { name: 'Admin Settings' }
            })
        }
        this.options[0].notifications = this.notifications.invitations
    },
    methods: {
        home () {
            if (this.team?.slug) {
                this.$router.push({ name: 'Team', params: { team_slug: this.team.slug } })
            }
        },
        to (route) {
            window.open(route.url, '_blank')
        },
        signout () {
            this.$router.push({ name: 'Sign out' })
        }
    }
}

</script>
