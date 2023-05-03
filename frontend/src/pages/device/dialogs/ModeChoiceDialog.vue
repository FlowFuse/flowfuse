<template>
    <ff-dialog ref="device-mode-dialog" header="Device Developer Mode">
        <template #default>
            <div class="mb-6">
                Developer mode is for developing flows directly on the device. When a device is in this mode, it will not be automatically updated if the target snapshot changes. Any changes made to this device can be uploaded as a snapshot. You can switch off developer mode at any time.
            </div>
            <ff-checkbox
                v-model="developerMode"
                label="Enable Developer Mode"
                :disabled="busy"
            />
        </template>
        <template #actions>
            <!-- <ff-button kind="secondary" @click="$refs['device-mode-dialog'].close();doSecondaryAction1()">Secondary 1</ff-button> -->
            <ff-button kind="secondary" @click="$refs['device-mode-dialog'].close()">Cancel</ff-button>
            <ff-button kind="danger" @click="applyMode()">Confirm</ff-button>
        </template>
    </ff-dialog>
</template>

<script>

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
            developerMode: false,
            busy: false
        }
    },
    mounted () {
        this.developerMode = this.device?.mode === 'developer'
    },
    methods: {
        async applyMode () {
            this.busy = true
            try {
                // perform the mode change to the selected mode. @see DevicePage.setDeviceMode
                this.$emit('mode-change', this.developerMode ? 'developer' : 'autonomous')
                this.$refs['device-mode-dialog'].close()
            } catch (error) {
                console.error(error)
            } finally {
                this.busy = false
            }
        }
    }
}
</script>
