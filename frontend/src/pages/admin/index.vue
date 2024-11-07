<template>
    <ff-page>
        <div class="">
            <router-view />
        </div>
    </ff-page>
</template>

<script>
import { ChatIcon, ChevronLeftIcon, CogIcon, CollectionIcon, ColorSwatchIcon, DatabaseIcon, DesktopComputerIcon, TemplateIcon, UserGroupIcon, UsersIcon } from '@heroicons/vue/solid'
import { mapState } from 'vuex'

import adminApi from '../../api/admin.js'

export default {
    name: 'AdminPage',
    components: {
    },
    data () {
        return {
            mounted: false,
            icons: {
                chevronLeft: ChevronLeftIcon
            }
        }
    },
    computed: {
        ...mapState('account', ['features', 'user', 'team']),
        navigation: function () {
            return [
                { name: 'Overview', path: { name: 'admin-overview' }, tag: 'admin-overview', icon: CollectionIcon },
                { name: 'Users', path: { name: 'admin-users' }, tag: 'admin-users', icon: UsersIcon },
                { name: 'Teams', path: { name: 'admin-teams' }, tag: 'admin-teams', icon: UserGroupIcon },
                { name: 'Team Types', path: { name: 'admin-team-types' }, tag: 'admin-teamtypes', icon: ColorSwatchIcon },
                { name: 'Instance Types', path: { name: 'admin-instance-types' }, tag: 'admin-instancetypes', icon: ColorSwatchIcon },
                { name: 'Stacks', path: { name: 'admin-stacks' }, tag: 'admin-stacks', icon: DesktopComputerIcon },
                { name: 'Templates', path: { name: 'admin-templates' }, tag: 'admin-templates', icon: TemplateIcon },
                { name: 'Flow Blueprints', path: { name: 'admin-flow-blueprints' }, tag: 'admin-flow-blueprints', icon: TemplateIcon, featureUnavailable: !this.features.flowBlueprints },
                { name: 'Activity', path: { name: 'admin-audit-logs' }, tag: 'admin-auditlog', icon: DatabaseIcon },
                { name: 'Notifications Hub', path: { name: 'NotificationsHub' }, tag: 'notifications-hub', icon: ChatIcon },
                { name: 'Settings', path: { name: 'admin-settings' }, tag: 'admin-settings', icon: CogIcon }
            ]
        }
    },
    async mounted () {
        try {
            await adminApi.getLicenseDetails()
        } catch (err) {
            if (err.response?.status === 403 || !err.response) {
                this.$router.push('/')
            } else {
                throw err
            }
        }
        this.mounted = true
    }
}
</script>

<style lang="scss">
@import "../../stylesheets/pages/admin.scss";
</style>
