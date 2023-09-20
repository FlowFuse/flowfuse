<template>
    <div
        v-if="subscription?.customer?.balance < 0"
        class="ff-banner ff-banner-info mb-3"
        data-el="credit-balance-banner"
    >
        You have a credit balance of {{ formatCurrency(Math.abs(subscription.customer.balance)) }} that will be applied to the next invoice.
    </div>
    <div
        v-else-if="subscription?.customer?.balance > 0"
        class="ff-banner ff-banner-info mb-3"
        data-el="credit-balance-banner"
    >
        You owe {{ formatCurrency(Math.abs(subscription.customer.balance)) }} that will be applied to the next invoice.
    </div>
    <ff-page>
        <template #header>
            <ff-page-header title="Team Billing">
                <template #tools>
                    <ff-button v-if="subscription" @click="customerPortal()">
                        <template #icon-right><ExternalLinkIcon /></template>
                        Stripe Customer Portal
                    </ff-button>
                </template>
            </ff-page-header>
        </template>
        <form class="pt-4">
            <Loading v-if="loading" size="small" />
            <div v-else-if="billingSetUp">
                <FormHeading v-if="trialMode" class="mb-6">Trial Ends:  <span class="font-normal">{{ formatDate(team.billing.trialEndsAt) }}</span></FormHeading>
                <FormHeading class="mb-6">Next Payment: <span v-if="subscription && !subscriptionExpired" class="font-normal">{{ formatDate(subscription.next_billing_date) }}</span></FormHeading>
                <div v-if="subscriptionExpired" class="ff-no-data ff-no-data-large">
                    Your subscription has expired. Please renew it to continue using FlowFuse.

                    <ff-button data-action="renew-subscription" class="mx-auto mt-3" @click="setupBilling()">
                        <template #icon-right><ExternalLinkIcon /></template>
                        Renew Subscription
                    </ff-button>
                </div>
                <div v-else-if="subscription">
                    <ff-data-table :columns="columns" :rows="subscription.items" />
                    <div v-if="hasTrialProject" class="text-gray-400 mt-1 pl-2 text-sm">Your trial instance will be automatically added to your subscription when the trial ends</div>
                </div>
                <div v-else class="ff-no-data ff-no-data-large">
                    Something went wrong loading your subscription information, please try again.
                </div>
            </div>
            <div v-else class="ff-no-data ff-no-data-large">
                <div class="max-w-lg mx-auto">
                    <div v-if="trialMode">
                        You are currently in a free trial.
                        <template v-if="isRestrictedTrial">
                            During the trial you can only create one application instance in the team. To unlock other features you will need to configure your billing details.
                        </template>
                        <template v-else>
                            During the trial you can make full use of the features available to your team. To keep things running after the trial ends you will need to configure your billing details.
                        </template>
                    </div>
                    <div v-else>
                        Billing has not yet been configured for this team. Before proceeding further, you must continue to Stripe and complete this.
                    </div>
                </div>
                <div class="mt-6">
                    <ff-button data-action="setup-payment-details" class="mx-auto mt-3" @click="setupBilling()">
                        <template #icon-right><ExternalLinkIcon /></template>
                        Setup Payment Details
                    </ff-button>
                </div>
            </div>
        </form>
    </ff-page>
</template>

<script>

import { ExternalLinkIcon } from '@heroicons/vue/outline'
import { markRaw } from 'vue'

import billingApi from '../../api/billing.js'

import FormHeading from '../../components/FormHeading.vue'
import Loading from '../../components/Loading.vue'
import formatCurrency from '../../mixins/Currency.js'
import formatDateMixin from '../../mixins/DateTime.js'
import permissionsMixin from '../../mixins/Permissions.js'

const priceCell = {
    name: 'PriceCell',
    props: ['price'],
    mixins: [formatCurrency],
    computed: {
        formattedPrice: function () {
            return this.formatCurrency(this.price)
        }
    },
    template: '<div>{{ formattedPrice }}</div>'
}

const totalPriceCell = {
    name: 'PriceCell',
    props: ['total_price'],
    mixins: [formatCurrency],
    computed: {
        formattedPrice: function () {
            return this.formatCurrency(this.total_price)
        }
    },
    template: '<div>{{ formattedPrice }}</div>'
}

export default {
    name: 'TeamBilling',
    components: {
        Loading,
        FormHeading,
        ExternalLinkIcon
    },
    mixins: [formatDateMixin, formatCurrency, permissionsMixin],
    props: {
        billingUrl: {
            type: String,
            required: true
        },
        team: {
            type: Object,
            required: true
        },
        teamMembership: {
            type: Object,
            required: true
        }
    },
    data () {
        return {
            loading: false,
            subscription: null,
            missingSubscription: false,
            columns: [{
                name: 'label',
                key: 'name',
                sortable: true
            }, {
                label: 'Quantity',
                key: 'quantity',
                sortable: true
            }, {
                label: 'Unit Price (US$)',
                key: 'price',
                sortable: true,
                component: {
                    is: markRaw(priceCell)
                }
            }, {
                label: 'Total Price (US$)',
                key: 'total_price',
                sortable: true,
                component: {
                    is: markRaw(totalPriceCell)
                }
            }],
            errors: {}
        }
    },
    computed: {
        billingSetUp () {
            return !this.missingSubscription && this.team.billing?.active
        },
        subscriptionExpired () {
            return this.team.billing?.canceled
        },
        trialMode () {
            return this.team.billing?.trial
        },
        isRestrictedTrial () {
            return !!this.team.type?.properties?.trial?.instanceType
        },
        hasTrialProject () {
            // Infer that if they cannot create a trial project, they must already have one.
            return this.trialMode && // !this.team.billing.trialProjectAllowed
                this.isRestrictedTrial &&
                this.team.instanceCountByType[this.team.type?.properties?.trial?.instanceType] > 0
        }
    },
    watch: { },
    async mounted () {
        if (!this.billingSetUp) {
            return
        }

        if (!this.hasPermission('team:edit')) {
            return this.$router.push({ path: `/team/${this.team.slug}/overview` })
        }

        this.loading = true
        try {
            const billingSubscription = await billingApi.getSubscriptionInfo(this.team.id)
            billingSubscription.next_billing_date = billingSubscription.next_billing_date * 1000 // API returns Seconds, JS expects miliseconds
            this.subscription = billingSubscription
            this.subscription.items.map((item) => {
                item.total_price = item.price * item.quantity
                return item
            })
            if (this.trialMode) {
                if (this.hasTrialProject) {
                    this.subscription.items.push({
                        name: 'Trial Project',
                        quantity: 1,
                        price: 0,
                        total_price: 0
                    })
                }
            }
        } catch (err) {
            // Missing subscription
            this.missingSubscription = true
        }
        this.loading = false
    },
    methods: {
        customerPortal () {
            billingApi.toCustomerPortal(this.team.id)
        },
        async setupBilling () {
            let billingUrl = this.$route.query.billingUrl
            if (!billingUrl) {
                const response = await billingApi.createSubscription(this.team.id)
                billingUrl = response.billingURL
            }
            window.open(billingUrl, '_self')
        }
    }
}
</script>
