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
import { Roles } from '@core/lib/roles'

export default {
    name: 'DeviceSettins',
    props: ['device'],
    emits: ['device-updated'],
    data: function () {
        return {
            sideNavigation: []
        }
    },
    computed: {
        ...mapState('account', ['teamMembership', 'team']),
        isOwner: function () {
            return this.teamMembership.role === Roles.Owner
        }
    },
    mounted () {
        this.checkAccess()
    },
    methods: {
        checkAccess: async function () {
            this.sideNavigation = [
                { name: 'General', path: './general' },
                { name: 'Environment', path: './environment' }
            ]
            if (this.teamMembership && this.teamMembership.role === Roles.Owner) {
                this.sideNavigation.push({ name: 'Danger', path: './danger' })
            }
            if (!this.teamMembership || (this.teamMembership.role !== Roles.Owner && this.teamMembership.role !== Roles.Member)) {
                useRouter().push({ replace: true, path: 'overview' })
            }
        }
    },
    components: {
        SectionSideMenu
    }
}
</script>
