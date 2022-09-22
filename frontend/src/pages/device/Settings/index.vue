<template>
    <div class="flex flex-col sm:flex-row">
        <SectionSideMenu :options="sideNavigation" />
        <div class="flex-grow">
            <router-view :device="device" @device-updated="$emit('device-updated')"></router-view>
        </div>
    </div>
</template>

<script>
import SectionSideMenu from '@/components/SectionSideMenu'

import { mapState } from 'vuex'
import { useRouter } from 'vue-router'
import permissionsMixin from '@/mixins/Permissions'

export default {
    name: 'DeviceSettins',
    props: ['device'],
    emits: ['device-updated'],
    mixins: [permissionsMixin],
    data: function () {
        return {
            sideNavigation: []
        }
    },
    computed: {
        ...mapState('account', ['teamMembership', 'team'])
    },
    mounted () {
        this.checkAccess()
    },
    methods: {
        checkAccess: async function () {
            if (!this.teamMembership) {
                useRouter().push({ replace: true, path: 'overview' })
                return
            }
            this.sideNavigation = [
                { name: 'General', path: './general' },
                { name: 'Environment', path: './environment' }
            ]
            if (this.hasPermission('device:edit')) {
                this.sideNavigation.push({ name: 'Danger', path: './danger' })
            }
        }
    },
    components: {
        SectionSideMenu
    }
}
</script>
