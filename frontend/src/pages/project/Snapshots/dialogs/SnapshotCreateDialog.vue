<template>
    <ff-dialog :open="isOpen" header="Create Snapshot">
        <template v-slot:default>
            <form class="space-y-6 mt-2">
                <FormRow v-model="input.name" :error="errors.name">Name</FormRow>
                <FormRow>Description
                    <template #input><textarea v-model="input.description" rows="8" class="ff-input ff-text-input" style="height: auto"></textarea></template>
                </FormRow>
            </form>
        </template>
        <template v-slot:actions>
            <ff-button kind="secondary" @click="close()">Cancel</ff-button>
            <ff-button class="ml-4" :disabled="!formValid" @click="confirm()">
                <span>Create</span>
            </ff-button>
        </template>
    </ff-dialog>
</template>

<script>

import snapshotApi from '@/api/projectSnapshots'

import alerts from '@/services/alerts'

import { ref } from 'vue'

import FormRow from '@/components/FormRow'

export default {
    name: 'TeamDeviceCreateDialog',
    components: {
        FormRow
    },
    props: ['project'],
    emits: ['snapshotCreated'],
    data () {
        return {
            submitted: false,
            input: {
                name: '',
                description: ''
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
            this.submitted = true
            const opts = {
                name: this.input.name,
                description: this.input.description
            }
            snapshotApi.create(this.project.id, opts).then((response) => {
                this.isOpen = false
                this.$emit('snapshotCreated', response)
                alerts.emit('Successfully created snapshot of project.', 'confirmation')
            }).catch(err => {
                console.log(err.response.data)
                if (err.response.data) {
                    if (/name/.test(err.response.data.error)) {
                        this.errors.name = err.response.data.error
                    }
                }
            })
        }
    },
    setup () {
        const isOpen = ref(false)
        return {
            isOpen,
            close () {
                isOpen.value = false
            },
            show () {
                this.input.name = ''
                this.input.description = ''
                this.submitted = false
                this.errors = {}
                isOpen.value = true
            }
        }
    }
}
</script>
