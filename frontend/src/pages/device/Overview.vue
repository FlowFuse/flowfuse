<template>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div class="border rounded p-4">
            <FormHeading>
                <div class="mb-2">
                    <WifiIcon class="w-6 h-6 mr-2 inline text-gray-400" />
                    Connection
                </div>
            </FormHeading>

            <table class="table-fixed w-full" v-if="device">
                <tr class="border-b">
                    <td class="w-1/4 font-medium">Last Seen</td>
                    <td class="py-2">
                        <DeviceLastSeenBadge :last-seen-at="lastSeenAt" :last-seen-ms="lastSeenMs" :last-seen-since="lastSeenSince" />
                    </td>
                </tr>
                <tr class="border-b">
                    <td class="w-1/4 font-medium">Status</td>
                    <td class="py-2">
                        <StatusBadge :status="device.status"/>
                    </td>
                </tr>
            </table>
        </div>
        <div class="border rounded p-4">
            <FormHeading>
                <div class="mb-2">
                    <TemplateIcon class="w-6 h-6 mr-2 inline text-gray-400" />
                    Deployment
                </div>
            </FormHeading>

            <table class="table-fixed w-full" v-if="device">
                <tr class="border-b">
                    <td class="w-1/4 font-medium">Application</td>
                    <td class="py-2">
                        <router-link v-if="device?.project" :to="{name: 'Application', params: { id: device.project.id }}">
                            {{ device.project?.name }}
                        </router-link>
                        <span v-else>None</span>
                    </td>
                </tr>
                <!-- TODO: Currently links to same object as project -->
                <tr class="border-b">
                    <td class="w-1/4 font-medium">Instance</td>
                    <td class="py-2">
                        <router-link v-if="device?.project" :to="{name: 'Instance', params: { id: device.project.id }}">
                            {{ device.project?.name }}
                        </router-link>
                        <span v-else>None</span>
                    </td>
                </tr>
                <tr class="border-b">
                    <td class="w-1/4 font-medium">Active Snapshot</td>
                    <td class="py-2 flex">
                        <span class="flex space-x-4 pr-2">
                            <span class="flex items-center space-x-2 text-gray-500 italic">
                                <ExclamationIcon class="text-yellow-600 w-4" v-if="!device.activeSnapshot || !targetSnapshotDeployed" />
                                <CheckCircleIcon class="text-green-700 w-4" v-else />
                            </span>
                        </span>
                        <template v-if="device.activeSnapshot">
                            <div class="flex flex-col">
                                <span>{{ device.activeSnapshot.name }}</span>
                                <span class="text-xs text-gray-500">{{ device.activeSnapshot.id }}</span>
                            </div>
                        </template>
                        <template v-else>
                            No Snapshot Deployed
                        </template>
                    </td>
                </tr>
                <tr class="border-b">
                    <td class="w-1/4 font-medium">Target Snapshot</td>
                    <td class="py-2 flex">
                        <span class="flex space-x-4 pr-2">
                            <span class="flex items-center space-x-2 text-gray-500 italic">
                                <ExclamationIcon class="text-yellow-600 w-4" v-if="!device.targetSnapshot" />
                                <CheckCircleIcon class="text-green-700 w-4" v-else />
                            </span>
                        </span>
                        <template v-if="device.targetSnapshot">
                            <div class="flex flex-col">
                                <span>{{ device.targetSnapshot.name }}</span>
                                <span class="text-xs text-gray-500">{{ device.targetSnapshot.id }}</span>
                            </div>
                        </template>
                        <template v-else>
                            No Target Snapshot Set
                        </template>
                    </td>
                </tr>
                <tr v-if="developerMode" class="border-b">
                    <td class="w-1/4 font-medium">Device Mode</td>
                    <td class="py-2">
                        <span class="flex space-x-2 pr-2">
                            <BeakerIcon class="text-yellow-600 w-4" />
                            <span> Developer Mode </span>
                        </span>
                    </td>
                </tr>
            </table>
        </div>
        <div v-if="developerMode && isLicensed" class="border rounded p-4">
            <FormHeading>
                <div class="flex flex-wrap mb-2">
                    <div>
                        <AdjustmentsIcon class="w-6 h-6 mr-2 inline text-gray-400" />
                        Device Options
                    </div>
                    <div class="font-normal text-sm pt-1.5 ml-9 text-gray-500 flex-col">Developer Mode Only</div>
                </div>
            </FormHeading>
            <table class="table-fixed w-full" v-if="device">
                <tr class="border-b">
                    <td class="w-1/4 font-medium">Editor Access</td>
                    <td class="w-26 font-medium uppercase">
                        <div class="forge-badge" :class="'forge-status-' + (editorEnabled ? 'running' : 'stopped')">
                            <span v-if="editorEnabled">Enabled</span><span v-else>Disabled</span>
                        </div>
                    </td>
                    <td class="w-38 py-2">
                        <div class="space-x-2 flex align-center">
                            <ff-button
                                v-if="editorEnabled"
                                :disabled="closingTunnel || !editorEnabled"
                                kind="primary"
                                class="sm:w-36 w-20"
                                @click="closeTunnel"
                            >
                                <span v-if="closingTunnel">Disabling...</span>
                                <span v-else>Disable</span>
                            </ff-button>
                            <ff-button
                                v-if="!editorEnabled"
                                :disabled="openingTunnel || editorEnabled"
                                kind="danger"
                                class="sm:w-36 w-20"
                                @click="openTunnel"
                            >
                                <span v-if="openingTunnel">Enabling...</span>
                                <span v-else>Enable</span>
                            </ff-button>
                        </div>
                    </td>
                    <td class="w-1/4 md:w-1/3">&nbsp;</td>
                </tr>
                <tr class="border-b">
                    <td class="w-1/4 font-medium">Device Flows</td>
                    <td class="w-26 font-medium">&nbsp;</td>
                    <td class="w-38 py-2">
                        <ff-button
                            kind="secondary"
                            class="sm:w-36 w-20"
                            @click="showCreateSnapshotDialog"
                        >
                            Create Snapshot
                        </ff-button>
                    </td>
                    <td class="w-1/4 md:w-1/3">&nbsp;</td>
                </tr>
            </table>
            <SnapshotCreateDialog ref="snapshotCreateDialog" data-el="dialog-create-device-snapshot" :device="device" @device-upload-success="onSnapshotCreated" @device-upload-failed="onSnapshotFailed" @canceled="onSnapshotCancel" />
        </div>
    </div>
