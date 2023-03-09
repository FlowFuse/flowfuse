<template>
    <ff-dialog ref="dialog" header="Create Snapshot" confirm-label="Create" :disable-primary="!formValid" @confirm="confirm()">
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
                    <span v-ff-tooltip:right="'If checked, all devices in this team will be restarted on this snapshot.'" class="">
                        Set as Target <QuestionMarkCircleIcon class="ff-icon" style="margin: 0px 0px 0px 4px; height: 18px;" />
                    </span>
                </FormRow>
            </form>
        </template>
    </ff-dialog>
</template>
<script>

import { QuestionMarkCircleIcon } from '@heroicons/vue/solid'

import snapshotApi from '@/api/projectSnapshots'

import FormRow from '@/components/FormRow.vue'
import alerts from '@/services/alerts'

export default {
    name: 'SnapshotCreateDialog',
    components: {
        FormRow,
        QuestionMarkCircleIcon
    },
    props: {
        project: {
            type: Object,
            required: true
        }
    },
    emits: ['snapshot-created'],
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
                snapshotApi.create(this.project.id, opts).then((response) => {
                    this.$emit('snapshot-created', response)
                    alerts.emit('Successfully created snapshot of instance.', 'confirmation')
                }).catch(err => {
                    console.log(err.response?.data)
                    if (err.response?.data) {
                        if (/name/.test(err.response.data.error)) {
                            this.errors.name = err.response.data.error
                            return
                        }
                    }
                    alerts.emit('Failed to create snapshot of instance.', 'error')
                })
            }
        }
    }
}
</script>
