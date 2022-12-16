<template>
    <SectionTopMenu hero="Team Billing"/>
    <form>
        <Loading v-if="loading" size="small" />
        <div v-else-if="billingSetUp">
            <FormHeading class="mb-6">Next Payment:</FormHeading>
            <div v-if="subscription">
                <ff-data-table :columns="columns" :rows="subscription.items" />
            </div>
            <div v-else class="ff-no-data ff-no-data-large">
                Something went wrong loading your subscription information, please try again.
            </div>
        </div>
        <div v-else class="ff-no-data ff-no-data-large">
            Billing has not yet been configured for this team. Before proceeding further, you must continue to Stripe and complete this.
            <div v-if="coupon">
                <div class="my-3 text-sm">Will apply coupon code <strong>{{ coupon }}</strong> at checkout</div>
            </div>
            <div v-if="errors.coupon">
                <div class="ml-9 text-red-400 inline text-xs">{{ errors.coupon }}</div>
            </div>
            <div class="mt-3">
                <ff-button data-action="setup-payment-details" class="mx-auto mt-3" @click="setupBilling()">
                    <template #icon-right><ExternalLinkIcon /></template>
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
    computed: {
        billingSetUp () {
            return this.team.billingSetup
        }
    },
    watch: { },
    async mounted () {
        if (!this.billingSetUp) {
            this.coupon = this.getCookie('ff_coupon')?.split('.')[0]
            return
        }

        this.loading = true
        const billingSubscription = await billingApi.getSubscriptionInfo(this.team.id)
        billingSubscription.next_billing_date = billingSubscription.next_billing_date * 1000 // API returns Seconds, JS expects miliseconds
        this.subscription = billingSubscription
        this.subscription.items.map((item) => {
            item.total_price = item.price * item.quantity
            return item
        })
        this.loading = false
    },
    methods: {
        customerPortal () {
            billingApi.toCustomerPortal(this.team.id)
        },
        async setupBilling () {
            let billingUrl = this.$route.query.billingUrl
            if (!billingUrl) {
                try {
                    const response = await billingApi.createSubscription(this.team.id)
                    billingUrl = response.billingURL
                } catch (err) {
                    if (err.response.code === 'invalid_coupon') {
                        Alerts.emit(`${this.coupon} coupon invalid`, 'warning', 7500)
                        this.errors.coupon = `${this.coupon} is not a valid code. You will be able to provide an alternative code on the Stripe checkout page.`
                        this.coupon = false
                    } else {
                        throw err
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
