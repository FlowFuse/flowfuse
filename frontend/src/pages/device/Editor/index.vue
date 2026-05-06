<template>
    <div class="ff--immersive-editor-wrapper remote-instance" :class="{resizing: isEditorResizing}">
        <EditorDrawer
            :navigation="navigation"
            :is-expert-route="isExpertRoute"
            :entity="device"
            @resizing="v => isEditorResizing = v"
        >
            <template #actions>
                <DropdownMenu
                    v-if="hasPermission('device:change-status', permissionContext) && actionsDropdownOptions.length"
                    :options="actionsDropdownOptions"
                    :button-style="{padding: '6px 9px'}"
                    data-el="device-actions-dropdown"
                    buttonClass="ff-btn ff-btn--primary device-actions-dropdown"
                >
                    <CogIcon class="ff-btn--icon ff-btn--icon-left mr-0" />
                </DropdownMenu>
            </template>

            <router-view
                :device="device"
                :instance="device?.instance"
                @device-updated="refreshDevice"
                @assign-device="openAssignmentDialog"
            />
        </EditorDrawer>

        <div class="ff-layout--immersive--content">
            <EditorWrapper
                :disable-events="isEditorResizing"
                :device="device"
            />

            <DrawerTrigger
                :is-hidden="editorImmersiveDrawer.state"
                @toggle="toggleEditorImmersiveDrawer"
            />
        </div>

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
    </div>
</template>

<script>
import { CogIcon } from '@heroicons/vue/solid/index.js'
import { mapActions, mapState } from 'pinia'

import deviceApi from '../../../api/devices.js'
import DropdownMenu from '../../../components/DropdownMenu.vue'
import ExpertTabIcon from '../../../components/icons/ff-minimal-grey.js'
import DrawerTrigger from '../../../components/immersive-editor/DrawerTrigger.vue'
import EditorDrawer from '../../../components/immersive-editor/EditorDrawer.vue'
import EditorWrapper from '../../../components/immersive-editor/RemoteInstanceEditorWrapper.vue'
import { useDeviceHelper } from '../../../composables/DeviceHelper.js'
import usePermissions from '../../../composables/Permissions.js'
import Alerts from '../../../services/alerts.js'

import DeviceAssignApplicationDialog from '../../team/Devices/dialogs/DeviceAssignApplicationDialog.vue'
import DeviceAssignInstanceDialog from '../../team/Devices/dialogs/DeviceAssignInstanceDialog.vue'

import AssignDeviceDialog from '../components/AssignDeviceDialog.vue'

import { useAccountSettingsStore } from '@/stores/account-settings.js'
import { useAccountStore } from '@/stores/account.js'
import { useContextStore } from '@/stores/context.js'
import { useUxDrawersStore } from '@/stores/ux-drawers.js'

