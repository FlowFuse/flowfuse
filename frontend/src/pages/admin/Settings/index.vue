<template>
    <div class="clear-page-gutters">
        <div class="ff-instance-header">
            <ff-page-header title="Settings" :tabs="sideNavigation" />
        </div>
        <div class="px-3 py-3 md:px-6 md:py-6">
            <div class="flex-grow">
                <router-view />
            </div>
        </div>
    </div>
</template>

<script>
import { mapState } from 'vuex'

export default {
    name: 'AdminSettings',
    computed: {
        ...mapState('account', ['features']),
        sideNavigation () {
            return [
                { label: 'General', to: { name: 'admin-settings-general' }, tag: 'general' },
                { label: 'License', to: { name: 'admin-settings-license' }, tag: 'license' },
                { label: 'Email', to: { name: 'admin-settings-email' }, tag: 'email' },
                { label: 'SSO', to: { name: 'admin-settings-sso' }, hidden: !this.features.sso }
            ]
        }
    }
}
</script>

<style lang="scss" scoped>
.clear-page-gutters {
    margin: -1.75rem
}
</style>
