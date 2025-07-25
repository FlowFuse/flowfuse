<template>
    <ff-dialog ref="dialog" :header="dialogTitle" data-el="team-type-dialog">
        <template #default>
            <form class="space-y-6 mt-2" @submit.prevent>
                <div class="grid gap-3 grid-cols-3 items-middle">
                    <div class="col-span-2">
                        <FormRow v-model="input.name" :error="errors.name" data-form="name">Name</FormRow>
                    </div>
                    <div class="pt-8">
                        <FormRow v-model="input.active" type="checkbox" data-form="active">Active</FormRow>
                    </div>
                </div>
                <FormRow v-model="input.order">
                    Order
                    <template #description>Set the sort order when listing the types</template>
                </FormRow>
                <FormRow v-model="input.description" :error="errors.description" data-form="description" containerClass="w-full">
                    Description
                    <template #description>Use markdown for formatting</template>
                    <template #input><textarea v-model="input.description" class="w-full" rows="6" /></template>
                </FormRow>
                <template v-if="billingEnabled">
                    <FormHeading>Billing</FormHeading>
                    <div class="space-y-2">
                        <FormRow v-model="input.properties.billing.disabled" type="checkbox" class="mb-4">Do not require billing</FormRow>
                        <template v-if="!input.properties.billing.disabled">
                            <FormRow v-model="input.properties.billing.requireContact" type="checkbox" class="mb-4">Require contact to upgrade</FormRow>
                            <div v-if="input.properties.billing.requireContact" class="grid gap-2 grid-cols-2 pl-4">
                                <FormRow v-model="input.properties.billing.contactHSPortalId" :type="editDisabled?'uneditable':''">HubSpot Portal Id</FormRow>
                                <FormRow v-model="input.properties.billing.contactHSFormId" :type="editDisabled?'uneditable':''">HubSpot Form Id</FormRow>
                            </div>
                        </template>
                    </div>
                    <template v-if="!input.properties.billing.disabled">
                        <div class="grid gap-2 grid-cols-3">
                            <FormRow v-model="input.properties.billing.productId" :type="editDisabled?'uneditable':''">Product Id</FormRow>
                            <FormRow v-model="input.properties.billing.priceId" :type="editDisabled?'uneditable':''">Price Id</FormRow>
                            <FormRow v-model="input.properties.billing.description" placeholder="eg. $10/month" :type="editDisabled?'uneditable':''">Description</FormRow>
                        </div>
                        <FormRow v-model="input.properties.billing.proration" :options="prorationOptions" class="mb-4">Invoicing</FormRow>
                        <div class="space-y-2">
                            <FormRow v-model="input.properties.trial.active" type="checkbox" class="mb-4">Enable trial mode for personal teams</FormRow>
                            <FormRow v-if="input.properties.trial.active" v-model="input.properties.trial.sendEmail" type="checkbox" class="pl-4 mb-4">Send trial emails</FormRow>
                            <div v-if="input.properties.trial.active" class="grid gap-2 grid-cols-3 pl-4">
                                <FormRow v-model="input.properties.trial.duration" :type="editDisabled?'uneditable':''" placeholder="days">Duration</FormRow>
                                <div class="col-span-2">
                                    <FormRow v-model="input.properties.trial.instanceType" :options="trialInstanceTypes">Trial Features</FormRow>
                                </div>
                            </div>
                            <div v-if="input.properties.trial.active" class="grid gap-2 grid-cols-3 pl-4">
                                <FormRow v-model="input.properties.trial.usersLimit" :type="editDisabled?'uneditable':''">Limit # Users</FormRow>
                                <FormRow v-model="input.properties.trial.runtimesLimit" :type="editDisabled?'uneditable':''">Limit # Instances + Devices</FormRow>
                            </div>
                            <div v-if="input.properties.trial.active" class="grid gap-2 grid-cols-3 pl-4">
                                <FormRow v-model="input.properties.trial.productId" :type="editDisabled?'uneditable':''">Trial Product Id</FormRow>
                                <FormRow v-model="input.properties.trial.priceId" :type="editDisabled?'uneditable':''">Trial Price Id</FormRow>
                            </div>
                        </div>
                    </template>
                </template>
                <FormHeading>Limits</FormHeading>
                <div class="grid gap-3 grid-cols-3">
                    <FormRow v-model="input.properties.users.limit"># Users</FormRow>
                    <FormRow v-model="input.properties.runtimes.limit"># Instances + Devices</FormRow>
                </div>
                <div v-for="(instanceType, index) in instanceTypes" :key="index">
                    <FormHeading>Instance Type: {{ instanceType.name }}</FormHeading>
                    <div class="grid gap-3 grid-cols-4">
                        <FormRow v-model="input.properties.instances[instanceType.id].active" type="checkbox" class="mb-4">Available</FormRow>
                        <FormRow v-if="input.properties.instances[instanceType.id].active" v-model="input.properties.instances[instanceType.id].creatable" type="checkbox" class="mb-4">Creatable</FormRow>
                    </div>
                    <div v-if="input.properties.instances[instanceType.id].active" class="grid gap-3 grid-cols-4 pl-4">
                        <div class="grid gap-3 grid-cols-2">
                            <FormRow v-model="input.properties.instances[instanceType.id].limit"># Limit</FormRow>
                            <FormRow v-if="billingEnabled && !input.properties.billing.disabled" v-model="input.properties.instances[instanceType.id].free"># Free</FormRow>
                        </div>
                        <FormRow v-if="billingEnabled && !input.properties.billing.disabled" v-model="input.properties.instances[instanceType.id].productId" :type="editDisabled?'uneditable':''">Product Id</FormRow>
                        <FormRow v-if="billingEnabled && !input.properties.billing.disabled" v-model="input.properties.instances[instanceType.id].priceId" :type="editDisabled?'uneditable':''">Price Id</FormRow>
                        <FormRow v-if="billingEnabled && !input.properties.billing.disabled" v-model="input.properties.instances[instanceType.id].description" placeholder="eg. $10/month" :type="editDisabled?'uneditable':''">Description</FormRow>
                    </div>
                </div>
                <FormHeading>Devices</FormHeading>
                <div class="grid gap-3 grid-cols-4">
                    <div class="grid gap-3 grid-cols-2">
                        <FormRow v-model="input.properties.devices.limit"># Limit</FormRow>
                        <FormRow v-if="billingEnabled && !input.properties.billing.disabled" v-model="input.properties.devices.free" :disabled="input.properties.devices.combinedFreeType !== '_'"># Free</FormRow>
                    </div>
                    <FormRow v-if="billingEnabled && !input.properties.billing.disabled" v-model="input.properties.devices.productId" :type="editDisabled?'uneditable':''">Product Id</FormRow>
                    <FormRow v-if="billingEnabled && !input.properties.billing.disabled" v-model="input.properties.devices.priceId" :type="editDisabled?'uneditable':''">Price Id</FormRow>
                    <FormRow v-if="billingEnabled && !input.properties.billing.disabled" v-model="input.properties.devices.description" placeholder="eg. $10/month" :type="editDisabled?'uneditable':''">Description</FormRow>
                </div>
                <div v-if="billingEnabled && !input.properties.billing.disabled" class="grid gap-3 grid-cols-1">
                    <FormRow v-model="input.properties.devices.combinedFreeType" :options="deviceFreeOptions" class="mb-4">Share free allocation with instance type:</FormRow>
                </div>

                <template v-if="teamBrokerEnabled">
                    <FormHeading>Team Broker</FormHeading>
                    <div class="grid gap-3 grid-cols-4">
                        <div class="grid gap-3 grid-cols-1">
                            <FormRow v-model="input.properties.teamBroker.clients.limit"># Client Limit</FormRow>
                        </div>
                    </div>
                </template>

                <FormHeading>Features</FormHeading>
                <div class="grid gap-3 grid-cols-2">
                    <FormRow v-model="input.properties.features['shared-library']" type="checkbox">Team Library</FormRow>
                    <FormRow v-model="input.properties.features.projectComms" type="checkbox">Project Nodes</FormRow>
                    <FormRow v-model="input.properties.features.ha" type="checkbox">High Availability</FormRow>
                    <FormRow v-model="input.properties.features.teamHttpSecurity" type="checkbox">Team-based Endpoint Security</FormRow>
                    <FormRow v-model="input.properties.features.customCatalogs" type="checkbox">Custom NPM Catalogs</FormRow>
                    <FormRow v-model="input.properties.features.deviceGroups" type="checkbox">Device Groups</FormRow>
                    <FormRow v-model="input.properties.features.emailAlerts" type="checkbox">Email Alerts</FormRow>
                    <FormRow v-model="input.properties.features.deviceAutoSnapshot" type="checkbox">Device Auto Snapshot</FormRow>
                    <FormRow v-model="input.properties.features.protectedInstance" type="checkbox">Protected Instances</FormRow>
                    <FormRow v-model="input.properties.features.instanceAutoSnapshot" type="checkbox">Instance Auto Snapshot</FormRow>
                    <FormRow v-model="input.properties.features.editorLimits" type="checkbox">API/Debug Length Limits</FormRow>
                    <FormRow v-model="input.properties.features.customHostnames" type="checkbox">Custom Hostnames</FormRow>
                    <FormRow v-model="input.properties.features.staticAssets" type="checkbox">Static Assets</FormRow>
                    <FormRow v-model="input.properties.features.bom" type="checkbox">Bill of Materials / Dependencies</FormRow>
                    <FormRow v-model="input.properties.features.teamBroker" type="checkbox">Team Broker</FormRow>
                    <FormRow v-model="input.properties.features.projectHistory" type="checkbox">Version History Timeline</FormRow>
                    <FormRow v-model="input.properties.features.npm" type="checkbox">NPM Packages</FormRow>
                    <FormRow v-model="input.properties.features.gitIntegration" type="checkbox">Git Integration</FormRow>
                    <FormRow v-model="input.properties.features.instanceResources" type="checkbox">Instance Resources</FormRow>
                    <FormRow v-model="input.properties.features.tables" type="checkbox">Tables</FormRow>
                    <!-- to make the grid work nicely, only needed if there is an odd number of checkbox features above-->
                    <!-- <span /> -->
                    <FormRow v-model="input.properties.features.fileStorageLimit">Persistent File storage limit (Mb)</FormRow>
                    <FormRow v-model="input.properties.features.contextLimit">Persistent Context storage limit (Mb)</FormRow>
                </div>
            </form>
        </template>
        <template #actions>
            <div class="w-full grow flex justify-between">
                <div>
                    <ff-button v-if="isEditingExisting" kind="danger" style="margin: 0;" @click="$emit('show-delete-dialog', teamType); $refs.dialog.close()">Delete Team Type</ff-button>
                </div>
                <div class="flex">
                    <ff-button kind="secondary" @click="$refs['dialog'].close()">Cancel</ff-button>
                    <ff-button :disabled="!formValid" @click="confirm(); $refs.dialog.close()">{{ isEditingExisting ? 'Update' : 'Create' }}</ff-button>
                </div>
            </div>
        </template>
    </ff-dialog>
