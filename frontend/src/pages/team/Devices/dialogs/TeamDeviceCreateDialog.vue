<template>
    <ff-dialog
        ref="dialog" :header="device ? 'Update Device' : 'Register Device'"
        :confirm-label="device ? 'Update' : 'Register'" :disable-primary="!formValid" @confirm="confirm()"
    >
        <template #default>
            <slot name="description" />
            <form class="space-y-6 mt-2">
                <FormRow v-model="input.name" data-form="device-name" :error="errors.name" :disabled="editDisabled">Name</FormRow>
                <FormRow v-model="input.type" data-form="device-type" :error="errors.type" :disabled="editDisabled">Type</FormRow>
                <FormRow v-if="deviceIsBillable" id="billing-confirmation" v-model="input.billingConfirmation" type="checkbox">
                    Confirm additional charges
                    <template #description>
                        {{ billingDescription }}
                    </template>
                </FormRow>
            </form>
        </template>
    </ff-dialog>
</template>

<script>
import { mapState } from 'vuex'

import devicesApi from '@/api/devices'
import teamApi from '@/api/team'

import FormRow from '@/components/FormRow'
import alerts from '@/services/alerts'

export default {
    name: 'TeamDeviceCreateDialog',
    components: {
        FormRow
    },
    props: {
        team: {
            type: Object,
            required: true
        }
    },
    emits: ['deviceUpdated', 'deviceCreating', 'deviceCreated'],
    setup () {
        return {
            show (device, instance, application) {
                this.$refs.dialog.show()
                this.instance = instance || application // TODO: This currently treats applications and instances the same
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
            }
        }
    },
    data () {
        return {
            device: null,
            instance: null,
            totalDeviceCount: 0,
            input: {
                name: '',
                type: '',
                billingConfirmation: false
            },
            errors: {},
            editDisabled: false
        }
    },
    computed: {
        ...mapState('account', ['features']),
        deviceIsBillable () {
            return this.features.billing && // billing enabled
                this.team.type.properties.billing?.deviceCost > 0 && // >0 per device cost
                (this.team.type.properties.deviceFreeAllocation || 0) <= this.totalDeviceCount // no remaining free allocation
        },
        billingDescription () {
            if (this.deviceIsBillable) {
                return `$${this.team.type.properties.billing.deviceCost}/month`
            }
            return ''
        },
        formValid () {
            return this.input.name && (!this.deviceIsBillable || this.input.billingConfirmation)
        }
    },
    async mounted () {
        if (this.features.billing && // billing enabled
                this.team.type.properties.billing?.deviceCost > 0) {
            // Get the total device count for the team so that we can check allocation
            // By passing 0 in as the limit, it will just return the `count`
            // and not retrieve any actual devices
            const teamData = await teamApi.getTeamDevices(this.team.id, null, 0)
            this.totalDeviceCount = teamData.count
        }
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
                    this.$emit('deviceUpdated', response)
                    alerts.emit('Device successfully updated.', 'confirmation')
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
                this.$emit('deviceCreating')
                devicesApi.create(opts).then((response) => {
                    if (!this.instance) {
                        this.$emit('deviceCreated', response)
                        alerts.emit('Device successfully created.', 'confirmation')
                    } else {
                        const creds = response.credentials
                        // TODO: should the create allow a device to be created
                        //       in the project directly? Currently done as a two
                        //       step process
                        return devicesApi.updateDevice(response.id, { project: this.instance.id }).then((response) => {
                            // Reattach the credentials from the create request
                            // so they can be displayed to the user
                            response.credentials = creds
                            this.$emit('deviceCreated', response)
                            alerts.emit('Device successfully created.', 'confirmation')
                        })
                    }
                }).catch(err => {
                    this.$emit('deviceCreated', null)
                    console.log(err.response.data)
                    if (err.response.data) {
                        if (/name/.test(err.response.data.error)) {
                            this.errors.name = err.response.data.error
                        } else {
                            alerts.emit('Failed to create device: ' + err.response.data.error, 'warning', 7500)
                        }
                    }
                })
            }
        }
    }
}
</script>
