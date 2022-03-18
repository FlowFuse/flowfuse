<template>
    <form class="space-y-6">
        <Loading v-if="loading && !subscription" size="small"/>
        <div v-else-if="!loading && subscription">
            <FormHeading v-if="subscription">Next Bill: <span class="font-normal">{{ formatDate(subscription.next_billing_date) }}</span></FormHeading>
            <FormHeading>Active Subscriptions</FormHeading>
            <div v-if="subscription">
                <ItemTable :items="subscription.items" :columns="columns" />
            </div>
            <FormHeading>View/Update Payment Details</FormHeading>
            <div>
                <ff-button size="small" @click="customerPortal()">
                    <template v-slot:icon-right><ExternalLinkIcon /></template>
                    Stripe Customer Portal
                </ff-button>
            </div>
        </div>
        <div v-else>
            Billing has not yet been configured for this team. Before proceeding further, you must continue to Stripe and complete this.
            <div class="mt-3">
                <ff-button size="small" @click="setupBilling()">
                    <template v-slot:icon-right><ExternalLinkIcon /></template>
                    Setup Payment Details
                </ff-button>
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

const totalPriceCell = {
    name: 'TotalPriceCell',
    props: ['price', 'quantity'],
    mixins: [formatCurrency],
    computed: {
        formattedPrice: function () {
            return this.formatCurrency(this.price * this.quantity)
        }
    },
    template: '<div>{{ formattedPrice }}</div>'
}
const unitPriceCell = {
    name: 'UnitPriceCell',
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
                name: 'Unit Price (US$)',
                component: {
                    is: markRaw(unitPriceCell)
                }
            }, {
                name: 'Total Price (US$)',
                component: {
                    is: markRaw(totalPriceCell)
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
            // this.loading = false
        } catch (err) {
            // check for 404 and redirect if 404 returned
            // this.loading = false
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
