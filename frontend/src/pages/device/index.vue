<template>
    <Teleport v-if="mounted" to="#platform-sidenav">
        <SideNavigationTeamOptions>
            <template #nested-menu>
                <div class="ff-nested-title">Device</div>
                <!-- <div class="ff-nested-title">{{ project.name }}</div> -->
                <router-link v-for="route in navigation" :key="route.label" :to="route.path" :data-nav="route.tag">
                    <nav-item :icon="route.icon" :label="route.label" />
                </router-link>
            </template>
        </SideNavigationTeamOptions>
    </Teleport>
    <main class="ff-with-status-header">
        <Teleport v-if="mounted" to="#platform-banner">
            <div v-if="isVisitingAdmin" class="ff-banner" data-el="banner-project-as-admin">You are viewing this team as an Administrator</div>
            <SubscriptionExpiredBanner :team="team" />
            <TeamTrialBanner v-if="team.billing?.trial" :team="team" />
        </Teleport>
        <div class="ff-instance-header">
            <InstanceStatusHeader>
                <template #hero>
                    <div class="flex-grow items-center inline-flex flex-wrap" data-el="device-name">
                        <div class="text-gray-800 text-xl font-bold mr-6">
                            {{ device.name }}
                        </div>
                        <DeviceLastSeenBadge class="mr-6" :last-seen-at="device.lastSeenAt" :last-seen-ms="device.lastSeenMs" :last-seen-since="device.lastSeenSince" />
                        <StatusBadge :status="device.status" />
                        <div class="w-full text-sm mt-1">
                            <div v-if="device?.project">
                                Instance:
                                <router-link :to="{name: 'Instance', params: {id: device.project.id}}" class="text-blue-600 cursor-pointer hover:text-blue-700 hover:underline">{{ device.project.name }}</router-link>
                            </div>
                            <span v-else class="text-gray-400 italic">Device Not Assigned to an Instance</span>
                        </div>
                    </div>
                </template>
            </InstanceStatusHeader>
        </div>
        <div class="text-sm sm:px-6 mt-4 sm:mt-8">
            <Teleport v-if="mounted && isVisitingAdmin" to="#platform-banner">
                <div class="ff-banner" data-el="banner-device-as-admin">You are viewing this device as an Administrator</div>
            </Teleport>
            <div class="px-3 pb-3 md:px-6 md:pb-6">
                <router-view :instance="device.project" :device="device" @device-updated="loadDevice()" />
            </div>
        </div>
    </main>
</template>

<script>
// APIs
import { ChipIcon, CogIcon, TerminalIcon } from '@heroicons/vue/solid'
import { mapState } from 'vuex'

import { Roles } from '../../../../forge/lib/roles.js'

import deviceApi from '../../api/devices.js'

import InstanceStatusHeader from '../../components/InstanceStatusHeader.vue'
import NavItem from '../../components/NavItem.vue'
import SideNavigationTeamOptions from '../../components/SideNavigationTeamOptions.vue'
import StatusBadge from '../../components/StatusBadge.vue'
import SubscriptionExpiredBanner from '../../components/banners/SubscriptionExpired.vue'
import TeamTrialBanner from '../../components/banners/TeamTrial.vue'

import DeviceLastSeenBadge from './components/DeviceLastSeenBadge.vue'

export default {
    name: 'DevicePage',
    components: {
        DeviceLastSeenBadge,
        InstanceStatusHeader,
        NavItem,
        SideNavigationTeamOptions,
        StatusBadge,
        SubscriptionExpiredBanner,
        TeamTrialBanner
    },
    data: function () {
        const navigation = [
            { label: 'Overview', path: `/device/${this.$route.params.id}/overview`, tag: 'device-overview', icon: ChipIcon },
            // { label: 'Device Logs', path: `/device/${this.$route.params.id}/logs`, tag: 'device-logs', icon: TerminalIcon },
            { label: 'Settings', path: `/device/${this.$route.params.id}/settings`, tag: 'device-settings', icon: CogIcon }
        ]

        return {
            mounted: false,
            device: null,
            navigation
        }
    },
    computed: {
        ...mapState('account', ['teamMembership', 'team', 'features']),
        isVisitingAdmin: function () {
            return this.teamMembership.role === Roles.Admin
        }
    },
    mounted () {
        this.checkFeatures()
        this.mounted = true
        this.loadDevice()
    },
    methods: {
        loadDevice: async function () {
            const device = await deviceApi.getDevice(this.$route.params.id)
            this.device = device
            this.$store.dispatch('account/setTeam', this.device.team.slug)
        },
        checkFeatures: async function () {
            if (this.features.projectComms) {
                this.navigation.splice(1, 0, {
                    label: 'Device Logs',
                    path: `/device/${this.$route.params.id}/logs`,
                    tag: 'device-logs',
                    icon: TerminalIcon
                })
            }
        }
    }
}
</script>
