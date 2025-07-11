<template>
    <ff-dialog
        ref="dialog" :header="device ? 'Update Remote Instance' : 'Add Remote Instance'"
        :confirm-label="device ? 'Update' : 'Add'" :disable-primary="!formValid" data-el="team-device-create-dialog"
        @confirm="confirm()"
        @cancel="close"
    >
        <template #default>
            <slot name="description" />
            <form class="space-y-6 mt-2">
                <FormRow v-model="input.name" data-form="device-name" :error="errors.name" :disabled="editDisabled" container-class="w-full">
                    <template #default>Name</template>
                    <template #description>Provide a unique, identifiable name for your Remote Instance.</template>
                </FormRow>
                <FormRow v-model="input.type" data-form="device-type" :error="errors.type" :disabled="editDisabled" container-class="w-full">
                    <template #default>Type</template>
                    <template #description>Use this field to better identify your Remote Instance.</template>
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
                    <template #description>Assign the Remote Instance to an Application (recommended).</template>
                    Application
                </FormRow>
                <div v-if="deviceIsBillable">
                    <InstanceChargesTable
                        :project-type="deviceBillingInformation"
                        :subscription="subscription"
                        :trialMode="false"
                        :prorationMode="team?.type?.properties?.billing?.proration"
                    />
                </div>
            </form>
        </template>
    </ff-dialog>
</template>

<script>
import { mapState } from 'vuex'

import billingApi from '../../../../api/billing.js'
import devicesApi from '../../../../api/devices.js'
import teamApi from '../../../../api/team.js'

import FormRow from '../../../../components/FormRow.vue'
import formatCurrency from '../../../../mixins/Currency.js'
import alerts from '../../../../services/alerts.js'

import InstanceChargesTable from '../../../instance/components/InstanceChargesTable.vue'

export default {
    name: 'TeamDeviceCreateDialog',
    components: {
        FormRow,
        InstanceChargesTable
    },
    mixins: [formatCurrency],
    props: {
        teamDeviceCount: {
            type: Number,
            required: true
        }
    },
    emits: ['deviceUpdated', 'deviceCreating', 'deviceCreated', 'closed'],
    setup () {
        return {
            show (device, instance, application, showApplicationsList = false) {
                this.$refs.dialog.show()
                this.instance = instance
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
                if (application) {
                    this.application = application
                    this.input.application = application.id
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
            subscription: null,
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
        ...mapState('account', ['features', 'team']),
        deviceIsBillable () {
            let freeAllocation = this.team.type.properties.devices.free || 0
            let deviceCount = this.teamDeviceCount
            if (this.team.type.properties.devices?.combinedFreeType) {
                deviceCount += this.team.instanceCountByType?.[this.team.type.properties.devices.combinedFreeType] || 0
                freeAllocation = this.team.type.properties.instances[this.team.type.properties.devices.combinedFreeType]?.free || 0
            }
            return this.features.billing && // billing enabled
                !this.team.billing?.unmanaged &&
                this.team.type.properties.devices?.description && // >0 per device cost
                freeAllocation <= deviceCount // no remaining free allocation
        },
        deviceBillingInformation () {
            if (this.deviceIsBillable && this.team.type.properties.devices?.description) {
                const [price, priceInterval] = this.team.type.properties.devices?.description.split('/')
                const currency = price.replace(/[\d.]+/, '')
                const cost = (Number(price.replace(/[^\d.]+/, '')) || 0) * 100
                return {
                    name: 'Remote Instance',
                    currency,
                    cost,
                    priceInterval
                }
            }
            return null
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
                ...this.applications.map(app => ({ value: app.id, label: app.name }))
            ]
        }
    },
    async mounted () {
        this.loadApplications()
        if (this.features.billing && !this.team.billing?.unmanaged) {
            try {
                this.subscription = await billingApi.getSubscriptionInfo(this.team.id)
            } catch (err) {
            }
        }
    },
    methods: {
        loadApplications () {
            this.loading.applications = true
            teamApi.getTeamApplications(this.team.id).then((data) => {
                this.applications = data.applications
                this.loading.applications = false
            }).catch((error) => {
                console.error(error)
            })
        },
        confirm () {
            const opts = {
                name: this.input.name,
                type: this.input.type
            }

            if (Object.prototype.hasOwnProperty.call(this.input, 'application')) {
                opts.application = this.input.application
            }

            if (this.device) {
                // Update
                devicesApi.updateDevice(this.device.id, opts).then((response) => {
                    this.$emit('deviceUpdated', response)
                    alerts.emit('Device successfully updated.', 'confirmation')
                    this.close()
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
                this.team.deviceCount++
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
                        return devicesApi.updateDevice(response.id, { instance: this.instance.id }).then((response) => {
                            // Reattach the credentials from the create request
                            // so they can be displayed to the user
                            response.credentials = creds
                            this.$emit('deviceCreated', response)
                            alerts.emit('Device successfully created.', 'confirmation')
                        })
                    } else if (this.application || this.input.application) {
                        const application = this.input.application
                        const creds = response.credentials
                        // TODO: should the create allow a device to linked to an application at the same time?
                        //       currently, as above, this is a 2 step process
                        // eslint-disable-next-line promise/no-nesting
                        return devicesApi.updateDevice(response.id, { application }).then((response) => {
                            // Reattach the credentials from the create request
                            // so they can be displayed to the user
                            response.credentials = creds
                            this.$emit('deviceCreated', response)
                            alerts.emit('Device successfully created.', 'confirmation')
                        })
                    }
                    this.close()
                }).catch(err => {
                    this.team.deviceCount--
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
        },
        close () {
            this.$emit('closed')
        }
    }
}
</script>
