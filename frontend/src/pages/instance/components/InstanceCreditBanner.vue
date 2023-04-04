<template>
    <div
        v-if="subscription?.customer?.balance"
        class="w-full text-sm text-blue-600 italic"
        data-el="credit-balance-banner"
    >
        You have a credit balance of {{ formatCurrency(Math.abs(subscription.customer.balance)) }} that will be applied to this instance
    </div>
</template>

<script>

import formatCurrency from '../../../mixins/Currency.js'

export default {
    name: 'InstanceCreditBanner',
    mixins: [formatCurrency],
    props: {
        subscription: {
            type: Object,
            default: null
        }
    }
}
</script>
