<template>
    <ff-dialog ref="device-mode-dialog" :header="dialogHeader">
        <template #default>
            <div class="mb-6 space-y-2">
                <template v-if="unsupportedVersion">
                    <p>
                        Developer Mode requires Device Agent v0.8.0 or later.
                        Please update your Device Agent to the latest version.
                    </p>
                </template>
                <template v-else-if="!developerMode">
                    <p>
                        When a device is in developer mode its editor can be enabled
                        and accessed remotely.
                    </p>
                    <p>
                        This allows you to develop your flows
                        on a real device before creating a snapshot to deploy across
                        your other devices.
                    </p>
                    <p>
                        Whilst in this mode, the device will no longer automatically
                        update when new snapshots are deployed.
                    </p>
                </template>
                <template v-else>
                    <p>
                        Disabling developer mode will turn off access to the editor and deploy
                        the current target snapshot to the device.
                    </p>
                    <p>
                        Any changes made to the device whilst in developer mode will be lost.
                    </p>
                    <p>
                        To save changes, use the 'create snapshot' developer mode option before
                        disabling developer mode.
                    </p>
                </template>
            </div>
        </template>
        <template #actions>
            <template v-if="unsupportedVersion">
                <ff-button kind="primary" @click="$refs['device-mode-dialog'].close()">Close</ff-button>
            </template>
            <template v-else>
                <ff-button kind="secondary" @click="$refs['device-mode-dialog'].close()">Cancel</ff-button>
                <ff-button kind="danger" @click="applyMode()"><span v-if="developerMode">Disable</span><span v-else>Enable</span></ff-button>
            </template>
        </template>
    </ff-dialog>
</template>

<script>

import semver from 'semver'

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
            show () {
                this.unsupportedVersion = !(this.device?.agentVersion && semver.gte(this.device?.agentVersion, '0.8.0'))
                this.developerMode = this.device?.mode === 'developer'
                if (this.unsupportedVersion) {
                    this.dialogHeader = 'Developer Mode Unavailable'
                } else {
                    this.dialogHeader = (this.developerMode ? 'Disable' : 'Enable') + ' Developer Mode'
                }
                this.$refs['device-mode-dialog'].show()
            }
        }
    },
    data () {
        return {
            unsupportedVersion: false,
            developerMode: false,
            busy: false,
            dialogHeader: ''
        }
    },
    methods: {
        async applyMode () {
            this.busy = true
            try {
                // perform the mode change to the selected mode. @see DevicePage.setDeviceMode
                this.$emit('mode-change', !this.developerMode ? 'developer' : 'autonomous')
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
