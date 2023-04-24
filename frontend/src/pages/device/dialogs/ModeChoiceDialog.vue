<template>
    <ff-dialog ref="device-mode-dialog" header="Device Mode">
        <template #default>
            <!-- A device can be in one of 2 modes: <strong>Autonomous</strong> or <strong>Developer</strong>. -->
            <!-- <br> -->
            <ff-radio-group
                v-model="modeSelect"
                label="A device can be in one of 2 modes: Autonomous or Developer."
                orientation="vertical"
                :disabled="busy"
                :options="[
                    {
                        label: 'Autonomous Mode',
                        value: 'autonomous',
                        checked: false,
                        description: 'Autonomous mode is the default mode for a device. In this mode, the device will run the flows in the target snapshot and will be automatically updated if the target snapshot changes.'
                    },
                    {
                        label: 'Developer Mode',
                        value: 'developer',
                        description: 'Developer mode is for developing flows directly on the device. In this mode, the device will not be automatically updated if the target snapshot changes'
                    }
                ]"
            />
        </template>
        <template #actions>
            <!-- <ff-button kind="secondary" @click="$refs['device-mode-dialog'].close();doSecondaryAction1()">Secondary 1</ff-button> -->
            <ff-button kind="secondary" @click="$refs['device-mode-dialog'].close()">Close</ff-button>
            <ff-button kind="danger" :disabled="device.mode === modeSelect" @click="applyMode()">Apply</ff-button>
        </template>
    </ff-dialog>
</template>

<script>

import deviceApi from '../../../api/devices.js'
import Alerts from '../../../services/alerts.js'
import Dialog from '../../../services/dialog.js'

export default {
    name: 'ModeChoiceDialog',
    props: {
        device: {
            type: Object,
            required: true
        }
    },
    emits: ['mode-change'],
    setup () {
        return {
            show (application) {
                this.$refs['device-mode-dialog'].show()
                this.application = application
            }
        }
    },
    data () {
        return {
            deviceLocal: this.device,
            modeSelect: 'autonomous',
            busy: false
        }
    },
    mounted () {
        this.modeSelect = this.device?.mode || 'autonomous'
    },
    methods: {
        async applyMode () {
            this.busy = true
            try {
                // perform the mode change to the selected mode. @see DevicePage.setDeviceMode
                this.$emit('mode-change', this.modeSelect)
            } catch (error) {
                console.error(error)
                // this.$emit('error', error)
            } finally {
                this.busy = false
            }
        },
        async setDeveloperMode () {
            Dialog.show({
                header: 'Set Device to Developer Mode?',
                kind: 'info',
                text: 'While the device is in developer mode, it will not be automatically updated if the target snapshot changes. Any changes made to this device can be uploaded as a snapshot. You can switch back to autonomous mode at any time.',
                confirmLabel: 'Continue with mode change',
                cancelLabel: 'Cancel'
            }, async () => {
                const result = await deviceApi.setMode(this.device.id, 'developer')
                this.deviceLocal.mode = result?.mode
            })
        },
        async setAutonomousMode () {
            // first ask for confirmation & warn user they may lose changes
            Dialog.show({
                header: 'Set Device to Autonomous Mode?',
                kind: 'info',
                text: 'Before switching to autonomous mode, you may wish to upload a snapshot of the devices current flows from the device editor and set it as the target snapshot before switching back autonomous mode.',
                confirmLabel: 'Continue with mode change',
                cancelLabel: 'Cancel'
            }, async () => {
                const result = await deviceApi.setMode(this.device.id, 'autonomous')
                this.deviceLocal.mode = result?.mode
                Alerts.emit(`Device now in '${this.deviceLocal.mode}' mode.`, 'confirmation')
            })
        }
    }
}
</script>
