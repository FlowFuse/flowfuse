<template>
    <div v-if="features.billing" class="space-y-6">
        <FormHeading class="text-red-700">Admin Only Tools</FormHeading>
        <div class="font-bold">Stripe Details</div>
        <div class="flex flex-col space-y-4 max-w-2xl lg:flex-row lg:items-center lg:space-y-0">
            <table class="ff-team-properties-table">
                <tr>
                    <td class="font-medium pr-4">Customer ID:</td>
                    <td><div class="py-2"><a v-if="stripeCustomerUrl" :href="stripeCustomerUrl" class="underline" target="_blank">{{ team.billing.customer }}</a><span v-else>none</span></div></td>
                </tr>
                <tr>
                    <td class="font-medium pr-4">Subscription ID:</td>
                    <td><div class="py-2"><a v-if="stripeSubscriptionUrl" :href="stripeSubscriptionUrl" class="underline" target="_blank">{{ team.billing.subscription }}</a><span v-else>none</span></div></td>
                </tr>
            </table>
        </div>
        <div v-if="!isUnmanaged && trialMode" class="flex flex-col space-y-4 max-w-2xl lg:flex-row lg:items-center lg:space-y-0">
            <div class="flex-grow">
                <table class="table-fixed max-w-sm">
                    <tr v-if="!trialHasEnded">
                        <td class="font-medium font-bold pr-4">Trial Ends:</td>
                        <td><div class="py-2">{{ trialEndDate }}</div></td>
                    </tr>
                    <tr v-else>
                        <td class="font-medium font-bold pr-4">Trial Ended</td>
                    </tr>
                </table>
            </div>
            <div class="min-w-fit flex-shrink-0">
                <ff-button kind="danger" @click="confirmExtendTrial()">Extend Trial</ff-button>
            </div>
        </div>
        <div class="flex flex-col space-y-4 max-w-2xl lg:flex-row lg:items-center lg:space-y-0">
            <div class="flex-grow">
                <div class="max-w-sm pr-2">
                    <template v-if="team.suspended">
                        <b>This team is suspended.</b><br>
                        It must be reactivated before it can be put into manual billing mode.
                    </template>
                    <template v-else-if="isUnmanaged">
                        <b>This team is in manual billing mode.</b><br>
                        Enabling billing will require the team to setup
                        billing again before they can continue using the team.
                    </template>
                    <template v-else-if="trialMode">
                        <b>This team is in trial mode.</b><br>
                        Setting up manual billing will allow this team to make
                        full use of the platform without requiring them to
                        configure their billing details.
                    </template>
                    <template v-else-if="billingSetUp">
                        <b>This team already has billing setup.</b><br>
                        Setting up manual billing will cancel their existing
                        subscription and allow this team to make full use of the
                        platform without requiring them to configure their billing
                        details.
                    </template>
                    <template v-else>
                        <b>This team does not have billing setup.</b><br>
                        Enabling manual billing will allow this team to make full
                        use of the platform without requiring them to configure
                        their billing details.
                    </template>
                </div>
            </div>
            <div class="min-w-fit flex-shrink-0">
                <ff-button v-if="!isUnmanaged" kind="danger" data-action="admin-setup-billing" :disabled="team.suspended" @click="confirmManualBilling()">Setup Manual Billing</ff-button>
                <ff-button v-else kind="danger" data-action="admin-disable-billing" @click="disableManualBilling()">Enable Billing</ff-button>
            </div>
        </div>
        <div class="flex flex-col space-y-4 max-w-2xl lg:flex-row lg:items-center lg:space-y-0">
            <div class="font-bold flex-grow">Usage Limits</div>
            <div class="min-w-fit flex-shrink-0">
                <template v-if="!editingLimits">
                    <ff-button kind="primary" @click="editOverrides">Edit usage limits</ff-button>
                </template>
                <div v-else class="flex flex-row space-x-2">
                    <ff-button kind="secondary" @click="editingLimits = false">Cancel</ff-button>
                    <ff-button kind="danger" @click="saveOverrides">Done</ff-button>
                </div>
            </div>
        </div>
        <p class="max-w-2xl">
            The following usage limits apply to this team. They are based on the team's current type.
            Individual limits can be modified for this team to provide a custom configuration.
            <ul class="list-disc pl-6">
                <li>The team's billing will not update until they add/remove an instance</li>
                <li>Any changes made here will still apply if the team changes its type</li>
            </ul>
        </p>
        <div class="flex flex-col space-y-4 max-w-2xl lg:flex-row lg:items-center lg:space-y-0">
            <table class="ff-team-properties-table">
                <tr>
                    <th class="font-medium">Users:</th>
                    <td v-if="!editingLimits"><div>{{ getTeamProperty('users_limit') }}</div></td>
                    <td v-else>
                        <div class="grid grid-cols-2 gap-2 my-2">
                            <FormRow v-model="editableLimits.users.limit" :placeholder="''+(getTeamTypeProperty('users_limit') ?? '')" />
                        </div>
                    </td>
                </tr>

                <tr v-for="(instanceType, index) in instanceTypes" :key="index">
                    <th>{{ instanceType.name }} Instance:</th>
                    <template v-if="!editingLimits">
                        <td v-if="getTeamProperty(`instances_${instanceType.id}_active`)">
                            <span>{{ getTeamProperty(`instances_${instanceType.id}_free`) || 0 }} - {{ getTeamProperty(`instances_${instanceType.id}_limit`) || 'unlimited' }}</span>
                        </td>
                        <td v-else>
                            None
                        </td>
                    </template>
                    <template v-else>
                        <td>
                            <div class="grid grid-cols-2 gap-2 my-2">
                                <FormRow v-model="editableLimits.instances[instanceType.id].active" type="checkbox" :placeholder="getTeamTypeProperty(`instances_${instanceType.id}_active`) ?? ''">Available</FormRow>
                                <FormRow v-if="editableLimits.instances[instanceType.id].active" v-model="editableLimits.instances[instanceType.id].creatable" type="checkbox" :placeholder="''+getTeamTypeProperty(`instances_${instanceType.id}_creatable`)">Creatable</FormRow>
                                <FormRow v-if="editableLimits.instances[instanceType.id].active" v-model="editableLimits.instances[instanceType.id].free" :placeholder="''+(getTeamTypeProperty(`instances_${instanceType.id}_free`) ?? '')"># Included</FormRow>
                                <FormRow v-if="editableLimits.instances[instanceType.id].active" v-model="editableLimits.instances[instanceType.id].limit" :placeholder="''+(getTeamTypeProperty(`instances_${instanceType.id}_limit`) ?? '')"># Limit</FormRow>
                            </div>
                        </td>
                    </template>
                </tr>
                <tr>
                    <th>Remote Instance:</th>
                    <td v-if="!editingLimits">
                        <span v-if="!getTeamProperty('devices_free')">
                            <div>{{ getTeamProperty('instances_' + getTeamProperty('devices_combinedFreeType') + '_free') || 0 }} - {{ getTeamProperty(`devices_limit`) || 'unlimited' }}</div>
                            <div class="text-xs">Shared with {{ getInstanceTypeName(getTeamProperty('devices_combinedFreeType')) }} </div>
                        </span>
                        <span v-else>
                            {{ getTeamProperty(`devices_free`) || 0 }} - {{ getTeamProperty(`devices_limit`) || 'unlimited' }}
                        </span>
                    </td>
                    <td v-else>
                        <div class="grid grid-cols-2 gap-2 my-2">
                            <FormRow v-model="editableLimits.devices.free" :placeholder="''+(getTeamTypeProperty('devices_free') ?? '')" :disabled="editableLimits.devices.combinedFreeType !== '_'"># Included</FormRow>
                            <FormRow v-model="editableLimits.devices.limit" :placeholder="''+(getTeamTypeProperty('devices_limit') ?? '')"># Limit</FormRow>
                        </div>
                        <FormRow v-model="editableLimits.devices.combinedFreeType" :options="deviceFreeOptions" class="mb-4">Share included allocation with instance type:</FormRow>
                    </td>
                </tr>
                <tr>
                    <th>MQTT Clients:</th>
                    <td v-if="!editingLimits"><div>{{ getTeamProperty('teamBroker_clients_limit') }}</div></td>
                    <td v-else>
                        <div class="grid grid-cols-2 gap-2 my-2">
                            <FormRow v-model="editableLimits.teamBroker.clients.limit" :placeholder="''+(getTeamTypeProperty('teamBroker_clients_limit') ?? '')" />
                        </div>
                    </td>
                </tr>
                <tr>
                    <th>Features:</th>
                    <td>
                        <span v-if="featureOverrideCount > 0">
                            * {{ featureOverrideCount }} override<span v-if="featureOverrideCount > 1">s</span> applied
                        </span>
                        <span v-else>
                            &nbsp;
                        </span>
                    </td>
                </tr>
                <tr>
                    <td colspan="2">
                        <div class="grid grid-cols-2 gap-2 my-2">
                            <div v-for="(feature, index) in featureList" :key="index">
                                <FormRow v-model="editableLimits.features[feature]" :disabled="!editingLimits" type="checkbox">
                                    {{ featureNames[feature] }}
                                    <span v-if="editableLimits.features[feature] !== teamTypeDefaultFeatures[feature]" class="text-sm text-gray-500">*</span>
                                </FormRow>
                            </div>
                        </div>
                    </td>
                </tr>
            </table>
        </div>
    </div>
    <ConfirmTeamManualBillingDialog ref="confirmTeamManualBillingDialog" @setup-manual-billing="setupManualBilling" />
    <ExtendTeamTrialDialog ref="extendTeamTrialDialog" @extend-team-trial="extendTrial" />
