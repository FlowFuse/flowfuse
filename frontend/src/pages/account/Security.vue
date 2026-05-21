<template>
    <div class="flex flex-col sm:flex-row">
        <SectionSideMenu :options="sideNavigation" />
        <div class="grow">
            <router-view />
        </div>
    </div>
</template>

<script>

import { mapState } from 'pinia'

import SectionSideMenu from '../../components/SectionSideMenu.vue'

import { useAccountSettingsStore } from '@/stores/account-settings.js'

export default {
    name: 'AccountSecurity',
    components: {
        SectionSideMenu
    },
    computed: {
        ...mapState(useAccountSettingsStore, ['features']),
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
