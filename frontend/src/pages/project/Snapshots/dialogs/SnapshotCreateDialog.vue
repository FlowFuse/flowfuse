<template>
    <ff-dialog ref="dialog" header="Create Snapshot" confirm-label="Create" :disable-primary="!formValid" @confirm="confirm()">
        <template v-slot:default>
            <form class="space-y-6 mt-2" @submit.prevent>
                <FormRow v-model="input.name" :error="errors.name" data-form="snapshot-name">Name</FormRow>
                <FormRow data-form="snapshot-description">Description
                    <template #input>
                        <textarea v-model="input.description" rows="8" class="ff-input ff-text-input" style="height: auto"></textarea>
                    </template>
                </FormRow>
                <FormRow v-model="input.setAsTarget" type="checkbox" data-form="snapshot-name">
                    <span class="" v-ff-tooltip:right="'If checked, all devices in this team will be restarted on this snapshot.'">
                        Set as Target <QuestionMarkCircleIcon class="ff-icon" style="margin: 0px 0px 0px 4px; height: 18px;"></QuestionMarkCircleIcon>
                    </span>
                </FormRow>
            </form>
        </template>
    </ff-dialog>
</template>
<script>

import snapshotApi from '@/api/projectSnapshots'

import alerts from '@/services/alerts'

import FormRow from '@/components/FormRow.vue'
import { QuestionMarkCircleIcon } from '@heroicons/vue/solid'

export default {
    name: 'SnapshotCreateDialog',
    components: {
        FormRow,
        QuestionMarkCircleIcon
    },
    props: ['project'],
    emits: ['snapshotCreated'],
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
                    this.$emit('snapshotCreated', response)
                    alerts.emit('Successfully created snapshot of project.', 'confirmation')
                }).catch(err => {
                    console.log(err.response?.data)
                    if (err.response?.data) {
                        if (/name/.test(err.response.data.error)) {
                            this.errors.name = err.response.data.error
                            return
                        }
                    }
                    alerts.emit('Failed to create snapshot of project.', 'error')
                })
            }
        }
    },
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
    }
}
</script>
