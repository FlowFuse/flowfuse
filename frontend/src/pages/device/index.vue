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
                        <InstanceStatusBadge :status="device.status" />
                        <div class="w-full text-sm mt-1">
                            <div v-if="device?.project">
                                Instance:
                                <router-link :to="{name: 'Instance', params: {id: device.project.id}}" class="text-blue-600 cursor-pointer hover:text-blue-700 hover:underline">{{ device.project.name }}</router-link>
                            </div>
                            <span v-else class="text-gray-400 italic">Device Not Assigned to an Instance</span>
                        </div>
                    </div>
                </template>
                <template #tools>
                    <div class="space-x-2 flex align-center">
                        <ff-button v-if="!isVisitingAdmin" kind="secondary" data-action="open-editor" :disabled="!editorAvailable()" @click="openEditor()">
                            <template #icon-right>
                                <ExternalLinkIcon />
                            </template>
                            {{ !device.status === 'running' ? 'Editor Not Available' : 'Open Editor' }}
                        </ff-button>
                        <button v-else title="Unable to open editor when visiting as an admin" class="ff-btn ff-btn--secondary">
                            Open Editor
                            <span class="ff-btn--icon ff-btn--icon-right">
                                <ExternalLinkIcon />
                            </span>
                        </button>
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
import { ExternalLinkIcon } from '@heroicons/vue/outline'
import { ChipIcon, CogIcon, TerminalIcon } from '@heroicons/vue/solid'
import semver from 'semver'
import { mapState } from 'vuex'

import { Roles } from '../../../../forge/lib/roles.js'

import deviceApi from '../../api/devices.js'

import InstanceStatusHeader from '../../components/InstanceStatusHeader.vue'
import NavItem from '../../components/NavItem.vue'
import SideNavigationTeamOptions from '../../components/SideNavigationTeamOptions.vue'
import SubscriptionExpiredBanner from '../../components/banners/SubscriptionExpired.vue'
import TeamTrialBanner from '../../components/banners/TeamTrial.vue'
import Dialog from '../../services/dialog.js'
import InstanceStatusBadge from '../instance/components/InstanceStatusBadge.vue'

import DeviceLastSeenBadge from './components/DeviceLastSeenBadge.vue'

export default {
    name: 'DevicePage',
    components: {
        ExternalLinkIcon,
        NavItem,
        InstanceStatusHeader,
        InstanceStatusBadge,
        DeviceLastSeenBadge,
        SideNavigationTeamOptions,
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
        },
        openEditor: async function () {
            Dialog.show({
                header: 'Notice',
                text: 'The Device Editor is only for debugging, changes will not be stored to the snapshot'
            }, async () => {
                // open editor
                const data = await deviceApi.startEditor(this.device.id)
                console.error(data.url)
                window.open(data.url, '_blank')
            })
        },
        editorAvailable: function () {
            if (this.features.projectComms) {
                return this.device.status === 'running' && (this.device.agentVersion && semver.gt(this.device.agentVersion, '0.6.1'))
            }
            return false
        }
    }
}
</script>
