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
                    <div class="space-x-6">
                        <DeviceLastSeenBadge :last-seen-at="device.lastSeenAt" :last-seen-ms="device.lastSeenMs" :last-seen-since="device.lastSeenSince" />
                        <StatusBadge :status="device.status" />
                        <DeveloperModeBadge v-if="isDevModeAvailable && device.mode === 'developer'" />
                    </div>
                </template>
                <template #context>
                    <div v-if="device?.ownerType === 'application' && device.application" data-el="device-assigned-application">
                        Application:
                        <router-link :to="{name: 'Application', params: {id: device.application.id}}" class="text-blue-600 cursor-pointer hover:text-blue-700 hover:underline">{{ device.application.name }}</router-link>
                    </div>
                    <div v-else-if="device?.ownerType === 'instance' && device.instance" data-el="device-assigned-instance">
                        Instance:
                        <router-link :to="{name: 'Instance', params: {id: device.instance.id}}" class="text-blue-600 cursor-pointer hover:text-blue-700 hover:underline">{{ device.instance.name }}</router-link>
                    </div>
                    <div v-else data-el="device-assigned-none">
                        <span class="italic">No Application or Instance Assigned</span> - <a class="ff-link" data-action="assign-device" @click="openAssignmentDialog">Assign</a>
                    </div>
                </template>
                <template v-if="isDevModeAvailable" #tools>
                    <div class="space-x-2 flex align-center">
                        <button v-if="editorAvailable && !isVisitingAdmin" data-action="open-editor" class="ff-btn ff-btn--secondary" @click="openTunnel(true)">
                            Device Editor
                            <span class="ff-btn--icon ff-btn--icon-right">
                                <ExternalLinkIcon />
                            </span>
                        </button>
                        <DeveloperModeToggle data-el="device-devmode-toggle" :device="device" @mode-change="setDeviceMode" />
                    </div>
                </template>
            </SectionNavigationHeader>
        </div>
        <div class="sm:px-6 mt-4 sm:mt-8">
            <Teleport v-if="mounted && isVisitingAdmin" to="#platform-banner">
                <div class="ff-banner" data-el="banner-device-as-admin">You are viewing this device as an Administrator</div>
            </Teleport>
            <div class="px-3 pb-3 md:px-6 md:pb-6">
                <router-view :instance="device.instance" :closingTunnel="closingTunnel" :openingTunnel="openingTunnel" :device="device" @device-updated="loadDevice" @close-tunnel="closeTunnel" @open-tunnel="openTunnel" @device-refresh="loadDevice" @assign-device="openAssignmentDialog" />
            </div>
        </div>
        <!-- Dialogs -->
        <!-- device tunnel connecting -->
        <ff-dialog ref="dialog" data-el="establish-device-tunnel-dialog" header="Preparing the connection...">
            <template #default>
                <div class="flex flex-col ml-6 mr-6">
                    <div class="mb-4">
                        <p>Connecting. Please wait...</p>
                    </div>
                    <div class="flex justify-between items-center">
                        <div class="flex text-center">
                            <img class="h-16 w-16" src="../../images/pictograms/cloud_teal.png">
                        </div>
                        <div class="flex-grow m-4">
                            <div class="w-full">
                                <div class="h-1 w-full bg-teal-200 overflow-hidden">
                                    <div kind="secondary" class="progress w-full h-full bg-teal-800 left-right" />
                                </div>
                            </div>
                        </div>
                        <div class="flex text-center">
                            <img class="h-16 w-16" src="../../images/pictograms/devices_red.png">
                        </div>
                    </div>
                </div>
            </template>
            <template #actions>
                <ff-button data-action="tunnel-connect-cancel" kind="secondary" class="ml-4" @click="closeTunnel()">Cancel</ff-button>
            </template>
        </ff-dialog>
        <AssignDeviceDialog
            v-if="notAssigned"
            ref="assignment-dialog"
            data-el="assignment-dialog"
            @assign-option-selected="assignOptionSelected"
        />
        <DeviceAssignInstanceDialog
            v-if="notAssigned"
            ref="deviceAssignInstanceDialog"
            data-el="assignment-dialog-instance"
            @assign-device="assignDeviceToInstance"
        />
        <DeviceAssignApplicationDialog
            v-if="notAssigned"
            ref="deviceAssignApplicationDialog"
            data-el="assignment-dialog-application"
            @assign-device="assignDeviceToApplication"
        />
    </main>
</template>

<script>

import { ExternalLinkIcon } from '@heroicons/vue/outline'
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
import Alerts from '../../services/alerts.js'

import DeviceAssignApplicationDialog from '../team/Devices/dialogs/DeviceAssignApplicationDialog.vue'
import DeviceAssignInstanceDialog from '../team/Devices/dialogs/DeviceAssignInstanceDialog.vue'

import AssignDeviceDialog from './components/AssignDeviceDialog.vue'

import DeveloperModeBadge from './components/DeveloperModeBadge.vue'
import DeveloperModeToggle from './components/DeveloperModeToggle.vue'
import DeviceLastSeenBadge from './components/DeviceLastSeenBadge.vue'