</template>

<script>

// utilities
import semver from 'semver'

// api
import deviceApi from '../../api/devices.js'

// components
import FormHeading from '../../components/FormHeading.vue'
import StatusBadge from '../../components/StatusBadge.vue'
import SnapshotCreateDialog from './dialogs/SnapshotCreateDialog.vue'
import DeviceLastSeenBadge from './components/DeviceLastSeenBadge.vue'
import alerts from '../../services/alerts.js'
import { mapState } from 'vuex'

// icons
import { AdjustmentsIcon, BeakerIcon, CheckCircleIcon, ExclamationIcon, TemplateIcon, WifiIcon } from '@heroicons/vue/outline'

export default {
    name: 'DeviceOverview',
    emits: ['device-updated', 'device-refresh'],
    props: ['device'],
    components: {
        AdjustmentsIcon,
        BeakerIcon,
        CheckCircleIcon,
        ExclamationIcon,
        WifiIcon,
        TemplateIcon,
        DeviceLastSeenBadge,
        FormHeading,
        StatusBadge,
        SnapshotCreateDialog
    },
    computed: {
        ...mapState('account', ['settings']),
        targetSnapshotDeployed: function () {
            return this.device.activeSnapshot?.id === this.device.targetSnapshot?.id
        },
        isLicensed () {
            return !!this.settings['platform:licensed']
        },
        developerMode: function () {
            return this.device?.mode === 'developer'
        },
        editorAvailable: function () {
            return this.isLicensed && this.agentSupportsDeviceAccess && this.developerMode && this.device?.status === 'running'
        },
        editorEnabled: function () {
            return !!this.device?.tunnelEnabled
        }
    },
    data () {
        return {
            agentSupportsDeviceAccess: false,
            busy: false,
            openingTunnel: false,
            closingTunnel: false,
            lastSeenAt: this.device?.lastSeenAt || '',
            lastSeenMs: this.device?.lastSeenMs || 0,
            lastSeenSince: this.device?.lastSeenSince || ''
        }
    },
    mounted () {
        this.refreshDevice()
        this.agentSupportsDeviceAccess = this.device?.agentVersion && semver.gt(this.device.agentVersion, '0.6.1')
    },
    methods: {
        refreshDevice: function () {
            this.$emit('device-refresh') // cause parent to refresh device
            // on next tick, update our local data
            this.$nextTick(() => {
                this.lastSeenAt = this.device?.lastSeenAt || ''
                this.lastSeenMs = this.device?.lastSeenMs || 0
                this.lastSeenSince = this.device?.lastSeenSince || ''
            })
        },
        showCreateSnapshotDialog () {
            this.busy = true
            this.$refs.snapshotCreateDialog.show()
        },
        async onSnapshotCreated (snapshot) {
            alerts.emit('Successfully created snapshot from the device.', 'confirmation')
            this.busy = false
        },
        onSnapshotCancel () {
            this.busy = false
        },
        async onSnapshotFailed (err) {
            console.error(err.response?.data)
            if (err.response?.data) {
                if (/name/.test(err.response.data.error)) {
                    this.errors.name = err.response.data.error
                    return
                }
            }
            alerts.emit('Failed to create snapshot from the device.', 'warning')
            this.busy = false
        },
        async openTunnel () {
            this.openingTunnel = true
            try {
                // * Enable Device Editor (Step 1) - (browser->frontendApi) User clicks button to "Enable Editor"
                const result = await deviceApi.enableEditorTunnel(this.device.id)
                this.updateTunnelStatus(result)
                setTimeout(() => {
                    this.$emit('device-updated')
                }, 500)
            } finally {
                this.openingTunnel = false
            }
        },
        async closeTunnel () {
            this.closingTunnel = true
            try {
                const result = await deviceApi.disableEditorTunnel(this.device.id)
                this.updateTunnelStatus(result)
                this.$emit('device-updated')
            } finally {
                this.closingTunnel = false
            }
        },
        updateTunnelStatus (status) {
            // TODO: this is a hack to get the tunnel URL into the device object
            //       so that the editor can use it.  This should be refactored
            //       to use a Vuex store or something.
            // eslint-disable-next-line vue/no-mutating-props
            this.device.tunnelUrl = status.url
            // eslint-disable-next-line vue/no-mutating-props
            this.device.tunnelUrlWithToken = status.tunnelUrlWithToken
            // eslint-disable-next-line vue/no-mutating-props
            this.device.tunnelEnabled = !!status.url
            // use the tunnel-changed event to notify the parent component
        }
    }
}
</script>
