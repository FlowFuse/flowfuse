<template>
    <ff-dialog
        id="assign-device-dialog"
        ref="dialog"
        :header="$t('ui.assignDevice')"
        class="ff-dialog-fixed-height"
        data-el="assign-device-dialog"
        :disable-primary="!assignOption"
        @confirm="select"
    >
        <template #default>
            <p class="text-sm text-gray-500">
                {{ $t('ui.pleaseSelectWhetherYouWantToAssignThisDeviceToAn') }}
            </p>
            <ff-tile-selection v-model="assignOption">
                <ff-tile-selection-option
                    value="instance" :label="$t('ui.instance2')" data-form="assign-to-instance"
                    description="<p>{{ $t('ui.autoDeployFlowsFromTheBoundInstanceDirectlyToThi') }}</p></br><p>{{ $t('ui.youCanStillRemotelyEditAndCreateSnapshotsOnTheDe') }}</p>"
                />
                <ff-tile-selection-option
                    value="application" :label="$t('ui.application')" data-form="assign-to-application"
                    description="<p>{{ $t('ui.flowsOnThisDeviceCanOnlyBeEditedAndDeployedViaTh') }}</p></br><p>{{ $t('ui.youCanCreateSnapshotsHereForVersionControlOfTheF') }}</p>"
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
