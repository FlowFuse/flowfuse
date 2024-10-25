<template>
    <div v-if="features.billing" class="space-y-6">
        <FormHeading class="text-red-700">Admin Only Tools</FormHeading>
        <table class="table-fixed">
            <tr>
                <th class="font-medium font-bold pb-2" colspan="2">Stripe Details</th>
            </tr>
            <tr>
                <td class="font-medium pr-4">Customer ID:</td>
                <td><div class="py-2"><a v-if="stripeCustomerUrl" :href="stripeCustomerUrl" class="underline" target="_blank">{{ team.billing.customer }}</a><span v-else>none</span></div></td>
            </tr>
            <tr>
                <td class="font-medium pr-4">Subscription ID:</td>
                <td><div class="py-2"><a v-if="stripeSubscriptionUrl" :href="stripeSubscriptionUrl" class="underline" target="_blank">{{ team.billing.subscription }}</a><span v-else>none</span></div></td>
            </tr>
        </table>
        <div v-if="!isUnmanaged && trialMode" class="flex flex-col space-y-4 max-w-2xl lg:flex-row lg:items-center lg:space-y-0">
            <div class="flex-grow">
                <table class="table-fixed max-w-sm">
                    <tr v-if="!trialHasEnded">
                        <td class="font-medium font-bold pr-4">Trial Ends:</td>
                        <td><div class="py-2">{{ trialEndDate }}</div></td>
                    </tr>
                    <tr v-else>
                        <td class="font-medium font-bold pr-4">Trial Ended</td>
                    </tr>
                </table>
            </div>
            <div class="min-w-fit flex-shrink-0">
                <ff-button kind="danger" @click="confirmExtendTrial()">Extend Trial</ff-button>
            </div>
        </div>
        <div class="flex flex-col space-y-4 max-w-2xl lg:flex-row lg:items-center lg:space-y-0">
            <div class="flex-grow">
                <div class="max-w-sm pr-2">
                    <template v-if="team.suspended">
                        <b>This team is suspended.</b><br>
                        It must be reactivated before it can be put into manual billing mode.
                    </template>
                    <template v-else-if="isUnmanaged">
                        This team is already in manual billing mode.
                    </template>
                    <template v-else-if="trialMode">
                        <b>This team is in trial mode.</b><br>
                        Setting up manual billing will allow this team to make
                        full use of the platform without requiring them to
                        configure their billing details.
                    </template>
                    <template v-else-if="billingSetUp">
                        <b>This team already has billing setup.</b><br>
                        Setting up manual billing will cancel their existing
                        subscription and allow this team to make full use of the
                        platform without requiring them to configure their billing
                        details.
                    </template>
                    <template v-else>
                        <b>This team does not have billing setup.</b><br>
                        Enabling manual billing will allow this team to make full
                        use of the platform without requiring them to configure
                        their billing details.
                    </template>
                </div>
            </div>
            <div class="min-w-fit flex-shrink-0">
                <ff-button kind="danger" data-action="admin-setup-billing" :disabled="team.suspended || isUnmanaged" @click="confirmManualBilling()">Setup Manual Billing</ff-button>
            </div>
        </div>
    </div>
    <ConfirmTeamManualBillingDialog ref="confirmTeamManualBillingDialog" @setup-manual-billing="setupManualBilling" />
    <ExtendTeamTrialDialog ref="extendTeamTrialDialog" @extend-team-trial="extendTrial" />
</template>

<script>
import { mapState } from 'vuex'

import billingApi from '../../../api/billing.js'

import FormHeading from '../../../components/FormHeading.vue'

import formatDateMixin from '../../../mixins/DateTime.js'

import ConfirmTeamManualBillingDialog from '../dialogs/ConfirmTeamManualBillingDialog.vue'
import ExtendTeamTrialDialog from '../dialogs/ExtendTeamTrialDialog.vue'

export default {
    name: 'TeamAdminTools',
    components: {
        FormHeading,
        ConfirmTeamManualBillingDialog,
        ExtendTeamTrialDialog
    },
    mixins: [formatDateMixin],
    props: {
        team: {
            type: Object,
            required: true
        }
    },
    data () {
        return {
        }
    },
    computed: {
        ...mapState('account', ['features']),
        billingSetUp () {
            return this.team.billing?.active
        },
        subscriptionExpired () {
            return this.team.billing?.canceled
        },
        isUnmanaged () {
            return this.team.billing?.unmanaged
        },
        trialMode () {
            return this.team.billing?.trial
        },
        trialHasEnded () {
            return this.team.billing?.trialEnded
        },
        trialEndDate () {
            return this.formatDateTime(this.team.billing?.trialEndsAt)
        },
        stripeCustomerUrl () {
            if (this.team.billing?.customer) {
                return `https://dashboard.stripe.com/customers/${this.team.billing.customer}`
            }
            return null
        },
        stripeSubscriptionUrl () {
            if (this.team.billing?.subscription) {
                return `https://dashboard.stripe.com/subscriptions/${this.team.billing.subscription}`
            }
            return null
        }
    },
    methods: {
        confirmManualBilling () {
            this.$refs.confirmTeamManualBillingDialog.show(this.team)
        },
        async setupManualBilling (teamTypeId) {
            billingApi.setupManualBilling(this.team.id, teamTypeId).then(async () => {
                await this.$store.dispatch('account/refreshTeams')
                await this.$store.dispatch('account/refreshTeam')
            }).catch(err => {
                console.warn(err)
            })
        },
        confirmExtendTrial () {
            this.$refs.extendTeamTrialDialog.show(this.team)
        },
        async extendTrial (endDate) {
            const newEndDate = Date.parse(`${endDate}T12:00:00.000Z`)
            billingApi.setTrialExpiry(this.team.id, newEndDate).then(async () => {
                await this.$store.dispatch('account/refreshTeams')
                await this.$store.dispatch('account/refreshTeam')
            }).catch(err => {
                console.warn(err)
            })
        }
    }
}
</script>
