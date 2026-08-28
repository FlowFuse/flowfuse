<template>
    <div
        v-if="subscription?.customer?.balance < 0"
        class="w-full text-sm text-blue-600 italic"
        data-el="credit-balance-banner"
    >
        <!-- Stripe gives credit as a -ve number -->{{ $t('ui.youHaveACreditBalanceOfP0ThatWillBeAppliedToThis', { p0: formatCurrency(-1 * subscription.customer.balance) }) }}
    </div>
    <div
        v-else-if="subscription?.customer?.balance > 0"
        class="w-full text-sm text-blue-600 italic"
        data-el="credit-balance-banner"
    >
        <!-- Stripe gives credit as a -ve number -->{{ $t('ui.youOweP0ThatWillBeAppliedToThisInstance', { p0: formatCurrency(subscription.customer.balance) }) }}
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
