<template>
    <ff-page>
        <ff-loading v-if="loading" message="Updating Team..." />
        <div v-else>
            <form class="space-y-8 flex flex-col items-center">
                <div>
                    <FormHeading>Change your team type</FormHeading>
                    <div v-if="isUnmanaged" class="space-y-2">
                        <p>
                            Your team type cannot currently be managed from the dashboard.
                        </p>
                        <p>
                            Please contact <a href="https://flowfuse.com/support/" class="underline" target="_blank">Support</a> for help.
                        </p>
                    </div>
                    <div v-else-if="isCurrentUnavailable">
                        <p>Your current team plan is no longer available. Please select a new plan to continue.</p>
                    </div>
                </div>
                <!-- TeamType Type -->
                <div class="grid">
                    <ff-tile-selection v-model="input.teamTypeId" data-form="team-type" class="justify-center">
                        <ff-tile-selection-option
                            v-for="(teamType, index) in teamTypes" :key="index"
                            :label="teamType.name" :description="teamType.description"
                            :price="billingEnabled ? (!isAnnualBilling ? teamType.billingPrice : teamType.annualBillingPrice) : ''"
                            :price-interval="billingEnabled ? (!isAnnualBilling ? teamType.billingInterval : teamType.annualBillingInterval) : ''"
                            :value="teamType.id"
                            :disabled="isUnmanaged || (isAnnualBilling && !teamType.annualBillingPrice && !teamType.properties?.billing?.requireContact)"
                        />
                    </ff-tile-selection>
                </div>
                <div v-if="billingEnabled && annualBillingAvailable" class="text-sm font-medium text-gray-400 flex items-center gap-2">
                    <span :class="{'text-gray-800': !isAnnualBilling }">Monthly</span>
                    <ff-toggle-switch v-model="isAnnualBilling" />
                    <span :class="{'text-gray-800': isAnnualBilling }">Yearly</span>
                </div>
                <div class="max-w-md w-full">
                    <template v-if="upgradeErrors.length > 0">
                        <div class="mb-8 text-sm text-gray-500 space-y-2">
                            <p>Your current usage of the platform is higher than that available to the {{ input.teamType?.name }} team.</p>
                            <p>To change to this type, you will need to reduce your usage:</p>
                            <ul class="space-y-2 list-disc ml-8">
                                <li v-for="(error, index) in upgradeErrors" :key="index">
                                    {{ error.error }}. {{ input.teamType?.name }} teams are limited to {{ error.limit }}, this team currently has {{ error.count }}.
                                </li>
                            </ul>
                        </div>
                    </template>
                    <template v-else-if="billingEnabled">
                        <div class="mb-8 text-sm text-gray-500 space-y-2 text-center">
                            <p v-if="isContactRequired">To learn more about our {{ input.teamType?.name }} plan, click below to contact our sales team.</p>
                            <p v-if="trialMode && !trialHasEnded">Setting up billing will bring your free trial to an end</p>
                            <p v-if="!isContactRequired && team.suspended">Setting up billing will unsuspend your team</p>
                            <p v-if="isUpgradingFromMonthlyToYearly">Any additional Hosted or Remote Instances will also switch to yearly billing.</p>
                            <p v-if="!isContactRequired"> Your billing subscription will be updated to reflect the new costs</p>
                        </div>
                    </template>
                    <div class="flex gap-x-4">
                        <ff-button kind="secondary" data-action="cancel-change-team-type" class="flex-1" @click="$router.back()">
                            Cancel
                        </ff-button>
                        <template v-if="!isContactRequired">
                            <ff-button
                                v-if="!billingEnabled || !billingMissing"
                                class="flex-1"
                                :disabled="!formValid" data-action="change-team-type"
                                @click="updateTeam()"
                            >
                                <span v-if="isUpgradingFromMonthlyToYearly">Switch to Yearly Billing</span>
                                <span v-else>Change team type</span>
                            </ff-button>
                            <ff-button
                                v-else :disabled="!formValid"
                                data-action="setup-team-billing"
                                class="flex-1"
                                @click="setupBilling()"
                            >
                                Setup Payment Details
                            </ff-button>
                        </template>
                        <template v-else>
                            <ff-button :disabled="!formValid" data-action="contact-sales" class="flex-1" @click="sendContact()">
                                Talk to sales
                            </ff-button>
                        </template>
                    </div>
                </div>
            </form>
        </div>
    </ff-page>
</template>

<script>
import { ChevronLeftIcon } from '@heroicons/vue/outline'
import { mapState } from 'vuex'

