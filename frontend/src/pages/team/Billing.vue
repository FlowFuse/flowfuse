<template>
    <SectionTopMenu hero="Team Billing"/>
    <form>
        <Loading v-if="loading && !subscription" size="small"/>
        <div v-else-if="!loading && subscription">
            <FormHeading v-if="subscription" class="mb-6">Next Bill: <span class="font-normal">{{ formatDate(subscription.next_billing_date) }}</span></FormHeading>
            <FormHeading>Active Subscriptions</FormHeading>
            <div v-if="subscription">
                <ff-data-table :columns="columns" :rows="subscription.items"/>
                <ItemTable :items="subscription.items" :columns="columns" />
            </div>
            <FormHeading class="mt-6">View/Update Payment Details</FormHeading>
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

import billingApi from '@/api/billing.js'
import Loading from '@/components/Loading'
import FormHeading from '@/components/FormHeading'
import ItemTable from '@/components/tables/ItemTable'

import formatDateMixin from '@/mixins/DateTime.js'
import formatCurrency from '@/mixins/Currency.js'

import { ExternalLinkIcon } from '@heroicons/vue/outline'

import SectionTopMenu from '@/components/SectionTopMenu'

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
    name: 'TeamBilling',
    props: ['billingUrl', 'team', 'teamMembership'],
    mixins: [formatDateMixin, formatCurrency],
    data () {
        return {
            loading: false,
            subscription: null,
            columns: [{
                name: 'label',
                key: 'name'
            }, {
                label: 'Quantity',
                key: 'quantity'
            }, {
                label: 'Unit Price (US$)',
                component: {
                    is: markRaw(unitPriceCell)
                }
            }, {
                label: 'Total Price (US$)',
                component: {
                    is: markRaw(totalPriceCell)
                }
            }]
        }
    },
    watch: { },
    async mounted () {
        this.loading = true
        try {
            const billingSubscription = await billingApi.getSubscriptionInfo(this.team.id)
            billingSubscription.next_billing_date = billingSubscription.next_billing_date * 1000 // API returns Seconds, JS expects miliseconds
            this.subscription = billingSubscription
            this.loading = false
        } catch (err) {
            // check for 404 and redirect if 404 returned
            if (err.response.status === 404) {
                this.loading = false
            }
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
        ExternalLinkIcon,
        SectionTopMenu
    }
}
</script>
