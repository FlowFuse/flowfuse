<template>
    <ff-page>
        <template #header>
            <ff-page-header title="Settings" :tabs="sideNavigation" />
        </template>
        <div class="flex-grow">
            <router-view />
        </div>
    </ff-page>
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
</style>
