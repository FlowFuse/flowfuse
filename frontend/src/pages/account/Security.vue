<template>
    <div class="flex flex-col sm:flex-row flex-1 h-full w-full">
        <SectionSideMenu :options="sideNavigation" />
        <div class="flex-grow">
            <router-view />
        </div>
    </div>
</template>

<script>
import { mapState } from 'vuex'

import SectionSideMenu from '../../components/SectionSideMenu.vue'

export default {
    name: 'AccountSecurity',
    components: {
        SectionSideMenu
    },
    computed: {
        ...mapState('account', ['user', 'features']),
        sideNavigation () {
            const navigation = [
                { name: 'Password', path: '/account/security/password' },
                { name: 'Tokens', path: '/account/security/tokens' }
                // { name: "Sessions", path: "/account/security/sessions" }
            ]
            if (this.features.mfa) {
                navigation.splice(1, 0, { name: 'Two-Factor Authentication', path: '/account/security/mfa' })
            }
            return navigation
        }
    }
}
</script>
