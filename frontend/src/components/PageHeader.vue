<template>
    <div class="ff-header">
        <img src="@/images/ff-logo--wordmark-caps--dark.png"/>
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
</template>
<script>
import { ref } from 'vue'
import { mapState } from 'vuex'
import router from '@/routes'

import { QuestionMarkCircleIcon, AdjustmentsIcon, CogIcon, LogoutIcon } from '@heroicons/vue/solid'

import NavItem from '@/components/NavItem'

const navigation = router.options.routes.filter(r => r.navigationLink)
export default {
    name: 'NavBar',
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
        ...mapState('account', ['user'])
    },
    components: {
        NavItem
    },
    data () {
        return {
            options: [{
                label: 'User Settings',
                icon: CogIcon,
                onclick: this.$router.push,
                onclickparams: { name: 'User Settings' }
            }, {
                label: 'Admin Settings',
                icon: AdjustmentsIcon,
                onclick: this.$router.push,
                onclickparams: { name: 'Admin Settings' }
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
            open,
            navigation
        }
    },
    methods: {
        to (route) {
            window.open(route.url, '_blank')
        },
        signout () {
            this.$router.push({ name: 'Sign out' })
        }
    }
}

</script>
