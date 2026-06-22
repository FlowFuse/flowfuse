<template>
    <ff-page>
        <template #header>
            <ff-page-header title="Settings" :tabs="sideOptions">
                <template #context>
                    View and manage the settings of your team.
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
                { label: 'General', to: './general' },
                { label: 'Provisioning', to: './devices' },
                { label: 'Integrations', to: './integrations' },
                { label: 'Danger', to: './danger' }
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