</template>

<script>
import { mapState } from 'vuex'

import { featureList, featureNames } from '../../../../../forge/lib/features.js'
import billingApi from '../../../api/billing.js'
import instanceTypesApi from '../../../api/instanceTypes.js'
import teamApi from '../../../api/team.js'

import FormHeading from '../../../components/FormHeading.vue'
import FormRow from '../../../components/FormRow.vue'

import formatDateMixin from '../../../mixins/DateTime.js'
import Dialog from '../../../services/dialog.js'

import { getObjectValue } from '../../admin/Template/utils.js'

import ConfirmTeamManualBillingDialog from '../dialogs/ConfirmTeamManualBillingDialog.vue'
import ExtendTeamTrialDialog from '../dialogs/ExtendTeamTrialDialog.vue'

export default {
    name: 'TeamAdminTools',
    components: {
        FormHeading,
        FormRow,
        ConfirmTeamManualBillingDialog,
        ExtendTeamTrialDialog
    },
    mixins: [formatDateMixin],
    props: {
        team: {
            type: Object,
            required: true
        }
    },
    data () {
        return {
            featureList,
            featureNames,
            instanceTypes: [],
            deviceFreeOptions: [],
            editingLimits: false,
            editableLimits: {
                users: {},
                features: {}
            }
        }
    },
    computed: {
        ...mapState('account', ['features']),
        billingSetUp () {
            return this.team.billing?.active
        },
        subscriptionExpired () {
            return this.team.billing?.canceled
        },
        isUnmanaged () {
            return this.team.billing?.unmanaged
        },
        trialMode () {
            return this.team.billing?.trial
        },
        trialHasEnded () {
            return this.team.billing?.trialEnded
        },
        trialEndDate () {
            return this.formatDateTime(this.team.billing?.trialEndsAt)
        },
        stripeCustomerUrl () {
            if (this.team.billing?.customer) {
                return `https://dashboard.stripe.com/customers/${this.team.billing.customer}`
            }
            return null
        },
        stripeSubscriptionUrl () {
            if (this.team.billing?.subscription) {
                return `https://dashboard.stripe.com/subscriptions/${this.team.billing.subscription}`
            }
            return null
        },
        teamTypeDefaultFeatures () {
            const result = {}
            // The current api implementation modifies team.type.properties.features to already include
            // the overrides. To identify which are actual overrides, we need to check for their presence
            // in team.properties.features (which only includes overrides) and apply the inverse
            this.featureList.forEach(feature => {
                result[feature] = getObjectValue(this.team.type.properties, `features_${feature}`)
                if (getObjectValue(this.team.properties, `features_${feature}`) !== undefined) {
                    // There is an override - invert the value
                    result[feature] = !result[feature]
                } else if (result[feature] === undefined) {
                    result[feature] = false
                }
            })
            return result
        },

        featureOverrideCount () {
            let count = 0
            this.featureList.forEach(feature => {
                if (this.editableLimits.features[feature] !== this.teamTypeDefaultFeatures[feature]) {
                    count++
                }
            })
            return count
        }
    },
    async created () {
        const instanceTypes = await instanceTypesApi.getInstanceTypes()
        instanceTypes.types.sort((A, B) => A.order - B.order)
        this.instanceTypes = instanceTypes.types
        this.deviceFreeOptions = this.instanceTypes.map(it => {
            return {
                value: it.id,
                label: it.name
            }
        })
        this.deviceFreeOptions.unshift({ value: '_', label: 'None - use own free limit' })
        this.featureList.forEach(feature => {
            this.editableLimits.features[feature] = this.getTeamProperty(`features_${feature}`) || false
        })
    },
    methods: {
        getTeamProperty (property) {
            if (this.team.properties) {
                const teamProperty = getObjectValue(this.team.properties, property)
                if (teamProperty !== undefined) {
                    return teamProperty
                }
            }
            return getObjectValue(this.team.type.properties, property)
        },
        getTeamTypeProperty (property) {
            return getObjectValue(this.team.type.properties, property)
        },
        getInstanceTypeName (instanceTypeId) {
            const instanceType = this.instanceTypes.find(it => it.id === instanceTypeId)
            if (instanceType) {
                return instanceType.name
            }
            return 'unknown'
        },
        confirmManualBilling () {
            this.$refs.confirmTeamManualBillingDialog.show(this.team)
        },
        async setupManualBilling (teamTypeId) {
            billingApi.setupManualBilling(this.team.id, teamTypeId).then(async () => {
                await this.$store.dispatch('account/refreshTeams')
                await this.$store.dispatch('account/refreshTeam')
            }).catch(err => {
                console.warn(err)
            })
        },
        async disableManualBilling () {
            return Dialog.show({
                header: 'Enable Billing',
                kind: 'danger',
                text: 'Are you sure you want to re-enable billing for this team?'
            }, async () => {
                billingApi.disableManualBilling(this.team.id).then(async () => {
                    await this.$store.dispatch('account/refreshTeams')
                    await this.$store.dispatch('account/refreshTeam')
                }).catch(err => {
                    console.warn(err)
                })
            })
        },
        confirmExtendTrial () {
            this.$refs.extendTeamTrialDialog.show(this.team)
        },
        async extendTrial (endDate) {
            const newEndDate = Date.parse(`${endDate}T12:00:00.000Z`)
            billingApi.setTrialExpiry(this.team.id, newEndDate).then(async () => {
                await this.$store.dispatch('account/refreshTeams')
                await this.$store.dispatch('account/refreshTeam')
            }).catch(err => {
                console.warn(err)
            })
        },
        editOverrides () {
            // Copy team properties to an editable object
            // Set editingLimits flag
            this.editableLimits.users = { limit: this.getTeamProperty('users_limit') ?? '' }
            this.editableLimits.devices = {
                free: this.getTeamProperty('devices_free') ?? '',
                limit: this.getTeamProperty('devices_limit') ?? '',
                combinedFreeType: this.getTeamProperty('devices_combinedFreeType')
            }
            if (this.editableLimits.devices.free !== '') {
                this.editableLimits.devices.combinedFreeType = '_'
            }
            this.editableLimits.instances = {}
            this.instanceTypes.forEach(instanceType => {
                this.editableLimits.instances[instanceType.id] = {
                    free: this.getTeamProperty(`instances_${instanceType.id}_free`) ?? '',
                    limit: this.getTeamProperty(`instances_${instanceType.id}_limit`) ?? '',
                    active: this.getTeamProperty(`instances_${instanceType.id}_active`) ?? '',
                    creatable: this.getTeamProperty(`instances_${instanceType.id}_creatable`) ?? ''
                }
            })
            this.editableLimits.teamBroker = {
                clients: { limit: this.getTeamProperty('teamBroker_clients_limit') ?? '' }
            }
            this.featureList.forEach(feature => {
                this.editableLimits.features[feature] = this.getTeamProperty(`features_${feature}`) || false
            })

            this.editingLimits = true
        },
        async saveOverrides () {
            // There is a fair amount of overlap with the TeamTypeEditDialog here - more than
            // I thought there would be when I started down this path.
            // We should probably refactor this into a common function.
            function formatNumber (obj, name, defaultValue) {
                if (obj[name] === '' || obj[name] === null) {
                    // Blank string - remove the property
                    delete obj[name]
                } else {
                    obj[name] = parseInt(obj[name])
                    if (obj[name] === defaultValue) {
                        delete obj[name]
                    }
                }
            }
            const properties = {
                users: { ...this.editableLimits.users },
                instances: {},
                devices: { ...this.editableLimits.devices },
                teamBroker: { clients: { ...this.editableLimits.teamBroker.clients } },
                features: {}
            }
            Object.keys(this.editableLimits.instances).forEach(instanceTypeId => {
                properties.instances[instanceTypeId] = { ...this.editableLimits.instances[instanceTypeId] }
                if (properties.instances[instanceTypeId].creatable === this.getTeamTypeProperty(`instances_${instanceTypeId}_creatable`)) {
                    delete properties.instances[instanceTypeId].creatable
                }
                formatNumber(properties.instances[instanceTypeId], 'free', this.getTeamTypeProperty(`instances_${instanceTypeId}_free`))
                formatNumber(properties.instances[instanceTypeId], 'limit', this.getTeamTypeProperty(`instances_${instanceTypeId}_limit`))
                if (properties.instances[instanceTypeId].active === this.getTeamTypeProperty(`instances_${instanceTypeId}_active`)) {
                    if (properties.instances[instanceTypeId].active === false) {
                        // Wipe out all other overrides if marked as inactive
                        properties.instances[instanceTypeId] = { }
                    } else {
                        delete properties.instances[instanceTypeId].active
                    }
                } else if (properties.instances[instanceTypeId].active === false) {
                    // Wipe out all other overrides if marked as inactive
                    properties.instances[instanceTypeId] = { active: false }
                }
            })
            formatNumber(properties.users, 'limit', this.getTeamTypeProperty('users_limit'))
            formatNumber(properties.devices, 'limit', this.getTeamTypeProperty('devices_limit'))
            formatNumber(properties.devices, 'free', this.getTeamTypeProperty('devices_free'))
            formatNumber(properties.teamBroker.clients, 'limit', this.getTeamTypeProperty('teamBroker_clients_limit'))

            if (properties.devices.combinedFreeType !== '_') {
                // Have selected a shared free limit - delete any entered value
                delete properties.devices.free
            }
            if (properties.devices.combinedFreeType === '_' || properties.devices.combinedFreeType === this.getTeamTypeProperty('devices_combinedFreeType')) {
                // Have selected own limit, or same as the team type - delete the override
                delete properties.devices.combinedFreeType
            }

            Object.keys(this.editableLimits.features).forEach(feature => {
                // only store the delta from the TeamType
                // The current API modifies team.type.properties.features to already include the overrides.
                // We first need to infer the default value by checking for an override in team.properties.features
                let teamTypeValue = this.team.type.properties.features[feature] || false
                if (getObjectValue(this.team.properties, `features_${feature}`) !== undefined) {
                    // There is an override - invert the value
                    teamTypeValue = !teamTypeValue
                }

                if (teamTypeValue !== this.editableLimits.features[feature]) {
                    properties.features[feature] = this.editableLimits.features[feature]
                } else {
                    delete properties.features[feature]
                }
            })

            await teamApi.updateTeam(this.team.id, { properties })
            await this.$store.dispatch('account/refreshTeam')
            this.editingLimits = false
        }
    }
}
</script>
<style lang="scss" scoped>
.ff-team-properties-table {
    padding: 9px 12px;
    border-radius: 0.25rem;
    background-color: white;
    border-collapse: separate;
    border-width: 1px;
    border-color: $ff-grey-300;
    min-width: 400px;
    td {
        height: 36px;
    }
    tr:not(:last-child) {
        td,th {
            border-bottom: 1px solid $ff-grey-100;
        }
    }
    th {
        font-weight: 600;
        padding-right: 12px;
    }
}
</style>
