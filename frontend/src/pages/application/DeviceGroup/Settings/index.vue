<template>
    <div class="mb-3">
        <SectionTopMenu hero="Device Group Settings" info="" />
    </div>
    <div class="flex flex-col sm:flex-row ml-6">
        <SectionSideMenu :options="sideNavigation" />
        <div class="flex-grow">
            <router-view :deviceGroup="deviceGroup" :application="application" @device-group-updated="onDeviceGroupUpdated" />
        </div>
    </div>
</template>

<script>
import { useRouter } from 'vue-router'
import { mapState } from 'vuex'

import SectionSideMenu from '../../../../components/SectionSideMenu.vue'
import SectionTopMenu from '../../../../components/SectionTopMenu.vue'

import permissionsMixin from '../../../../mixins/Permissions.js'

export default {
    name: 'DeviceGroupSettings',
    components: {
        SectionSideMenu, SectionTopMenu
    },
    mixins: [permissionsMixin],
    props: {
        application: {
            type: Object,
            required: true
        },
        deviceGroup: {
            type: Object,
            required: true
        }
    },
    emits: ['device-group-updated'],
    data: function () {
        return {
            sideNavigation: []
        }
    },
    computed: {
        ...mapState('account', ['teamMembership', 'team'])
    },
    watch: {
        deviceGroup: function (newVal, oldVal) {
            this.checkAccess()
        }
    },
    mounted () {
        this.checkAccess()
    },
    methods: {
        checkAccess: async function () {
            if (!this.teamMembership) {
                useRouter().push({ replace: true, path: 'overview' })
                return false
            }
            this.sideNavigation = [
                { name: 'General', path: { name: 'ApplicationDeviceGroupSettingsGeneral' } },
                { name: 'Environment', path: { name: 'ApplicationDeviceGroupSettingsEnvironment' } }
            ]
            return true
        },
        onDeviceGroupUpdated: function () {
            this.$emit('device-group-updated')
        }
    }
}
</script>
