<template>
    <template v-if="projectType && (pricingDetails?.cost > 0 || subscription?.customer?.balance > 0)">
        <div
            class="pb-4 mb-4 border-b border-gray-300"
            data-el="charges-table"
        >
            <h1 class="text-lg font-medium mb-2 border-b border-gray-700">
                Charges
            </h1>
            <div
                class="grid grid gap-x-1 gap-y-4 text-sm text-sm mt-4 ml-4"
                style="grid-template-columns: 1fr 200px auto"
            >
                <template v-if="pricingDetails?.cost">
                    <div data-el="selected-instance-type-name">
                        1 x {{ pricingDetails.name }}
                    </div>
                    <div
                        data-el="selected-instance-type-cost"
                        class="text-right"
                    >
                        <template v-if="trialMode">
                            Free during the trial, then
                        </template>
                        {{ formatCurrency(pricingDetails.cost) }}
                    </div>
                    <div
                        v-if="pricingDetails?.interval"
                        data-el="selected-instance-type-interval"
                        class="text-left"
                    >
                        /{{ pricingDetails.interval }}
                    </div>
                    <div v-else />
                </template>
                <template v-if="subscription?.customer?.balance">
                    <div v-if="subscription.customer.balance < 0" data-el="credit-balance-row">
                        Credit Balance
                    </div>
                    <div v-else data-el="credit-balance-row">
                        Debit Balance
                    </div>
                    <div
                        data-el="credit-balance-amount"
                        class="text-right"
                    >
                        {{ formatCurrency(subscription?.customer?.balance) }}
                    </div>
                </template>
            </div>
        </div>
        <div
            v-if="!trialMode && selectedCostAfterCredit >= 0"
            class="text-right ff-description mb-2 space-y-1"
            data-el="payable-now-summary"
        >
            <span v-if="prorationMode === 'create_prorations'">
                This will be added to your next invoice
            </span>
            <span v-else>
                You will be charged {{ formatCurrency(selectedCostAfterCredit) }} now
                <span v-if="pricingDetails?.interval">
                    then {{ formatCurrency(pricingDetails.cost) }} /{{ pricingDetails.interval }}
                </span>
            </span>
        </div>
    </template>
</template>

<script>

import formatCurrency from '../../../mixins/Currency.js'

export default {
    name: 'InstanceChargesTable',
    mixins: [formatCurrency],
    props: {
        subscription: {
            type: Object,
            default: null
        },
        projectType: {
            type: Object,
            default: null
        },
        trialMode: {
            type: Boolean,
            default: false
        },
        prorationMode: {
            type: String,
            default: 'always_invoice'
        }
    },
    computed: {
        selectedCostAfterCredit () {
            return (this.pricingDetails?.cost ?? 0) + (this.subscription?.customer?.balance ?? 0)
        },
        pricingDetails () {
            if (!this.projectType) {
                return {}
            }
            return {
                name: this.projectType.name,
                currency: this.projectType.currency,
                cost: this.projectType.cost,
                interval: this.projectType.priceInterval
            }
        }
    }
}
</script>
