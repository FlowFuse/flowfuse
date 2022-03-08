<template>
    <form class="space-y-6">
        <Loading v-if="loading && !subscription"/>
        <div v-else-if="!loading && subscription">
            <FormHeading v-if="subscription">Next Bill: <span class="font-normal">{{ formatDate(subscription.next_billing_date) }}</span></FormHeading>
            <FormHeading>Active Subscriptions</FormHeading>
            <div v-if="subscription">
                <ItemTable :items="subscription.items" :columns="columns" />
            </div>
            <FormHeading>View/Update Payment Details</FormHeading>
            <div>
                <button type="button" class="forge-button forge-button-small" @click="customerPortal()">
                    <span>Stripe Customer Portal</span>
                    <ExternalLinkIcon class="ml-3 w-4" />
                </button>
            </div>
        </div>
        <div v-else>
            Billing has not yet been configured for this team. Before proceeding further, you must continue to Stripe and complete this.
            <div class="mt-3">
                <button type="button" class="forge-button forge-button-small" @click="setupBilling()">
                    <span>Setup Payment Details</span>
                    <ExternalLinkIcon class="ml-3 w-4" />
                </button>
            </div>
        </div>
    </form>
</template>

<script>

import { markRaw } from 'vue'
import { mapState } from 'vuex'

import billingApi from '@/api/billing.js'
import Loading from '@/components/Loading'
import FormHeading from '@/components/FormHeading'
import ItemTable from '@/components/tables/ItemTable'

import formatDateMixin from '@/mixins/DateTime.js'
import formatCurrency from '@/mixins/Currency.js'

import { ExternalLinkIcon } from '@heroicons/vue/outline'

const currencyCell = {
    name: 'CurrencyCell',
    props: ['price'],
    mixins: [formatCurrency],
    computed: {
        formattedPrice: function () {
            return this.formatCurrency(this.price)
        }
    },
    template: '<div>{{ formattedPrice }}</div>'
}

export default {
    name: 'TeamSettingsBilling',
    props: ['billingUrl'],
    mixins: [formatDateMixin, formatCurrency],
    data () {
        return {
            loading: false,
            subscription: null,
            columns: [{
                name: 'Name',
                property: 'name'
            }, {
                name: 'Quantity',
                property: 'quantity'
            }, {
                name: 'Price ($)',
                component: {
                    is: markRaw(currencyCell)
                }
            }]
        }
    },
    watch: { },
    computed: {
        ...mapState('account', ['team'])
    },
    async mounted () {
        this.loading = true
        try {
            const billingSubscription = await billingApi.getSubscriptionInfo(this.team.id)
            this.subscription = billingSubscription
            this.loading = false
        } catch (err) {
            // check for 404 and redirect if 404 returned
            this.loading = false
        }
    },
    methods: {
        customerPortal () {
            billingApi.toCustomerPortal(this.team.id)
        },
        async setupBilling () {
            let billingUrl = this.$route.query.billingUrl
            if (!billingUrl) {
                try {
                    billingUrl = await billingApi.getSubscriptionInfo(this.team.id)
                } catch (err) {
                    if (err.response.status === 404) {
                        billingUrl = err.response.data.billingURL
                    }
                }
            }
            window.open(billingUrl, '_self')
        }
    },
    components: {
        Loading,
        FormHeading,
        ItemTable,
        ExternalLinkIcon
    }
}
</script>
