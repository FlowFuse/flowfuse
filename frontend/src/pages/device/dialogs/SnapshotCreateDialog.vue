<template>
    <ff-dialog ref="dialog" :header="title" confirm-label="Create" :disable-primary="!formValid" :closeOnConfirm="false" @confirm="confirm()" @cancel="cancel">
        <template #default>
            <form class="space-y-6 mt-2" @submit.prevent>
                <FormRow v-model="input.name" :error="errors.name" data-form="snapshot-name">Name</FormRow>
                <FormRow data-form="snapshot-description">
                    Description
                    <template #input>
                        <textarea v-model="input.description" rows="8" class="ff-input ff-text-input" style="height: auto" />
                    </template>
                </FormRow>
                <FormRow v-if="showSetAsTarget" v-model="input.setAsTarget" type="checkbox" data-form="set-as-target">
                    <span v-ff-tooltip:right="setAsTargetToolTip" class="">
                        Set as Target <QuestionMarkCircleIcon class="ff-icon" style="margin: 0px 0px 0px 4px; height: 18px;" />
                    </span>
                </FormRow>
            </form>
        </template>
    </ff-dialog>
</template>
<script>

import { QuestionMarkCircleIcon } from '@heroicons/vue/solid'

import deviceApi from '../../../api/devices.js'

import FormRow from '../../../components/FormRow.vue'

export default {
    name: 'SnapshotCreateDialog',
    components: {
        FormRow,
        QuestionMarkCircleIcon
    },
    props: {
        device: {
            type: Object,
            required: true
        },
        showSetAsTarget: {
            type: Boolean,
            default: true
        },
        title: {
            type: String,
            default: 'Create Snapshot'
        }
    },
    emits: ['device-upload-failed', 'device-upload-success', 'canceled'],
    setup () {
        return {
            show () {
                this.$refs.dialog.show()
                this.input.name = ''
                this.input.description = ''
                this.input.setAsTarget = false
                this.submitted = false
                this.errors = {}
            }
        }
    },
    data () {
        return {
            submitted: false,
            input: {
                name: '',
                description: '',
                setAsTarget: false
            },
            errors: {}
        }
    },
    computed: {
        formValid () {
            return !this.submitted && !!(this.input.name)
        },
        setAsTargetToolTip () {
            if (this.device?.ownerType === 'application') {
                // for an application owned device:
                return 'If checked, the device will load this as its active snapshot at the next check-in'
            }
            // for default (instance owned device)
            return 'If checked, all devices assigned to this instance will be restarted on this snapshot.'
        }
    },
    mounted () {
    },
    methods: {
        confirm () {
            if (this.formValid) {
                this.submitted = true
                const opts = {
                    name: this.input.name,
                    description: this.input.description,
                    setAsTarget: this.input.setAsTarget
                }
                if (this.showSetAsTarget) {
                    opts.setAsTarget = this.input.setAsTarget
                }
                deviceApi.createSnapshot(this.device, opts).then((response) => {
                    this.$emit('device-upload-success', response)
                    this.$refs.dialog.close()
                }).catch(err => {
                    this.$emit('device-upload-failed', err)
                }).finally(() => {
                    this.submitted = false
                })
            }
        },
        cancel () {
            this.$refs.dialog.close()
            this.$emit('canceled')
        }
    }
}
</script>
