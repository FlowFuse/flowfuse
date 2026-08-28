<template>
    <ff-page>
        <template #header>
            <ff-page-header :title="$t('ui.users')" :tabs="sideNavigation" />
        </template>
        <router-view />
    </ff-page>
</template>

<script>

import { t } from '../../../i18n.js'
const sideNavigation = [
    { label: t('ui.users'), to: { name: 'admin-users-general' } },
    { label: t('ui.invitations'), to: { name: 'admin-users-invitations' } }
]

export default {
    name: 'AdminUsers',
    setup () {
        return {
            sideNavigation
        }
    }
}
</script>

<style lang="scss" scoped>
</style>
