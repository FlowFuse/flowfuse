<template>
    <Teleport v-if="mounted" to="#platform-sidenav">
        <SideNavigationTeamOptions>
            <template v-slot:nested-menu>
                <div class="ff-nested-title">Device</div>
                <!-- <div class="ff-nested-title">{{ project.name }}</div> -->
                <router-link v-for="route in navigation" :key="route.label" :to="route.path" :data-nav="route.tag">
                    <nav-item :icon="route.icon" :label="route.label"></nav-item>
                </router-link>
            </template>
        </SideNavigationTeamOptions>
    </Teleport>
    <main>
        <SectionTopMenu>
            <template #hero>
                <div class="flex-grow space-x-6 items-center inline-flex">
                    <router-link :to="navigation[0]?navigation[0].path:''" class="inline-flex items-center" data-nav="device-overview">
                        <div class="text-gray-800 text-xl font-bold">{{ device?.name }}</div>
                        <div class="text-gray-400 text-md font-bold ml-3">{{ device?.type }}</div>
                    </router-link>
                </div>
            </template>
        </SectionTopMenu>
        <div class="text-sm sm:px-6 mt-4 sm:mt-8">
            <Teleport v-if="mounted && isVisitingAdmin" to="#platform-banner">
                <div class="ff-banner" data-el="banner-device-as-admin">You are viewing this device as an Administrator</div>
            </Teleport>
            <router-view :device="device" @device-updated="loadDevice()"></router-view>
        </div>
    </main>
</template>

<script>
// APIs
import deviceApi from '@/api/devices'

import { mapState } from 'vuex'
import { Roles } from '@core/lib/roles'

// components
import NavItem from '@/components/NavItem'
import SectionTopMenu from '@/components/SectionTopMenu'
import SideNavigationTeamOptions from '@/components/SideNavigationTeamOptions'

// icons
import { ChipIcon, CogIcon } from '@heroicons/vue/solid'

export default {
    name: 'DevicePage',
    components: {
        NavItem,
        SectionTopMenu,
        SideNavigationTeamOptions
    },
    data: function () {
        const navigation = [
            { label: 'Overview', path: `/device/${this.$route.params.id}/overview`, tag: 'device-overview', icon: ChipIcon },
            { label: 'Settings', path: `/device/${this.$route.params.id}/settings`, tag: 'device-settings', icon: CogIcon }
        ]

        return {
            mounted: false,
            device: null,
            navigation
        }
    },
    computed: {
        ...mapState('account', ['teamMembership', 'team']),
        isVisitingAdmin: function () {
            return this.teamMembership.role === Roles.Admin
        }
    },
    mounted () {
        this.mounted = true
        this.loadDevice()
    },
    methods: {
        loadDevice: async function () {
            const device = await deviceApi.getDevice(this.$route.params.id)
            this.device = device
            this.$store.dispatch('account/setTeam', this.device.team.slug)
        }
    }
}
</script>
