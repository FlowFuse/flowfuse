<template>
    <div class="flex flex-col sm:flex-row">
        <SectionSideMenu :options="sideNavigation" />
        <div class="flex-grow">
            <router-view :device="device" @device-updated="$emit('device-updated')" @assign-device="$emit('assign-device')" />
        </div>
    </div>
</template>

<script>
import { useRouter } from 'vue-router'
import { mapState } from 'vuex'

import SectionSideMenu from '../../../components/SectionSideMenu.vue'
import usePermissions from '../../../composables/Permissions.js'

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
        ...mapState('account', ['teamMembership'])
    },
    mounted () {
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
            this.sideNavigation = [
                { name: 'General', path: './general' },
                { name: 'Environment', path: './environment' }
            ]
            if (this.hasPermission('device:edit', { application: this.device.application })) {
                if (this.device.ownerType === 'application') {
                    this.sideNavigation.push({ name: 'Security', path: './security' })
                    this.sideNavigation.push({ name: 'Palette', path: './palette' })
                }
                this.sideNavigation.push({ name: 'Danger', path: './danger' })
            }
            return true
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
