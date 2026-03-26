<template>
    <div class="flex flex-col sm:flex-row flex-1 overflow-auto">
        <SectionSideMenu :options="sideNav" />
        <div class="flex-grow flex-1 flex flex-col overflow-auto">
            <router-view :device="device" @device-updated="$emit('device-updated')" @assign-device="$emit('assign-device')" />
        </div>
    </div>
</template>

<script>
import { mapState } from 'pinia'
import { useRouter } from 'vue-router'

import SectionSideMenu from '../../../components/SectionSideMenu.vue'
import usePermissions from '../../../composables/Permissions.js'

import { useAccountTeamStore } from '@/stores/account-team.js'

export default {
    name: 'DeviceSettings',
    props: ['device'],
    emits: ['device-updated', 'device-refresh', 'assign-device'],
    setup () {
        const { hasPermission } = usePermissions()

        return { hasPermission }
    },
    data: function () {
        return {
            sideNavigation: []
        }
    },
    computed: {
        ...mapState(useAccountTeamStore, ['teamMembership']),
        sideNav () {
            const canEditDevice = this.hasPermission('device:edit', { application: this.device.application })
            const isApplicationOwned = this.device.ownerType === 'application'

            const nav = [
                { name: 'General', path: { name: 'device-settings-general', props: { id: this.device.id } } },
                { name: 'Environment', path: { name: 'device-settings-environment' } },
                { name: 'Editor', path: { name: 'device-settings-editor' }, hidden: !(canEditDevice && isApplicationOwned) },
                { name: 'Security', path: { name: 'device-settings-security' }, hidden: !(canEditDevice && isApplicationOwned) },
                { name: 'Palette', path: { name: 'device-settings-palette' }, hidden: !(canEditDevice && isApplicationOwned) },
                { name: 'Danger', path: { name: 'device-settings-danger' }, hidden: !canEditDevice }
            ]

            if (!this.$route.name.includes('-editor-')) return nav

            return nav.map(route => ({
                ...route,
                path: {
                    ...route.path,
                    name: route.path.name.replace('device-', 'device-editor-')
                }
            }))
        }
    },
    async mounted () {
        // compensate for the time it takes for the device to load when reloading the page or accessing the page via URL
        while (!this.device) await new Promise(resolve => setTimeout(resolve, 250))

        if (this.checkAccess()) {
            // device state polling is disabled on settings pages (in ../index.vue:pollTimer())
            // so we need to manually refresh the device upon mounting
            this.$emit('device-refresh')
        }
    },
    methods: {
        checkAccess: async function () {
            if (!this.teamMembership) {
                useRouter().push({ replace: true, path: 'overview' })
                return false
            }
        }
    },
    watch: {
        device: function (newVal, oldVal) {
            this.checkAccess()
        }
    },
    components: {
        SectionSideMenu
    }
}
</script>