import billingApi from '../../api/billing.js'
import instanceTypesApi from '../../api/instanceTypes.js'
import teamApi from '../../api/team.js'
import teamTypesApi from '../../api/teamTypes.js'
import FormHeading from '../../components/FormHeading.vue'
import { useHubspotHelper } from '../../composables/Hubspot.js'

import Alerts from '../../services/alerts.js'
import Product from '../../services/product.js'

// eslint-disable-next-line vue/one-component-per-file
export default {
    name: 'ChangeTeamType',
    components: {
        FormHeading
    },
    setup () {
        const { talkToSalesCalendarModal } = useHubspotHelper()

        return { talkToSalesCalendarModal }
    },
    data () {
        return {
            mounted: false,
            loading: false,
            redirecting: false,
            teamTypes: [],
            instanceTypes: {},
            icons: {
                chevronLeft: ChevronLeftIcon
            },
            init: {
                teamTypeId: ''
            },
            input: {
                teamTypeId: '',
                teamType: null
            },
            annualBillingAvailable: false,
            isAnnualBilling: false
        }
    },
    computed: {
        ...mapState('account', ['user', 'team', 'features']),
        formValid () {
            const isChangingTeamType = this.input.teamTypeId !== this.team.type.id

            return !this.isUnmanaged &&
                    this.input.teamTypeId &&
                    this.isSelectionAvailable &&
                    (this.billingMissing || isChangingTeamType || this.isUpgradingFromMonthlyToYearly) &&
                    this.upgradeErrors.length === 0
        },
        isUpgradingFromMonthlyToYearly () {
            const inputTeamHasAnnual = Object.prototype.hasOwnProperty.call(this.input, 'teamType') &&
                Object.prototype.hasOwnProperty.call(this.input.teamType, 'properties') &&
                Object.prototype.hasOwnProperty.call(this.input.teamType.properties, 'billing') &&
                Object.prototype.hasOwnProperty.call(this.input.teamType.properties.billing, 'yrPriceId')

            return inputTeamHasAnnual && this.team.billing?.interval === 'month' && this.isAnnualBilling
        },
        billingEnabled () {
            return this.features.billing
        },
        trialMode () {
            return this.team.billing?.trial
        },
        trialHasEnded () {
            return this.team.billing?.trialEnded
        },
        billingDisabledForSelectedTeamType () {
            // This team's type has billing disabled
            return this.input.teamType?.properties?.billing?.disabled
        },
        billingMissing () {
            // True if the team is missing billing information (and its required)
            return this.billingEnabled &&
                !this.billingDisabledForSelectedTeamType &&
                !this.team.billing?.active
        },
        isUnmanaged () {
            return this.team.billing?.unmanaged
        },
        isContactRequired () {
            return this.billingEnabled &&
                   !this.user.admin &&
                   this.input.teamType &&
                   this.input.teamTypeId !== this.team.type.id &&
                   this.input.teamType.properties?.billing?.requireContact
        },
        isSelectionAvailable () {
            if (this.input.teamTypeId) {
                // Ensure that this.inputs.teamTypeId is one of the available types
                if (this.teamTypes.length === 0) {
                    return false
                }
                return !!this.teamTypes.find(tt => tt.id === this.input.teamTypeId)
            }
            return false
        },
        isCurrentUnavailable () {
            if (this.teamTypes.length === 0) {
                return false
            }
            // The team's current type is no longer available
            return !this.teamTypes.find(tt => tt.id === this.team.type.id)
        },
        upgradeErrors () {
            if (!this.input.teamType) {
                return
            }
            try {
                // Check the following limits:
                // - User count
                // - Device count
                // - Instance Type counts
                const errors = []
                const currentMemberCount = this.team.memberCount
                const targetMemberLimit = this.input.teamType.properties?.users?.limit ?? -1
                if (targetMemberLimit !== -1 && targetMemberLimit < currentMemberCount) {
                    errors.push({
                        code: 'member_limit_reached',
                        error: 'Team Member limit reached',
                        limit: targetMemberLimit,
                        count: currentMemberCount
                    })
                }

                const currentInstanceCountsByType = this.team.instanceCountByType
                const targetInstanceLimits = {}
                let totalInstanceCount = 0
                for (const instanceType of Object.keys(currentInstanceCountsByType)) {
                    if (!this.input.teamType.properties?.instances?.[instanceType]?.active ?? false) {
                        targetInstanceLimits[instanceType] = 0
                    } else {
                        targetInstanceLimits[instanceType] = this.input.teamType.properties?.instances?.[instanceType]?.limit ?? -1
                    }
                    totalInstanceCount += currentInstanceCountsByType[instanceType]
                    if (targetInstanceLimits[instanceType] !== -1 && targetInstanceLimits[instanceType] < currentInstanceCountsByType[instanceType]) {
                        errors.push({
                            code: 'instance_limit_reached',
                            error: `${this.instanceTypes[instanceType].name} instance type limit reached`,
                            type: this.instanceTypes[instanceType].name,
                            limit: targetInstanceLimits[instanceType],
                            count: currentInstanceCountsByType[instanceType]
                        })
                    }
                }

                const currentDeviceCount = this.team.deviceCount
                const targetDeviceLimit = this.input.teamType.properties?.devices?.limit ?? -1
                if (targetDeviceLimit !== -1 && targetDeviceLimit < currentDeviceCount) {
                    errors.push({
                        code: 'device_limit_reached',
                        error: 'Device limit reached',
                        limit: targetDeviceLimit,
                        count: currentDeviceCount
                    })
                }

                // Check for a combined instance+device limit
                const runtimeLimit = this.input.teamType.properties?.runtimes?.limit ?? -1
                if (runtimeLimit > -1) {
                    const currentRuntimeCount = currentDeviceCount + totalInstanceCount
                    if (currentRuntimeCount > runtimeLimit) {
                        errors.push({
                            code: 'runtime_limit_reached',
                            error: 'Runtime limit reached',
                            limit: runtimeLimit,
                            count: currentRuntimeCount
                        })
                    }
                }
                return errors
            } catch (err) {
                console.warn(err)
                return []
            }
        }
    },
    watch: {
        'input.teamTypeId': function (v) {
            if (v) {
                this.input.teamType = this.teamTypes.find(tt => tt.id === v)
                if (!this.input.teamType && this.team.type.id === v) {
                    this.input.teamType = this.team.type
                }
            } else {
                this.input.teamType = null
            }
        },
        isAnnualBilling () {
            this.input.teamTypeId = this.init.teamTypeId
        }
    },
    async created () {
        this.teamTypes = (await teamTypesApi.getTeamTypes()).types.map(teamType => {
            if (teamType.id === this.team.type.id) {
                teamType.name = `${teamType.name} (current)`
            }
            return teamType
        }).sort((a, b) => a.order - b.order)
        this.input.teamTypeId = this.team.type.id

        this.teamTypes.forEach(tt => {
            // Check if *any* team type has annual billing available
            if (tt.annualBillingPrice) {
                this.annualBillingAvailable = true
            }
        })

        const instanceTypes = (await instanceTypesApi.getInstanceTypes()).types
        instanceTypes.forEach(instanceType => {
            this.instanceTypes[instanceType.id] = instanceType
        })

        if (this.team.billing?.interval === 'month') {
            this.isAnnualBilling = false
        } else if (this.team.billing?.interval === 'year') {
            this.isAnnualBilling = true
        }
    },
    async mounted () {
        this.mounted = true
        this.init.teamTypeId = this.team.type.id
    },
    methods: {
        updateTeam () {
            this.loading = true

            const opts = {
                type: this.input.teamTypeId
            }
            if (this.billingEnabled) {
                opts.billing = {
                    interval: this.isAnnualBilling ? 'year' : 'month'
                }
            }

            teamApi.updateTeam(this.team.id, opts).then(async result => {
                await this.$store.dispatch('account/refreshTeams')
                await this.$store.dispatch('account/refreshTeam')
                // send posthog event
                Product.capture('$ff-team-type-changed', {
                    'team-type-id': opts.type,
                    'team-type-id-previous': this.init.teamTypeId
                }, {
                    team: this.team.id
                })
                this.$router.push({ name: 'Team', params: { team_slug: result.slug } })
            }).catch(err => {
                Alerts.emit('Unable to change team type: ' + err.response.data.error, 'warning', 15000)
            }).finally(() => {
                this.loading = false
            })
        },
        setupBilling: async function () {
            this.loading = true
            try {
                const billingInterval = this.isAnnualBilling ? 'year' : 'month'
                const response = await billingApi.createSubscription(this.team.id, this.input.teamTypeId, billingInterval)
                window.open(response.billingURL, '_self')
            } catch (err) {
                Alerts.emit('Something went wrong with the request. Please try again or contact support for help.', 'info', 15000)
                console.error('Error creating initial subscription: ', err)
                this.loading = false
            }
        },
        sendContact: async function () {
            this.talkToSalesCalendarModal(this.user, this.input.teamType)
        }
    }
}
</script>
