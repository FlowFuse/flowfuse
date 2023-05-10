<template>
    <ff-dialog ref="dialog" header="Create Snapshot" confirm-label="Create" :disable-primary="!formValid" :closeOnConfirm="false" @confirm="confirm()" @cancel="cancel">
        <template #default>
            <form class="space-y-6 mt-2" @submit.prevent>
                <FormRow v-model="input.name" :error="errors.name" data-form="snapshot-name">Name</FormRow>
                <FormRow data-form="snapshot-description">
                    Description
                    <template #input>
                        <textarea v-model="input.description" rows="8" class="ff-input ff-text-input" style="height: auto" />
                    </template>
                </FormRow>
                <FormRow v-model="input.setAsTarget" type="checkbox" data-form="snapshot-name">
                    <span v-ff-tooltip:right="'If checked, all devices assigned to this instance will be restarted on this snapshot.'" class="">
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
        project () {
            return this.device?.project
        },
        formValid () {
            return !this.submitted && !!(this.input.name)
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
                deviceApi.createSnapshot(this.device.project.id, this.device.id, opts).then((response) => {
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
