<template>
    <div
        v-if="subscription?.customer?.balance < 0"
        class="w-full text-sm text-blue-600 italic"
        data-el="credit-balance-banner"
    >
        <!-- Stripe gives credit as a -ve number -->
        You have a credit balance of {{ formatCurrency(-1 * subscription.customer.balance) }} that will be applied to this instance
    </div>
    <div
        v-else-if="subscription?.customer?.balance > 0"
        class="w-full text-sm text-blue-600 italic"
        data-el="credit-balance-banner"
    >
        <!-- Stripe gives credit as a -ve number -->
        You owe {{ formatCurrency(subscription.customer.balance) }} that will be applied to this instance
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