</template>

<script>
import { mapState } from 'vuex'

import instanceTypesApi from '../../../../api/instanceTypes.js'
import teamTypesApi from '../../../../api/teamTypes.js'

import FormHeading from '../../../../components/FormHeading.vue'
import FormRow from '../../../../components/FormRow.vue'

export default {
    name: 'TeamTypeCreateDialog',
    components: {
        FormRow,
        FormHeading
    },
    emits: ['team-type-updated', 'team-type-created', 'show-delete-dialog'],
    setup () {
        return {
            async show (teamType) {
                const instanceTypes = await instanceTypesApi.getInstanceTypes()
                instanceTypes.types.sort((A, B) => A.order - B.order)
                this.instanceTypes = instanceTypes.types
                this.deviceFreeOptions = [
                    { label: 'None - use own free limit', value: '_' }
                ]
                this.trialInstanceTypes = this.instanceTypes.map(it => {
                    this.deviceFreeOptions.push({
                        value: it.id,
                        label: it.name
                    })
                    return {
                        value: it.id,
                        label: `Single ${it.name} instance`
                    }
                })
                this.trialInstanceTypes.unshift({
                    value: '_',
                    label: 'All team features'
                })

                this.teamType = teamType
                if (teamType) {
                    this.editDisabled = teamType.instanceCount > 0
                    this.input.name = teamType.name
                    this.input.active = teamType.active
                    this.input.description = teamType.description
                    this.input.properties.users = teamType.properties?.users || {}
                    this.input.properties.runtimes = teamType.properties?.runtimes || {}
                    this.input.properties.devices = teamType.properties?.devices || {}
                    this.input.properties.instances = teamType.properties?.instances || {}
                    this.input.properties.features = teamType.properties?.features || {}
                    this.input.properties.billing = teamType.properties?.billing || {}
                    this.input.properties.trial = teamType.properties?.trial || {}
                    if (this.input.properties.trial.active && !this.input.properties.trial.instanceType) {
                        this.input.properties.trial.instanceType = '_'
                    }
                    this.input.properties.teamBroker = teamType.properties?.teamBroker || { clients: {} }
                    this.input.order = '' + (teamType.order || 0)

                    // Apply default feature values if undefined
                    if (this.input.properties.features['shared-library'] === undefined) {
                        this.input.properties.features['shared-library'] = true
                    }
                    if (this.input.properties.features.projectComms === undefined) {
                        this.input.properties.features.projectComms = true
                    }
                    if (this.input.properties.features.ha === undefined) {
                        this.input.properties.features.ha = true
                    }
                    if (this.input.properties.features.teamHttpSecurity === undefined) {
                        this.input.properties.features.teamHttpSecurity = true
                    }
                    if (this.input.properties.features.customCatalogs === undefined) {
                        this.input.properties.features.customCatalogs = true
                    }
                    if (this.input.properties.features.deviceGroups === undefined) {
                        // Default to disabled
                        this.input.properties.features.deviceGroups = false
                    }
                    if (this.input.properties.features.emailAlerts === undefined) {
                        this.input.properties.features.emailAlerts = false
                    }
                    if (this.input.properties.features.protectedInstance === undefined) {
                        this.input.properties.features.protectedInstance = false
                    }
                    if (this.input.properties.billing.proration === undefined) {
                        this.input.properties.billing.proration = 'always_invoice'
                    }
                    if (this.input.properties.trial.active && this.input.properties.trial.sendEmail === undefined) {
                        this.input.properties.trial.sendEmail = false
                    }
                    if (this.input.properties.features.customHostnames === undefined) {
                        this.input.properties.features.customHostnames = false
                    }
                    if (this.input.properties.features.projectHistory === undefined) {
                        this.input.properties.features.projectHistory = false
                    }
                    if (this.input.properties.features.npm === undefined) {
                        this.input.properties.features.npm = false
                    }
                    if (this.input.properties.features.gitIntegration === undefined) {
                        this.input.properties.features.gitIntegration = false
                    }
                    if (this.input.properties.features.instanceResources === undefined) {
                        this.input.properties.features.instanceResources = false
                    }
                } else {
                    this.editDisabled = false
                    this.input = {
                        name: '',
                        active: true,
                        description: '',
                        order: '0',
                        properties: {
                            billing: {},
                            trial: {},
                            users: {},
                            runtimes: {},
                            devices: {},
                            instances: {},
                            features: {},
                            teamBroker: {
                                clients: {}
                            }
                        }
                    }
                }

                // Need to ensure we have input.properties.instances entries
                // for all known instance types
                this.instanceTypes.forEach(instanceType => {
                    const typeProperties = this.input.properties.instances[instanceType.id]
                    if (!typeProperties) {
                        this.input.properties.instances[instanceType.id] = {
                            active: false
                        }
                    } else if (typeProperties.active && typeProperties.creatable === undefined) {
                        typeProperties.creatable = true
                    }
                })

                this.errors = {}
                this.$refs.dialog.show()
            }
        }
    },
    data () {
        return {
            teamType: null,
            instanceTypes: [],
            trialInstanceTypes: [],
            prorationOptions: [
                { label: 'Generate invoice for each change', value: 'always_invoice' },
                { label: 'Add proration items to monthly invoice', value: 'create_prorations' }
            ],
            deviceFreeOptions: [],
            input: {
                name: '',
                active: true,
                description: '',
                order: '0',
                properties: {
                    billing: {},
                    runtimes: {},
                    devices: {},
                    users: {},
                    instances: {},
                    features: {},
                    trial: {},
                    teamBroker: {}
                }
            },
            errors: {},
            editDisabled: false
        }
    },
    computed: {
        ...mapState('account', ['features']),
        formValid () {
            return (this.input.name)
        },
        isEditingExisting () {
            return !!this.teamType
        },
        dialogTitle () {
            if (this.teamType) {
                return 'Edit team type'
            } else {
                return 'Create team type'
            }
        },
        billingEnabled () {
            return !!this.features.billing
        },
        teamBrokerEnabled () {
            return !!this.input.properties.features.teamBroker
        }
    },
    methods: {
        confirm () {
            if (this.formValid) {
                const opts = {
                    name: this.input.name,
                    active: this.input.active,
                    description: this.input.description,
                    order: parseInt(this.input.order),
                    properties: {
                        users: { ...this.input.properties.users },
                        runtimes: { ...this.input.properties.runtimes },
                        devices: { ...this.input.properties.devices },
                        instances: { ...this.input.properties.instances },
                        features: { ...this.input.properties.features },
                        teamBroker: { ...this.input.properties.teamBroker }
                    }
                }
                // Utility function that ensures the specific property is
                // a number, or removed from the object if blank
                function formatNumber (obj, name) {
                    if (obj[name] === '' || obj[name] === null) {
                        // Blank string - remove the property
                        delete obj[name]
                    } else {
                        obj[name] = parseInt(obj[name])
                    }
                }
                // Ensure all numbers are numbers not strings, and strip any blank values
                formatNumber(opts.properties.users, 'limit')
                formatNumber(opts.properties.runtimes, 'limit')
                formatNumber(opts.properties.devices, 'limit')
                for (const instanceProperties of Object.values(opts.properties.instances)) {
                    formatNumber(instanceProperties, 'limit')
                }
                if (this.features.billing) {
                    formatNumber(opts.properties.devices, 'free')
                    for (const instanceProperties of Object.values(opts.properties.instances)) {
                        formatNumber(instanceProperties, 'free')
                    }
                    if (opts.properties.devices.combinedFreeType === '_') {
                        delete opts.properties.devices.combinedFreeType
                    } else if (opts.properties.devices.combinedFreeType) {
                        delete opts.properties.devices.free
                    }
                    opts.properties.billing = { ...this.input.properties.billing }
                    if (this.input.properties.trial.active) {
                        opts.properties.trial = { ...this.input.properties.trial }
                        formatNumber(opts.properties.trial, 'duration')
                        if (opts.properties.trial.instanceType === '_') {
                            delete opts.properties.trial.instanceType
                        }
                    } else {
                        opts.properties.trial = { active: false }
                    }
                    if (!opts.properties.billing.requireContact) {
                        delete opts.properties.billing.contactHSPortalId
                        delete opts.properties.billing.contactHSFormId
                    }
                }
                formatNumber(opts.properties.features, 'fileStorageLimit')
                formatNumber(opts.properties.features, 'contextLimit')
                if (opts.properties.teamBroker?.clients?.limit) {
                    formatNumber(opts.properties.teamBroker.clients, 'limit')
                }

                if (this.teamType) {
                    // For edits, we cannot touch the properties
                    // TODO: what can be edited when in use?
                    // delete opts.properties
                    // Update
                    teamTypesApi.updateTeamType(this.teamType.id, opts).then((response) => {
                        this.$emit('team-type-updated', response)
                    }).catch(err => {
                        console.error(err.response.data)
                        if (err.response.data) {
                            if (/name/.test(err.response.data.error)) {
                                this.errors.name = 'Name unavailable'
                            }
                        }
                    })
                } else {
                    teamTypesApi.create(opts).then((response) => {
                        this.$emit('team-type-created', response)
                    }).catch(err => {
                        console.error(err.response.data)
                        if (err.response.data) {
                            if (/name/.test(err.response.data.error)) {
                                this.errors.name = 'Name unavailable'
                            }
                        }
                    })
                }
            }
        }
    }
}
</script>
