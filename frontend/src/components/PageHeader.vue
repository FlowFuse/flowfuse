<template>
    <div class="ff-header">
        <!-- Mobile: Toggle(Team & Team Admin Options) -->
        <i class="ff-header--mobile-toggle" :class="{'active': mobileMenuOpen}">
            <MenuIcon class="ff-avatar" @click="$emit('menu-toggle')"/>
        </i>
        <!-- FlowForge Logo -->
        <img class="ff-logo" src="@/images/ff-logo--wordmark-caps--dark.png" @click="home()"/>
        <!-- Mobile: Toggle(User Options) -->
        <i class="ff-header--mobile-usertoggle" :class="{'active': mobileUserOptionsOpen}">
            <img :src="user.avatar" class="ff-avatar" @click="mobileUserOptionsOpen = !mobileUserOptionsOpen" />
        </i>
        <!-- Mobile: User Options -->
        <div class="ff-navigation ff-navigation-right" :class="{'open': mobileUserOptionsOpen}">
            <nav-item v-for="option in options" :key="option.label"
                      :label="option.label" :icon="option.icon"
                      @click="mobileUserOptionsOpen = false; option.onclick(option.onclickparams)"></nav-item>
        </div>
        <div class="flex">
            <ff-team-selection />
            <!-- Desktop: User Options -->
            <ff-dropdown class="ff-navigation">
                <template v-slot:placeholder>
                    <div class="ff-user">
                        <img :src="user.avatar" class="ff-avatar"/>
                        <label>{{ user.name }}</label>
                    </div>
                </template>
                <template v-slot:default>
                    <ff-dropdown-option v-for="option in options" :key="option.label" @click="option.onclick(option.onclickparams)">
                        <nav-item :label="option.label" :icon="option.icon"></nav-item>
                    </ff-dropdown-option>
                </template>
            </ff-dropdown>
        </div>
    </div>
</template>
<script>
import { ref } from 'vue'
import { mapState } from 'vuex'
import router from '@/routes'

import { MenuIcon, QuestionMarkCircleIcon, AdjustmentsIcon, CogIcon, LogoutIcon } from '@heroicons/vue/solid'

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
        ...mapState('account', ['user', 'team'])
    },
    components: {
        NavItem,
        'ff-team-selection': TeamSelection,
        MenuIcon
    },
    data () {
        return {
            mobileUserOptionsOpen: false,
            options: [{
                label: 'User Settings',
                icon: CogIcon,
                onclick: this.$router.push,
                onclickparams: { name: 'User Settings' }
            }, {
                label: 'Documentation',
                icon: QuestionMarkCircleIcon,
                onclick: this.to,
                onclickparams: { url: 'https://flowforge.com/docs/' }
            }, {
                label: 'Sign Out',
                icon: LogoutIcon,
                onclick: this.signout
            }]
        }
    },
    setup () {
        const open = ref(false)
        return {
            open
        }
    },
    mounted () {
        if (this.user.admin) {
            this.options.splice(1, 0, {
                label: 'Admin Settings',
                icon: AdjustmentsIcon,
                onclick: this.$router.push,
                onclickparams: { name: 'Admin Settings' }
            })
        }
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
