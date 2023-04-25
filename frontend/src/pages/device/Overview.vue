<template>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div class="border rounded p-4">
            <FormHeading>
                <WifiIcon class="w-6 h-6 mr-2 inline text-gray-400" />
                Connection
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
                <TemplateIcon class="w-6 h-6 mr-2 inline text-gray-400" />
                Deployment
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
                <tr class="border-b">
                    <td class="w-1/4 font-medium">Device Mode</td>
                    <td class="py-2">
                        <span class="flex space-x-2 pr-2">
                            <BeakerIcon class="text-yellow-600 w-4" v-if="device?.mode === 'developer'" />
                            <LinkIcon class="text-green-700 w-4" v-else />
                            <span> {{ device?.mode }} </span>
                        </span>
                    </td>
                </tr>
            </table>
        </div>
        <div v-if="developerMode" class="border rounded p-4">
            <FormHeading>
                <AdjustmentsIcon class="w-6 h-6 mr-2 inline text-gray-400" />
                Developer Options
            </FormHeading>
            <table class="table-fixed w-full" v-if="device">
                <tr class="border-b">
                    <td class="w-1/2 font-medium">Device Editor Access</td>
                    <td class="py-2">
                        <div class="space-x-2 flex align-center">
                            <ff-button
                                :disabled="busy || !editorEnabled"
                                kind="danger"
                                class="mr-2"
                                @click="closeTunnel"
                            >
                                Disable
                            </ff-button>
                            <ff-button
                                :disabled="busy || editorEnabled"
                                kind="danger"
                                class="mr-2"
                                @click="openTunnel"
                            >
                                Enable
                            </ff-button>
                        </div>
                    </td>
                </tr>
                <tr class="border-b">
                    <td class="w-1/2 font-medium">Device Flows</td>
                    <td class="py-2">
                        <ff-button
                            :disabled="busy"
                            kind="secondary"
                            class="mr-2"
                            @click="showCreateSnapshotDialog"
                        >
                            Create Snapshot
                        </ff-button>
                    </td>
                </tr>
            </table>
            <SnapshotCreateDialog ref="snapshotCreateDialog" data-el="dialog-create-device-snapshot" :device="device" @device-upload-success="onSnapshotCreated" @device-upload-failed="onSnapshotFailed" @canceled="onSnapshotCancel" />
        </div>
    </div>
</template>

<script>

// utilities
import { mixin as VueTimers } from 'vue-timers'

import deviceApi from '../../api/devices.js'
import semver from 'semver'

// components
import FormHeading from '../../components/FormHeading.vue'
import StatusBadge from '../../components/StatusBadge.vue'
import SnapshotCreateDialog from './dialogs/SnapshotCreateDialog.vue'
import DeviceLastSeenBadge from './components/DeviceLastSeenBadge.vue'
import alerts from '../../services/alerts.js'

// icons
import { AdjustmentsIcon, BeakerIcon, CheckCircleIcon, ExclamationIcon, LinkIcon, TemplateIcon, WifiIcon } from '@heroicons/vue/outline'

export default {
    name: 'DeviceOverview',
    emits: ['device-updated', 'device-refresh'],
    props: ['device'],
    components: {
        AdjustmentsIcon,
        BeakerIcon,
        CheckCircleIcon,
        ExclamationIcon,
        LinkIcon,
        WifiIcon,
        TemplateIcon,
        DeviceLastSeenBadge,
        FormHeading,
        StatusBadge,
        SnapshotCreateDialog
    },
    computed: {
        targetSnapshotDeployed: function () {
            return this.device.activeSnapshot?.id === this.device.targetSnapshot?.id
        },
        developerMode: function () {
            return this.device?.mode === 'developer'
        },
        editorAvailable: function () {
            return this.agentSupportsDeviceAccess && this.developerMode && this.device?.status === 'running'
        },
        editorEnabled: function () {
            return !!this.device?.tunnelEnabled
        }
    },
    mixins: [VueTimers],
    data () {
        return {
            agentSupportsDeviceAccess: false,
            busy: false,
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
            // * Enable Device Editor (Step 1) - (browser->frontendApi) User clicks button to "Enable Editor"
            const result = await deviceApi.enableEditorTunnel(this.device.id)
            // TODO: this is a hack to get the tunnel URL into the device object
            //       so that the editor can use it.  This should be refactored
            //       to use a Vuex store or something.
            // eslint-disable-next-line vue/no-mutating-props
            this.device.tunnelUrl = result.url
            // eslint-disable-next-line vue/no-mutating-props
            this.device.tunnelUrlWithToken = result.urlWithToken
            // eslint-disable-next-line vue/no-mutating-props
            this.device.tunnelEnabled = !!result.url
            setTimeout(() => {
                this.$emit('device-updated')
            }, 500)
        },
        async closeTunnel () {
            const result = await deviceApi.disableEditorTunnel(this.device.id)

            // TODO: this is a hack to get the tunnel URL into the device object
            //       so that the editor can use it.  This should be refactored
            //       to use a Vuex store or something.
            // eslint-disable-next-line vue/no-mutating-props
            this.device.tunnelUrl = result.url
            // eslint-disable-next-line vue/no-mutating-props
            this.device.tunnelUrlWithToken = result.tunnelUrlWithToken
            // eslint-disable-next-line vue/no-mutating-props
            this.device.tunnelEnabled = !!result.url

            // use the tunnel-changed event to notify the parent component
            this.$emit('device-updated')
        }
    }
}
</script>
