<template>
    <ff-page>
        <template #header>
            <ff-page-header :title="$t('ui.settings')" :tabs="sideOptions">
                <template #context>
                    {{ $t('ui.viewAndManageTheSettingsOfYourTeam') }}
                </template>
            </ff-page-header>
        </template>
        <div class="flex flex-col sm:flex-row">
            <div class="grow pt-4">
                <router-view />
            </div>
        </div>
    </ff-page>
</template>

<script>
import { mapState } from 'pinia'
import { useRouter } from 'vue-router'

import usePermissions from '../../../composables/Permissions.js'

import { t } from '../../../i18n.js'

import { useContextStore } from '@/stores/context.js'

export default {
    name: 'TeamSettings',
    setup () {
        const { hasPermission } = usePermissions()

        return { hasPermission }
    },
    data: function () {
        return {
            sideOptions: [
                { label: t('ui.general'), to: './general' },
                { label: t('ui.provisioning'), to: './devices' },
                { label: t('ui.integrations'), to: './integrations' },
                { label: t('ui.danger'), to: './danger' }
            ]
        }
    },
    computed: {
        ...mapState(useContextStore, ['team', 'teamMembership'])
    },
    watch: {
        teamMembership: 'checkAccess'
    },
    mounted () {
        this.checkAccess()
    },
    methods: {
        checkAccess: async function () {
            if (!this.hasPermission('team:edit')) {
                useRouter().push({ path: `/team/${this.team.slug}/overview` })
            }
        }
    }
}
</script>