export default {
    name: 'DevicePage',
    components: {
        ExternalLinkIcon,
        DeveloperModeToggle,
        DeveloperModeBadge,
        DeviceLastSeenBadge,
        SectionNavigationHeader,
        SideNavigationTeamOptions,
        StatusBadge,
        SubscriptionExpiredBanner,
        TeamTrialBanner,
        AssignDeviceDialog,
        DeviceAssignApplicationDialog,
        DeviceAssignInstanceDialog
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
            agentSupportsDeviceAccess: false,
            openingTunnel: false,
            closingTunnel: false
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
                this.device.status === 'running'
        },
        tunnelReady: function () {
            return this.editorAvailable &&
                this.deviceEditorURL &&
                this.device.editor?.connected
        },
        deviceEditorURL: function () {
            return this.device.editor?.url || ''
        },
        notAssigned () {
            const device = this.device
            const hasApplication = device?.ownerType === 'application' && device.application
            const hasInstance = device?.ownerType === 'instance' && device.instance
            return !hasApplication && !hasInstance
        }
    },
    watch: {
        'device.mode': function () {
            if (this.isDevModeAvailable && this.device.mode === 'developer') {
                this.navigation.push({
                    label: 'Developer Mode',
                    to: `/device/${this.$route.params.id}/developer-mode`,
                    tag: 'device-devmode'
                })
            } else {
                // check if developer mode in the list of options
                const index = this.navigation.findIndex((item) => item.tag === 'device-devmode')
                if (index > -1) {
                    this.navigation.splice(index, 1)
                }
            }
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
            if (this.device?.ownerType !== 'instance') {
                this.navigation.splice(1, 0, {
                    label: 'Snapshots',
                    to: `/device/${this.$route.params.id}/snapshots`,
                    tag: 'device-snapshots'
                })
            }
        },
        showOpenEditorDialog: async function () {
            this.$refs['open-editor-dialog'].show()
        },
        setDeviceMode: async function (newMode, callback) {
            try {
                if (newMode !== 'autonomous' && newMode !== 'developer') {
                    throw new Error('Unsupported mode')
                }
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
                callback(null, setModeResult)
            } catch (error) {
                if (callback) {
                    callback(error)
                } else {
                    throw new Error('Unknown mode')
                }
            }
        },
        openAssignmentDialog () {
            this.$refs['assignment-dialog'].show()
        },
        assignOptionSelected (option) {
            if (option === 'instance') {
                this.$refs.deviceAssignInstanceDialog.show(this.device)
            } else if (option === 'application') {
                this.$refs.deviceAssignApplicationDialog.show(this.device)
            }
        },
        async assignDeviceToInstance (device, instanceId) {
            this.device = await deviceApi.updateDevice(device.id, { instance: instanceId })

            Alerts.emit('Device successfully assigned to instance.', 'confirmation')
        },

        async assignDeviceToApplication (device, applicationId) {
            this.device = await deviceApi.updateDevice(device.id, { application: applicationId, instance: null })

            Alerts.emit('Device successfully assigned to application.', 'confirmation')
        },
        openEditor () {
            window.open(this.deviceEditorURL, `device-editor-${this.device.id}`)
        },
        async openTunnel (launchEditor = false) {
            if (this.device.status === 'running') {
                if (this.device.editor?.enabled && this.device.editor?.connected) {
                    this.openEditor()
                } else {
                    this.openingTunnel = true
                    this.$refs.dialog.show()
                    try {
                        // * Enable Device Editor (Step 1) - (browser->frontendApi) User clicks button to "Enable Editor"
                        const result = await deviceApi.enableEditorTunnel(this.device.id)
                        this.updateTunnelStatus(result)
                        setTimeout(() => {
                            this.loadDevice()
                            if (launchEditor && this.device.editor?.enabled && this.device.editor?.connected) {
                                this.openEditor()
                            }
                            this.$refs.dialog.close()
                        }, 500)
                    } finally {
                        this.openingTunnel = false
                    }
                }
            } else {
                Alerts.emit('The device must be in "running" state to access the editor', 'warning', 7500)
            }
        },
        async closeTunnel () {
            this.closingTunnel = true
            this.$refs.dialog.close()
            try {
                const result = await deviceApi.disableEditorTunnel(this.device.id)
                this.updateTunnelStatus(result)
                this.loadDevice(this.loadDevice())
            } finally {
                this.closingTunnel = false
            }
        },
        updateTunnelStatus (status) {
            this.device.editor = this.device.editor || {}
            this.device.editor.url = status.url
            this.device.editor.enabled = !!status.enabled
            this.device.editor.connected = !!status.connected
        }
    }
}
</script>

<style scoped>
.progress {
    animation: progress 1s infinite linear;
}

.left-right {
    transform-origin: 0% 50%;
}
    @keyframes progress {
    0% {
        transform:  translateX(0) scaleX(0);
    }
    40% {
        transform:  translateX(0) scaleX(0.4);
    }
    100% {
        transform:  translateX(100%) scaleX(0.5);
    }
}
</style>
