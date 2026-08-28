<template>
    <ff-page>
        <template #header>
            <ff-page-header :title="$t('ui.settings')" :tabs="sideNavigation" />
        </template>
        <div class="grow">
            <router-view />
        </div>
    </ff-page>
</template>

<script>
import { mapState } from 'pinia'

import { t } from '../../../i18n.js'

import { useAccountSettingsStore } from '@/stores/account-settings.js'

export default {
    name: 'AdminSettings',
    computed: {
        ...mapState(useAccountSettingsStore, ['features']),
        sideNavigation () {
            return [
                { label: t('ui.general'), to: { name: 'admin-settings-general' }, tag: 'general' },
                { label: t('ui.license'), to: { name: 'admin-settings-license' }, tag: 'license' },
                { label: t('ui.email'), to: { name: 'admin-settings-email' }, tag: 'email' },
                { label: t('ui.sso'), to: { name: 'admin-settings-sso' }, hidden: !this.features.sso }
            ]
        }
    }
}
</script>

<style lang="scss" scoped>
</style>
