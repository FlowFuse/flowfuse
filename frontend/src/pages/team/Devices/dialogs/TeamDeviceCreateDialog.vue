<template>
    <ff-dialog
        ref="dialog" :header="device ? 'Update Device' : 'Add Device'"
        :confirm-label="device ? 'Update' : 'Add'" :disable-primary="!formValid" data-el="team-device-create-dialog"
        @confirm="confirm()"
    >
        <template #default>
            <slot name="description" />
            <form class="space-y-6 mt-2">
                <FormRow v-model="input.name" data-form="device-name" :error="errors.name" :disabled="editDisabled" container-class="w-full">
                    <template #default>Name</template>
                    <template #description>Provide a unique, identifiable name for your device.</template>
                </FormRow>
                <FormRow v-model="input.type" data-form="device-type" :error="errors.type" :disabled="editDisabled" container-class="w-full">
                    <template #default>Type</template>
                    <template #description>Use this field to better identify your device, and sort/filter in your device list.</template>
                </FormRow>
                <FormRow
                    v-if="showApplicationsList"
                    v-model="input.application"
                    :options="applicationsList"
                    :disabled="noApplications || loading.applications"
                    placeholder="Select an application"
                    data-form="application"
                    container-class="w-full"
                >
                    <template #description>Assign the device to an application (optional).</template>
                    Application
                </FormRow>
                <div v-if="billingDescription">
                    <b>Price: {{ billingDescription }}</b>
                </div>
            </form>
        </template>
    </ff-dialog>
</template>

<script>
import { mapState } from 'vuex'

import devicesApi from '../../../../api/devices.js'
import teamApi from '../../../../api/team.js'

import FormRow from '../../../../components/FormRow.vue'
import formatCurrency from '../../../../mixins/Currency.js'
import alerts from '../../../../services/alerts.js'

export default {
    name: 'TeamDeviceCreateDialog',
    components: {
        FormRow
    },
    mixins: [formatCurrency],
    props: {
        team: {
            type: Object,
            required: true
        }
    },
    emits: ['deviceUpdated', 'deviceCreating', 'deviceCreated'],
    setup () {
        return {
            show (device, instance, application, showApplicationsList = false) {
                this.$refs.dialog.show()
                this.instance = instance
                this.application = application
                this.device = device
                this.showApplicationsList = showApplicationsList
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
            application: null,
            totalDeviceCount: 0,
            input: {
                name: '',
                type: '',
                application: null
            },
            applications: [],
            loading: {
                applications: false
            },
            showApplicationsList: false,
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
            if (this.deviceIsBillable && this.team.type.properties.billing?.deviceCost > 0) {
                return `${this.formatCurrency(this.team.type.properties.billing?.deviceCost * 100)} /month`
            }
            return ''
        },
        formValid () {
            return !!this.input.name
        },
        noApplications () {
            return !this.applications || this.applications.length === 0
        },
        applicationsList () {
            return [
                { value: '', label: '- none -' },
                ...this.applications
            ]
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
        this.loadApplications()
    },
    methods: {
        loadApplications () {
            this.loading.applications = true
            teamApi.getTeamApplications(this.team.id).then((data) => {
                this.applications = data.applications.map(application => { return { value: application, label: application.name } })
                this.loading.applications = false
            }).catch((error) => {
                console.error(error)
            })
        },
        confirm () {
            const opts = {
                name: this.input.name,
                type: this.input.type,
                application: this.input.application
            }

            if (this.device) {
                // Update
                devicesApi.updateDevice(this.device.id, opts).then((response) => {
                    this.$emit('deviceUpdated', response)
                    alerts.emit('Device successfully updated.', 'confirmation')
                }).catch(err => {
                    console.error(err.response.data)
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
                    if (!this.instance && !this.application && !this.input.application) {
                        this.$emit('deviceCreated', response)
                        alerts.emit('Device successfully created.', 'confirmation')
                    } else if (this.instance) {
                        const creds = response.credentials
                        // TODO: should the create allow a device to be created
                        //       in the project directly? Currently done as a two
                        //       step process
                        // eslint-disable-next-line promise/no-nesting
                        return devicesApi.updateDevice(response.id, { project: this.instance.id }).then((response) => {
                            // Reattach the credentials from the create request
                            // so they can be displayed to the user
                            response.credentials = creds
                            this.$emit('deviceCreated', response)
                            alerts.emit('Device successfully created.', 'confirmation')
                        })
                    } else if (this.application || this.input.application) {
                        const app = this.input.application || this.application
                        const creds = response.credentials
                        // TODO: should the create allow a device to linked to an application at the same time?
                        //       currently, as above, this is a 2 step process
                        // eslint-disable-next-line promise/no-nesting
                        return devicesApi.updateDevice(response.id, { application: app.id }).then((response) => {
                            // Reattach the credentials from the create request
                            // so they can be displayed to the user
                            response.credentials = creds
                            this.$emit('deviceCreated', response)
                            alerts.emit('Device successfully created.', 'confirmation')
                        })
                    }
                }).catch(err => {
                    this.$emit('deviceCreated', null)
                    console.error(err.response.data)
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
