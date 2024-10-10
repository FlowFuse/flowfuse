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
    data () {
        return {
            sideNavigation: [
                { label: 'General', to: './general', tag: 'general' },
                { label: 'License', to: './license', tag: 'license' },
                { label: 'Email', to: './email', tag: 'email' }
            ]
        }
    },
    computed: {
        ...mapState('account', ['features'])
    },
    mounted () {
        if (this.features.sso) {
            this.sideNavigation.push({ label: 'SSO', to: './sso' })
        }
    }
}
</script>

<style lang="scss" scoped>
.clear-page-gutters {
    margin: -1.75rem
}
</style>
