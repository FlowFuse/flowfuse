<template>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <InfoCard v-if="isDevModeAvailable" header="Developer Mode Options:">
            <template #icon>
                <BeakerIcon />
            </template>
            <template #content>
                <InfoCardRow property="Editor Access:">
                    <template #value>
                        <div class="flex gap-9 items-center">
                            <div class="font-medium forge-badge" :class="'forge-status-' + (editorEnabled ? (editorTunnelConnected ? 'running' : 'error') : 'stopped')">
                                <span v-if="editorEnabled">
                                    <span v-if="editorTunnelConnected">enabled</span>
                                    <span v-else>not connected</span>
                                </span>
                                <span v-else>disabled</span>
                            </div>
                            <div class="space-x-2 flex align-center">
                                <ff-button
                                    v-if="editorEnabled"
                                    :disabled="!editorCanBeEnabled || closingTunnel || !editorEnabled"
                                    kind="primary"
                                    size="small"
                                    class="w-20 whitespace-nowrap"
                                    @click="closeTunnel"
                                >
                                    <span v-if="closingTunnel">Disabling...</span>
                                    <span v-else>Disable</span>
                                </ff-button>
                                <ff-button
                                    v-if="!editorEnabled"
                                    :disabled="!editorCanBeEnabled || openingTunnel || editorEnabled"
                                    kind="danger"
                                    size="small"
                                    class="w-20 whitespace-nowrap"
                                    @click="openTunnel"
                                >
                                    <span v-if="openingTunnel">Enabling...</span>
                                    <span v-else>Enable</span>
                                </ff-button>
                            </div>
                        </div>
                    </template>
                </InfoCardRow>
                <InfoCardRow v-if="autoSnapshotFeatureEnabled && deviceIsApplicationOwned" property="Auto Snapshot:">
                    <template #value>
                        <div class="flex gap-9 items-center">
                            <div class="font-medium forge-badge" :class="'forge-status-' + (autoSnapshotEnabled ? 'running' : 'stopped')">
                                <span v-if="autoSnapshotEnabled">enabled</span>
                                <span v-else>disabled</span>
                            </div>
                            <div class="space-x-2 flex align-center">
                                <ff-button
                                    v-if="autoSnapshotEnabled"
                                    v-ff-tooltip:bottom="'Automatically take a snapshot of the<br>device after every flow deployment.<br>Only the last 10 snapshots are kept'"
                                    :disabled="savingAutoSnapshotSetting || !autoSnapshotEnabled"
                                    kind="primary"
                                    size="small"
                                    class="w-20 whitespace-nowrap"
                                    @click="toggleAutoSnapshotSetting"
                                >
                                    <span v-if="savingAutoSnapshotSetting">Saving...</span>
                                    <span v-else>Disable</span>
                                </ff-button>
                                <ff-button
                                    v-if="!autoSnapshotEnabled"
                                    v-ff-tooltip:bottom="'Automatically take a snapshot of the<br>device after every flow deployment.<br>Only the last 10 snapshots are kept'"
                                    :disabled="savingAutoSnapshotSetting || autoSnapshotEnabled"
                                    kind="danger"
                                    size="small"
                                    class="w-20 whitespace-nowrap"
                                    @click="toggleAutoSnapshotSetting"
                                >
                                    <span v-if="savingAutoSnapshotSetting">Saving...</span>
                                    <span v-else>Enable</span>
                                </ff-button>
                            </div>
                        </div>
                    </template>
                </InfoCardRow>
                <InfoCardRow property="Device Flows:">
                    <template #value>
                        <div class="flex items-center">
                            <ff-button
                                :disabled="createSnapshotDisabled"
                                kind="secondary"
                                class="w-28 whitespace-nowrap"
                                size="small"
                                data-action="create-snapshot-dialog"
                                @click="showCreateSnapshotDialog"
                            >
                                Create Snapshot
                            </ff-button>
                            <span v-if="createSnapshotDisabled" class="ff-description ml-2">A device must first be assigned to an Application or Instance in order to create snapshots.</span>
                        </div>
                    </template>
                </InfoCardRow>
            </template>
        </InfoCard>
        <SnapshotCreateDialog ref="snapshotCreateDialog" data-el="dialog-create-device-snapshot" :device="device" :show-set-as-target="true" @device-upload-success="onSnapshotCreated" @device-upload-failed="onSnapshotFailed" @canceled="onSnapshotCancel" />
    </div>
