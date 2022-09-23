<template>
    <SectionTopMenu hero="Team Billing"/>
    <form>
        <Loading v-if="loading && !subscription" size="small"/>
        <div v-else-if="!loading && subscription">
            <FormHeading v-if="subscription" class="mb-6">Next Bill: <span class="font-normal">{{ formatDate(subscription.next_billing_date) }}</span></FormHeading>
            <FormHeading>Active Subscriptions</FormHeading>
            <div v-if="subscription">
                <ff-data-table :columns="columns" :rows="subscription.items"/>
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
            <div v-if="coupon">
                <div class="mb-8 text-sm text-gray-500 space-y-2">Will apply coupon code <span v-text="coupon"></span> at checkout</div>
            </div>
            <div v-if="errors.coupon">
                <div class="ml-9 text-red-400 inline text-xs">{{errors.coupon}}</div>
            </div>
            <div class="mt-3">
                <ff-button @click="setupBilling()" data-action="setup-payment-details">
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

import formatDateMixin from '@/mixins/DateTime.js'
import formatCurrency from '@/mixins/Currency.js'

import { ExternalLinkIcon } from '@heroicons/vue/outline'

import SectionTopMenu from '@/components/SectionTopMenu'

import Alerts from '@/services/alerts'

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
    props: ['billingUrl', 'team', 'teamMembership'],
    mixins: [formatDateMixin, formatCurrency],
    data () {
        return {
            loading: false,
            subscription: null,
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
            coupon: false,
            errors: {}
        }
    },
    watch: { },
    async mounted () {
        this.loading = true
        if (!this.team.billingSetup) {
            this.coupon = this.getCookie('ff_coupon')?.split('.')[0]
            this.loading = false
        } else {
            try {
                const billingSubscription = await billingApi.getSubscriptionInfo(this.team.id)
                billingSubscription.next_billing_date = billingSubscription.next_billing_date * 1000 // API returns Seconds, JS expects miliseconds
                this.subscription = billingSubscription
                this.subscription.items.map((item) => {
                    item.total_price = item.price * item.quantity
                    return item
                })
                this.loading = false
            } catch (err) {
                // check for 402 and redirect if 402 returned
                if (err.response.status === 402) {
                    this.coupon = this.getCookie('ff_coupon')?.split('.')[0]
                    this.loading = false
                }
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
                    if (err.response.status === 402) {
                        if (err.response.data.billingURL) {
                            billingUrl = err.response.data.billingURL
                        } else if (err.response.data.error) {
                            Alerts.emit(`${this.coupon} coupon invalid`, 'warning', 7500)
                            this.errors.coupon = `${this.coupon} is not a valid code. You will be able to provide an alternative code on the Stripe checkout page.`
                            this.coupon = false
                            return
                        }
                    }
                }
            }
            window.open(billingUrl, '_self')
        },
        getCookie (name) {
            if (document.cookie) {
                const cookies = document.cookie.split(';')
                for (let i = 0; i < cookies.length; i++) {
                    const cookie = cookies[i]
                    if (cookie.split('=')[0].trim() === name) {
                        return cookie.split('=')[1]
                    }
                }
            }
            return undefined
        }
    },
    components: {
        Loading,
        FormHeading,
        ExternalLinkIcon,
        SectionTopMenu
    }
}
</script>
