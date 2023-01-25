<template>
    <div
        v-if="pricingDetails?.cost > 0 || subscription?.customer?.balance > 0"
        class="pb-4 mb-4 border-b border-gray-300"
        data-el="charges-table"
    >
        <h1 class="text-lg font-medium mb-2 border-b border-gray-700">
            Charges
        </h1>
        <div
            v-if="subscription?.customer?.balance"
            class="text-sm text-blue-600 italic"
            data-el="credit-balance-banner"
        >
            You have a credit balance of {{ formatCurrency(Math.abs(subscription.customer.balance)) }} that will be applied to this project
        </div>
        <div
            class="grid grid gap-x-1 gap-y-4 text-sm text-sm mt-4 ml-4"
            style="grid-template-columns: 1fr 75px auto"
        >
            <template v-if="pricingDetails?.cost">
                <div data-el="selected-project-type-name">
                    1 x {{ pricingDetails.name }}
                </div>
                <div
                    data-el="selected-project-type-cost"
                    class="text-right"
                >
                    {{ formatCurrency(pricingDetails.cost) }}
                </div>
                <div
                    v-if="pricingDetails?.interval"
                    data-el="selected-project-type-interval"
                    class="text-left"
                >
                    /{{ pricingDetails.interval }}
                </div>
                <div v-else />
            </template>
            <template v-if="subscription?.customer?.balance">
                <div data-el="credit-balance-row">
                    Credit Balance
                </div>
                <div
                    data-el="credit-balance-amount"
                    class="text-right"
                >
                    {{ formatCurrency(subscription?.customer?.balance) }}
                </div>
                <div />
            </template>
        </div>
    </div>
    <FormRow
        id="billing-confirmation"
        v-model="localConfirmed"
        type="checkbox"
    >
        Confirm additional charges
        <template
            v-if="selectedCostAfterCredit >= 0"
            #description
        >
            {{ formatCurrency(selectedCostAfterCredit) }} now
            <span v-if="pricingDetails?.interval">
                then {{ formatCurrency(pricingDetails.cost) }}/{{ pricingDetails.interval }}
            </span>
        </template>
    </FormRow>
</template>

<script>

import billingApi from '@/api/billing.js'
import FormRow from '@/components/FormRow'

import formatCurrency from '@/mixins/Currency.js'

export default {
    name: 'ProjectChargesTable',
    components: {
        FormRow
    },
    mixins: [formatCurrency],
    props: {
        team: {
            type: Object,
            required: true
        },
        confirmed: {
            type: Boolean,
            default: false
        },
        projectType: {
            type: Object,
            default: null
        }
    },
    emits: [
        'update:confirmed'
    ],
    data () {
        return {
            subscription: null
        }
    },
    computed: {
        selectedCostAfterCredit () {
            return (this.pricingDetails?.cost ?? 0) + (this.subscription?.customer?.balance ?? 0)
        },
        localConfirmed: {
            get () {
                return this.confirmed
            },
            set (value) {
                this.$emit('update:confirmed', value)
            }
        },
        pricingDetails () {
            if (!this.projectType) {
                return {}
            }

            return {
                name: this.projectType.name,
                currency: this.projectType.properties?.billingDescription?.split('/')[0].replace(/[\d.]+/, ''),
                cost: (Number(this.projectType.properties?.billingDescription?.split('/')[0].replace(/[^\d.]+/, '')) || 0) * 100,
                interval: this.projectType.properties?.billingDescription?.split('/')[1]
            }
        }
    },
    async created () {
        this.subscription = await billingApi.getSubscriptionInfo(this.team.id)
    }
}
</script>