export default {
    name: 'DeviceEditor',
    components: {
        AssignDeviceDialog,
        CogIcon,
        DeviceAssignApplicationDialog,
        DeviceAssignInstanceDialog,
        DropdownMenu,
        DrawerTrigger,
        EditorDrawer,
        EditorWrapper
    },
    setup () {
        const { hasPermission } = usePermissions()

        const {
            device,
            bindDevice,
            fetchDevice,
            restartDevice,
            showDeleteDialog: showDeleteDeviceDialog,
            isPolling,
            isInTransitionState: isDeviceInTransitionState,
            startPolling,
            stopPolling,
            resumePolling,
            pausePolling,
            getDeviceEditorProxy
        } = useDeviceHelper()

        return {
            device,
            hasPermission,
            restartDevice,
            bindDevice,
            fetchDevice,
            isPolling,
            isDeviceInTransitionState,
            startPolling,
            stopPolling,
            resumePolling,
            pausePolling,
            showDeleteDeviceDialog,
            getDeviceEditorProxy
        }
    },
    data () {
        return {
            isEditorResizing: false
        }
    },
    computed: {
        ...mapState(useAccountSettingsStore, ['features', 'featuresCheck']),
        ...mapState(useUxDrawersStore, ['editorImmersiveDrawer']),
        isExpertRoute () {
            return this.$route.name === 'device-editor-expert'
        },
        isDevModeAvailable: function () {
            return !!this.features.deviceEditor
        },
        isEditorAvailable () {
            return this.device &&
                Object.prototype.hasOwnProperty.call(this.device, 'editor') &&
                Object.prototype.hasOwnProperty.call(this.device.editor, 'connected') &&
                this.device.editor.connected
        },
        navigation () {
            if (!this.device) return []

            return [
                {
                    label: 'Expert',
                    to: {
                        name: 'device-editor-expert',
                        params: { id: this.device.id }
                    },
                    tag: 'device-expert',
                    icon: ExpertTabIcon,
                    hidden: !this.featuresCheck.isExpertAssistantFeatureEnabled
                },
                {
                    label: 'Overview',
                    to: { name: 'device-editor-overview' },
                    tag: 'device-overview'
                },
                {
                    label: 'Version History',
                    to: {
                        name: 'device-editor-version-history',
                        params: { id: this.$route.params.id }
                    },
                    tag: 'version-history'
                },
                {
                    label: 'Audit Log',
                    to: { name: 'device-editor-audit-log' },
                    tag: 'device-audit-log'
                },
                {
                    label: 'Node-RED Logs',
                    to: { name: 'device-editor-logs' },
                    tag: 'device-logs'
                },
                {
                    label: 'Performance',
                    to: { name: 'device-editor-performance' },
                    tag: 'device-performance'
                },
                {
                    label: 'Settings',
                    to: { name: 'device-editor-settings' },
                    tag: 'device-settings'
                },
                {
                    label: 'Developer Mode',
                    to: { name: 'device-editor-developer-mode' },
                    tag: 'device-devmode',
                    hidden: !(this.isDevModeAvailable && this.device.mode === 'developer')
                }
            ]
        },
        permissionContext () {
            if (this.device?.ownerType === 'application' || this.device?.ownerType === 'instance') {
                return { application: this.device.application }
            }
            return {}
        },
        notAssigned () {
            const device = this.device
            const hasApplication = device?.ownerType === 'application' && device.application
            const hasInstance = device?.ownerType === 'instance' && device.instance
            return !hasApplication && !hasInstance
        },
        actionsDropdownOptions () {
            if (!this.device) return []

            const flowActionsDisabled = !(this.device.status !== 'suspended')
            const deviceStateChanging = this.device.pendingStateChange || this.device.optimisticStateChange

            const result = [
                {
                    name: 'Restart',
                    action: this.restartDevice,
                    disabled: deviceStateChanging || flowActionsDisabled,
                    hidden: !this.device.lastSeenAt
                },
                {
                    type: 'hr',
                    hidden: !this.hasPermission('device:delete', this.permissionContext)
                },
                {
                    name: 'Delete',
                    class: ['text-red-700'],
                    action: this.showConfirmDeleteDialog,
                    hidden: !this.hasPermission('device:delete', this.permissionContext)
                }
            ]

            return result.filter(res => !res.hidden)
        }
    },
    watch: {
        '$route.name': 'handlePolling',
        device: {
            deep: true,
            handler (device) {
                if (device && this.isEditorAvailable) {
                    this.setContextDevice(device)
                    this.bindDevice(device, true)
                    this.handlePolling()
                } else {
                    this.$router.push({ name: 'device-overview' })
                        .then(() => Alerts.emit('Unable to connect to the Remote Instance', 'warning'))
                        .catch(e => e)
                }
            }
        }
    },
    mounted () {
        this.loadDevice()
    },
    unmounted () {
        this.stopPolling()
    },
    methods: {
        ...mapActions(useContextStore, { setContextDevice: 'setDevice' }),
        ...mapActions(useUxDrawersStore, ['toggleEditorImmersiveDrawer']),
        loadDevice: async function () {
            let tries = 0
            let device = await this.fetchDevice(this.$route.params.id, false)

            // When running multiple replicas of the forge app, the affinity token may be missing if the request is routed to a
            // backend endpoint that didn't initiate the tunnel. If we receive a 502 from the device editor proxy,
            // we retry the editor API call until the correct affinity token is acquired (200/302).
            while (tries <= 5) {
                try {
                    await this.getDeviceEditorProxy(device)
                    break
                } catch (e) {
                    if (e?.response?.status === 502) {
                        tries += 1
                        // 1s interval timeout between tries
                        await new Promise(resolve => setTimeout(resolve, 1000))
                        device = await this.fetchDevice(this.$route.params.id, false)
                        continue
                    }
                    break
                }
            }

            this.device = device
            await useAccountStore().setTeam(this.device.team.slug)
        },
        showConfirmDeleteDialog () {
            this.showDeleteDeviceDialog()
        },
        async refreshDevice () {
            await this.fetchDevice()
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
        handlePolling () {
            const pollingRoutes = [
                'device-editor-overview',
                'device-editor-developer-mode'
            ]

            switch (true) {
            case typeof this.device?.status === 'undefined':
            case this.device?.status === 'stopped':
            case this.isDeviceInTransitionState:
            case pollingRoutes.includes(this.$route.name):
                this.resumePolling()
                break
            default:
                this.pausePolling()
            }
        }
    }
}
</script>

<style lang="scss">
.ff--immersive-editor-wrapper {
    &.remote-instance {
        .device-actions-dropdown {
            padding: 6px 9px;

            svg {
                margin: 0;
            }
        }
    }
}
</style>
