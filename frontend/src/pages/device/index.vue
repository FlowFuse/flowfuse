<template>
    <Teleport v-if="mounted" to="#platform-sidenav">
        <SideNavigationTeamOptions />
    </Teleport>
    <main v-if="device" class="ff-with-status-header">
        <Teleport v-if="mounted" to="#platform-banner">
            <SubscriptionExpiredBanner :team="team" />
            <TeamTrialBanner v-if="team.billing?.trial" :team="team" />
        </Teleport>
        <div class="ff-instance-header">
            <SectionNavigationHeader :tabs="navigation">
                <template #breadcrumbs>
                    <ff-nav-breadcrumb :to="{name: 'TeamDevices', params: {team_slug: team.slug}}">Devices</ff-nav-breadcrumb>
                    <ff-nav-breadcrumb>{{ device.name }}</ff-nav-breadcrumb>
                </template>
                <template #status>
                    <DeviceLastSeenBadge class="mr-6" :last-seen-at="device.lastSeenAt" :last-seen-ms="device.lastSeenMs" :last-seen-since="device.lastSeenSince" />
                    <StatusBadge :status="device.status" />
                </template>
                <template #parent>
                    <div v-if="device?.instance">
                        Instance:
                        <router-link :to="{name: 'Instance', params: {id: device.instance.id}}" class="text-blue-600 cursor-pointer hover:text-blue-700 hover:underline">{{ device.instance.name }}</router-link>
                    </div>
                    <span v-else class="text-gray-400 italic">Device Not Assigned to an Instance</span>
                </template>
                <template v-if="isDevModeAvailable" #tools>
                    <div class="space-x-2 flex align-center">
                        <a v-if="editorAvailable && !isVisitingAdmin" class="ff-btn ff-btn--secondary" :href="deviceEditorURL" :target="`device-editor-${device.id}`" data-action="device-editor">
                            Device Editor
                            <span class="ff-btn--icon ff-btn--icon-right">
                                <ExternalLinkIcon />
                            </span>
                        </a>
                        <button v-else class="ff-btn ff-btn--secondary" disabled>
                            Editor Disabled
                            <span class="ff-btn--icon ff-btn--icon-right">
                                <ExternalLinkIcon />
                            </span>
                        </button>
                        <ff-button :disabled="hasPermission('device:edit') !== true || !(device?.instance || device?.application)" :kind="developerMode?'primary':'secondary'" data-action="toggle-mode" @click="showModeChoiceDialog()">
                            Developer Mode
                            <template #icon-right>
                                <BeakerIcon />
                            </template>
                        </ff-button>
                    </div>
                </template>
            </SectionNavigationHeader>
        </div>
        <div class="text-sm sm:px-6 mt-4 sm:mt-8">
            <Teleport v-if="mounted && isVisitingAdmin" to="#platform-banner">
                <div class="ff-banner" data-el="banner-device-as-admin">You are viewing this device as an Administrator</div>
            </Teleport>
            <div class="px-3 pb-3 md:px-6 md:pb-6">
                <router-view :instance="device.instance" :device="device" @device-updated="loadDevice()" @device-refresh="loadDevice()" />
            </div>
        </div>
        <ModeChoiceDialog ref="mode-choice-dialog" :device="device" @mode-change="setDeviceMode" />
    </main>
</template>

<script>

import { BeakerIcon, ExternalLinkIcon } from '@heroicons/vue/outline'
import { TerminalIcon } from '@heroicons/vue/solid'
import semver from 'semver'
import { mapState } from 'vuex'

import { Roles } from '../../../../forge/lib/roles.js'
import deviceApi from '../../api/devices.js'
import SectionNavigationHeader from '../../components/SectionNavigationHeader.vue'
import SideNavigationTeamOptions from '../../components/SideNavigationTeamOptions.vue'
import StatusBadge from '../../components/StatusBadge.vue'
import SubscriptionExpiredBanner from '../../components/banners/SubscriptionExpired.vue'
import TeamTrialBanner from '../../components/banners/TeamTrial.vue'
import permissionsMixin from '../../mixins/Permissions.js'

