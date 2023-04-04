<template>
    <div
        v-if="projectType && (pricingDetails?.cost > 0 || subscription?.customer?.balance > 0)"
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
        v-if="!trialMode"
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

import FormRow from '../../../components/FormRow.vue'

import formatCurrency from '../../../mixins/Currency.js'

export default {
    name: 'InstanceChargesTable',
    components: {
        FormRow
    },
    mixins: [formatCurrency],
    props: {
        subscription: {
            type: Object,
            default: null
        },
        confirmed: {
            type: Boolean,
            default: false
        },
        projectType: {
            type: Object,
            default: null
        },
        trialMode: {
            type: Boolean,
            default: false
        }
    },
    emits: [
        'update:confirmed'
    ],
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
    }
}
</script>
