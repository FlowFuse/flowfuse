<template>
    <ff-dialog :open="isOpen" :header="device?'Update Device':'Register Device'">
        <template v-slot:default>
            <form class="space-y-6 mt-2">
                <FormRow v-model="input.name" :error="errors.name" :disabled="editDisabled">Name</FormRow>
                <FormRow v-model="input.type" :error="errors.type" :disabled="editDisabled">Type</FormRow>
            </form>
        </template>
        <template v-slot:actions>
            <ff-button kind="secondary" @click="close()">Cancel</ff-button>
            <ff-button :disabled="!formValid" class="ml-4" @click="confirm()">
                <span v-if="device">Update</span>
                <span v-else>Register</span>
            </ff-button>
        </template>
    </ff-dialog>
</template>

<script>

import devicesApi from '@/api/devices'

import { ref } from 'vue'

import FormRow from '@/components/FormRow'

export default {
    name: 'TeamDeviceCreateDialog',
    components: {
        FormRow
    },
    props: ['team'],
    data () {
        return {
            device: null,
            project: null,
            input: {
                name: '',
                type: ''
            },
            errors: {},
            editDisabled: false
        }
    },
    computed: {
        formValid () {
            return (this.input.name)
        }
    },
    mounted () {
    },
    methods: {
        confirm () {
            const opts = {
                name: this.input.name,
                type: this.input.type
            }

            if (this.device) {
                // Update
                devicesApi.updateDevice(this.device.id, opts).then((response) => {
                    this.isOpen = false
                    this.$emit('deviceUpdated', response)
                }).catch(err => {
                    console.log(err.response.data)
                    if (err.response.data) {
                        if (/name/.test(err.response.data.error)) {
                            this.errors.name = err.response.data.error
                        }
                    }
                })
            } else {
                opts.team = this.team.id
                devicesApi.create(opts).then((response) => {
                    if (!this.project) {
                        this.isOpen = false
                        this.$emit('deviceCreated', response)
                    } else {
                        const creds = response.credentials
                        // TODO: should the create allow a device to be created
                        //       in the project directly? Currently done as a two
                        //       step process
                        return devicesApi.updateDevice(response.id, { project: this.project.id }).then((response) => {
                            this.isOpen = false
                            // Reattach the credentials from the create request
                            // so they can be displayed to the user
                            response.credentials = creds
                            this.$emit('deviceCreated', response)
                        })
                    }
                }).catch(err => {
                    console.log(err.response.data)
                    if (err.response.data) {
                        if (/name/.test(err.response.data.error)) {
                            this.errors.name = err.response.data.error
                        }
                    }
                })
            }
        }
    },
    setup () {
        const isOpen = ref(false)
        return {
            isOpen,
            close () {
                isOpen.value = false
            },
            show (device, project) {
                this.project = project
                this.device = device
                if (device) {
                    this.input = {
                        name: device.name,
                        type: device.type
                    }
                } else {
                    this.editDisabled = false
                    this.input = { name: '', type: '' }
                }
                this.errors = {}
                isOpen.value = true
            }
        }
    }
}
</script>
