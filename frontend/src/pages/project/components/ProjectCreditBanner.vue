<template>
    <div
        v-if="subscription?.customer?.balance"
        class="text-sm text-blue-600 italic"
        data-el="credit-balance-banner"
    >
        You have a credit balance of {{ formatCurrency(Math.abs(subscription.customer.balance)) }} that will be applied to this project
    </div>
</template>

<script>

import formatCurrency from '@/mixins/Currency.js'

export default {
    name: 'ProjectCreditBanner',
    mixins: [formatCurrency],
    props: {
        subscription: {
            type: Object,
            default: null
        }
    }
}
</script>