</template>

<script>
import { BeakerIcon } from '@heroicons/vue/outline'
import semver from 'semver'
import { mapState } from 'vuex'

import deviceApi from '../../../api/devices.js'

// components
import InfoCard from '../../../components/InfoCard.vue'
import InfoCardRow from '../../../components/InfoCardRow.vue'
import alerts from '../../../services/alerts.js'
import SnapshotCreateDialog from '../dialogs/SnapshotCreateDialog.vue'

export default {
    name: 'DeviceDeveloperMode',
    components: {
        BeakerIcon,
        InfoCard,
        InfoCardRow,
        SnapshotCreateDialog
    },
    props: {
        device: {
            type: Object,
            required: true
        },
        closingTunnel: {
            type: Boolean,
            default: false
        },
        openingTunnel: {
            type: Boolean,
            default: false
        }
    },
    emits: ['close-tunnel', 'open-tunnel'],
    data () {
        return {
            agentSupportsDeviceAccess: false,
            busy: false,
            savingAutoSnapshotSetting: false,
            autoSnapshotEnabled: false
        }
    },
    computed: {
        ...mapState('account', ['team', 'teamMembership', 'features']),
        developerMode: function () {
            return this.device?.mode === 'developer'
        },
        isDevModeAvailable: function () {
            return !!this.features.deviceEditor
        },
        editorEnabled: function () {
            return !!this.device?.editor?.enabled
        },
        editorTunnelConnected: function () {
            return !!this.device?.editor?.connected
        },
        editorCanBeEnabled: function () {
            return this.developerMode && this.device.status === 'running'
        },
        createSnapshotDisabled () {
            return this.device.ownerType !== 'application' && this.device.ownerType !== 'instance'
        },
        autoSnapshotFeatureEnabledForTeam () {
            return !!this.team.type.properties.features?.deviceAutoSnapshot
        },
        autoSnapshotFeatureEnabledForPlatform () {
            return this.features.deviceAutoSnapshot
        },
        autoSnapshotFeatureEnabled () {
            return this.autoSnapshotFeatureEnabledForTeam && this.autoSnapshotFeatureEnabledForPlatform
        },
        deviceIsApplicationOwned () {
            return this.device.ownerType === 'application'
        }
    },
    watch: {
        'device.mode': function () {
            if (this.device.mode !== 'developer') {
                this.redirect()
            }
        }
    },
    mounted () {
        this.agentSupportsDeviceAccess = this.device?.agentVersion && semver.gt(this.device.agentVersion, '0.6.1')
        // check developer mode enabled
        if (this.device && this.device.mode !== 'developer') {
            this.redirect()
        }
        this.getSettings()
    },
    methods: {
        redirect () {
            this.$router.push({ name: 'Device', params: { id: this.device.id } })
        },
        async openTunnel () {
            if (this.device.status === 'running') {
                this.$emit('open-tunnel')
            } else {
                alerts.emit('The device must be in "running" state to access the editor', 'warning', 7500)
            }
        },
        async closeTunnel () {
            this.$emit('close-tunnel')
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
        async toggleAutoSnapshotSetting () {
            try {
                this.savingAutoSnapshotSetting = true
                await deviceApi.updateSettings(this.device.id, { autoSnapshot: !this.autoSnapshotEnabled })
                this.autoSnapshotEnabled = !this.autoSnapshotEnabled
            } finally {
                this.savingAutoSnapshotSetting = false
            }
        },
        async getSettings () {
            if (this.device) {
                const settings = await deviceApi.getSettings(this.device.id)
                this.autoSnapshotEnabled = settings.autoSnapshot
            }
        }
    }
}
</script>