import DeviceLastSeenBadge from './components/DeviceLastSeenBadge.vue'
import ModeChoiceDialog from './dialogs/ModeChoiceDialog.vue'

export default {
    name: 'DevicePage',
    components: {
        BeakerIcon,
        ExternalLinkIcon,
        DeviceLastSeenBadge,
        SectionNavigationHeader,
        ModeChoiceDialog,
        SideNavigationTeamOptions,
        StatusBadge,
        SubscriptionExpiredBanner,
        TeamTrialBanner
    },
    mixins: [permissionsMixin],
    data: function () {
        const navigation = [
            { label: 'Overview', to: `/device/${this.$route.params.id}/overview`, tag: 'device-overview' },
            // snapshots - added in mounted, if device is owned by an application,
            // device logs - added in mounted, if project comms is enabled,
            { label: 'Settings', to: `/device/${this.$route.params.id}/settings`, tag: 'device-settings' }
        ]

        return {
            mounted: false,
            device: null,
            navigation,
            agentSupportsDeviceAccess: false
        }
    },
    computed: {
        ...mapState('account', ['teamMembership', 'team', 'features', 'settings']),
        isVisitingAdmin: function () {
            // return true
            return this.teamMembership.role === Roles.Admin
        },
        isDevModeAvailable: function () {
            return !!this.features.deviceEditor
        },
        developerMode: function () {
            return this.device && this.agentSupportsDeviceAccess && this.device.mode === 'developer'
        },
        editorAvailable: function () {
            return this.isDevModeAvailable &&
                this.device &&
                this.agentSupportsDeviceAccess &&
                this.developerMode &&
                this.device.status === 'running' &&
                this.deviceEditorURL &&
                this.device.editor?.connected
        },
        deviceEditorURL: function () {
            return this.device.editor?.url || ''
        }
    },
    async mounted () {
        this.mounted = true
        await this.loadDevice()
        this.checkFeatures()
    },
    methods: {
        loadDevice: async function () {
            this.device = await deviceApi.getDevice(this.$route.params.id)
            this.agentSupportsDeviceAccess = this.device.agentVersion && semver.gte(this.device.agentVersion, '0.8.0')
            this.$store.dispatch('account/setTeam', this.device.team.slug)
        },
        checkFeatures: async function () {
            if (this.features.projectComms) {
                this.navigation.splice(1, 0, {
                    label: 'Device Logs',
                    to: `/device/${this.$route.params.id}/logs`,
                    tag: 'device-logs',
                    icon: TerminalIcon
                })
            }
            if (this.device?.ownerType === 'application') {
                this.navigation.splice(1, 0, {
                    label: 'Snapshots',
                    to: `/device/${this.$route.params.id}/snapshots`,
                    tag: 'device-snapshots'
                })
            }
        },
        showModeChoiceDialog: function () {
            this.$refs['mode-choice-dialog'].show()
        },
        showOpenEditorDialog: async function () {
            this.$refs['open-editor-dialog'].show()
        },
        setDeviceMode: async function (newMode) {
            if (newMode === 'autonomous' || newMode === 'developer') {
                // call to close tunnel regardless of selected mode being set
                const disableResult = await deviceApi.disableEditorTunnel(this.device.id)
                // set the selected mode
                const setModeResult = await deviceApi.setMode(this.device.id, newMode)
                // update the device properties to reflect immediate status
                this.device.editor = {
                    enabled: !!disableResult?.editor?.enabled,
                    connected: !!disableResult?.editor?.connected,
                    url: disableResult?.editor?.url
                }
                this.device.mode = setModeResult?.mode
            } else {
                throw new Error('Unknown mode')
            }
        }
    }
}
</script>
