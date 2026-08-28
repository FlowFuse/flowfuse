<template>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <InfoCard v-if="isDevModeAvailable" :header="$t('ui.developerModeOptions')">
            <template #icon>
                <BeakerIcon />
            </template>
            <template #content>
                <InfoCardRow v-if="!isImmersiveEditor" :property="$t('ui.editorAccess')">
                    <template #value>
                        <div class="flex gap-9 items-center">
                            <div class="font-medium forge-badge" :class="'forge-status-' + (editorEnabled ? (editorTunnelConnected ? 'running' : 'error') : 'stopped')">
                                <span v-if="editorEnabled">
                                    <span v-if="editorTunnelConnected">{{ $t('ui.enabled2') }}</span>
                                    <span v-else>{{ $t('ui.notConnected') }}</span>
                                </span>
                                <span v-else>{{ $t('ui.disabled') }}</span>
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
                                    <span v-if="closingTunnel">{{ $t('ui.disabling') }}</span>
                                    <span v-else>{{ $t('ui.disable') }}</span>
                                </ff-button>
                                <ff-button
                                    v-if="!editorEnabled"
                                    :disabled="!editorCanBeEnabled || openingTunnel || editorEnabled"
                                    kind="danger"
                                    size="small"
                                    class="w-20 whitespace-nowrap"
                                    @click="openTunnel"
                                >
                                    <span v-if="openingTunnel">{{ $t('ui.enabling') }}</span>
                                    <span v-else>{{ $t('ui.enable') }}</span>
                                </ff-button>
                            </div>
                        </div>
                    </template>
                </InfoCardRow>
                <InfoCardRow v-if="autoSnapshotFeatureEnabled && deviceIsApplicationOwned" :property="$t('ui.autoSnapshot')">
                    <template #value>
                        <div class="flex gap-9 items-center">
                            <div class="font-medium forge-badge" :class="'forge-status-' + (autoSnapshotEnabled ? 'running' : 'stopped')">
                                <span v-if="autoSnapshotEnabled">{{ $t('ui.enabled2') }}</span>
                                <span v-else>{{ $t('ui.disabled') }}</span>
                            </div>
                            <div class="space-x-2 flex align-center">
                                <ff-button
                                    v-if="autoSnapshotEnabled"
                                    v-ff-tooltip:bottom="$t('ui.autoSnapshotTooltip')"
                                    :disabled="savingAutoSnapshotSetting || !autoSnapshotEnabled"
                                    kind="primary"
                                    size="small"
                                    class="w-20 whitespace-nowrap"
                                    @click="toggleAutoSnapshotSetting"
                                >
                                    <span v-if="savingAutoSnapshotSetting">{{ $t('ui.saving') }}</span>
                                    <span v-else>{{ $t('ui.disable') }}</span>
                                </ff-button>
                                <ff-button
                                    v-if="!autoSnapshotEnabled"
                                    v-ff-tooltip:bottom="$t('ui.autoSnapshotTooltip')"
                                    :disabled="savingAutoSnapshotSetting || autoSnapshotEnabled"
                                    kind="danger"
                                    size="small"
                                    class="w-20 whitespace-nowrap"
                                    @click="toggleAutoSnapshotSetting"
                                >
                                    <span v-if="savingAutoSnapshotSetting">{{ $t('ui.saving') }}</span>
                                    <span v-else>{{ $t('ui.enable') }}</span>
                                </ff-button>
                            </div>
                        </div>
                    </template>
                </InfoCardRow>
                <InfoCardRow :property="$t('ui.deviceFlows')">
                    <template #value>
                        <div class="flex items-center">
                            <ff-button
                                :disabled="createSnapshotDisabled"
                                kind="secondary"
                                class="whitespace-nowrap"
                                size="small"
                                data-action="create-snapshot-dialog"
                                @click="showCreateSnapshotDialog"
                            >
                                {{ $t('ui.createSnapshot') }}
                            </ff-button>
                            <span v-if="createSnapshotDisabled" class="ff-description ml-2">{{ $t('ui.aDeviceMustFirstBeAssignedToAnApplicationOrInsta') }}</span>
                        </div>
                    </template>
                </InfoCardRow>
            </template>
        </InfoCard>
        <SnapshotCreateDialog ref="snapshotCreateDialog" data-el="dialog-create-device-snapshot" :device="device" :show-set-as-target="true" @device-upload-success="onSnapshotCreated" @device-upload-failed="onSnapshotFailed" @canceled="onSnapshotCancel" />
    </div>
</template>

<script>
import { BeakerIcon } from '@heroicons/vue/24/outline'
import { mapState } from 'pinia'
import semver from 'semver'

import deviceApi from '../../../api/devices.js'

// components
import InfoCard from '../../../components/InfoCard.vue'
import InfoCardRow from '../../../components/InfoCardRow.vue'
import { t } from '../../../i18n.js'
import alerts from '../../../services/alerts.js'
import SnapshotCreateDialog from '../dialogs/SnapshotCreateDialog.vue'

import { useAccountSettingsStore } from '@/stores/account-settings.js'
import { useContextStore } from '@/stores/context.js'

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
        ...mapState(useContextStore, ['team']),
        ...mapState(useAccountSettingsStore, ['features']),
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
        },
        isImmersiveEditor () {
            return this.$route.name === 'device-editor-developer-mode'
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
            this.$router.push({ name: 'device', params: { id: this.device.id } })
        },
        async openTunnel () {
            if (this.device.status === 'running') {
                this.$emit('open-tunnel')
            } else {
                alerts.emit(t('ui.theDeviceMustBeInRunningStateToAccessTheEditor'), 'warning', 7500)
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
            alerts.emit(t('ui.successfullyCreatedSnapshotFromTheDevice'), 'confirmation')
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
            alerts.emit(t('ui.failedToCreateSnapshotFromTheDevice'), 'warning')
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
