<template>
    <ff-dialog
        id="assign-device-dialog"
        ref="dialog"
        header="Assign Device"
        class="ff-dialog-fixed-height"
        data-el="assign-device-dialog"
        :disable-primary="!assignOption"
        @confirm="select"
    >
        <template #default>
            <p class="text-sm text-gray-500">
                Please select whether you want to assign this Device to an Instance or an Application.
            </p>
            <ff-tile-selection v-model="assignOption">
                <ff-tile-selection-option
                    value="instance" label="Instance" data-form="assign-to-instance"
                    description="<p>Auto-deploy flows from the bound Instance directly to this Device.</p></br><p>You can still remotely edit and create Snapshots on the Device when the Device is in 'Developer Mode'.</p>"
                />
                <ff-tile-selection-option
                    value="application" label="Application" data-form="assign-to-application"
                    description="<p>Flows on this Device can only be edited and deployed via the 'Remote Editor' feature, available in 'Developer Mode'.</p></br><p>You can create Snapshots here for version control of the flows on your Device</p>"
                />
            </ff-tile-selection>
        </template>
    </ff-dialog>
</template>

<script>

export default {
    name: 'AssignDeviceDialog',
    emits: ['assignOptionSelected'],
    setup () {
        return {
            async show () {
                this.$refs.dialog.show()
            }
        }
    },
    data () {
        return {
            assignOption: null
        }
    },
    methods: {
        select () {
            this.$emit('assignOptionSelected', this.assignOption)
            this.assignOption = null
        },
        close () {
            this.$refs.dialog.close()
        }
    }
}
</script>

<style lang="scss" scoped>
#assign-device-dialog {
    .ff-tile-selection {
        margin-top: 1rem;
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 1rem;
    }
    .ff-tile-selection-option {
        width: auto;
        margin: 0;
    }
}
</style>
