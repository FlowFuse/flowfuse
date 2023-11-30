<template>
    <div v-if="features.billing && trialMode" class="space-y-6">
        <FormHeading class="text-red-700">Admin Only Tools</FormHeading>

        <div v-if="trialMode" class="flex flex-col space-y-4 max-w-2xl lg:flex-row lg:items-center lg:space-y-0">
            <div class="flex-grow">
                <div class="max-w-sm pr-2">
                    This team is in trial mode. Setting up manual billing will
                    allow this team to make full use of the platform without
                    requiring them to configure their billing details.
                </div>
            </div>
            <div class="min-w-fit flex-shrink-0">
                <ff-button kind="danger" data-action="admin-setup-billing" @click="confirmManualBilling()">Setup Manual Billing</ff-button>
            </div>
        </div>
    </div>
    <ConfirmTeamManualBillingDialog v-if="trialMode" ref="confirmTeamManualBillingDialog" @setup-manual-billing="setupManualBilling" />
</template>

<script>
import { mapState } from 'vuex'

import billingApi from '../../../api/billing.js'

import FormHeading from '../../../components/FormHeading.vue'

import ConfirmTeamManualBillingDialog from '../dialogs/ConfirmTeamManualBillingDialog.vue'

export default {
    name: 'TeamAdminTools',
    components: {
        FormHeading,
        ConfirmTeamManualBillingDialog
    },
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
        }
    }
}
</script>
