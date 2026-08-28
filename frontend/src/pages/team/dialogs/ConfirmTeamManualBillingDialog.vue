<template>
    <ff-dialog ref="dialog" data-el="manual-billing-dialog" :header="$t('ui.setupManualBilling')" kind="danger" :confirm-label="$t('ui.setupManualBilling2')" @confirm="confirm()">
        <template #default>
            <form v-if="team" class="space-y-6" @submit.prevent>
                <div class="space-y-6">
                    <p>
                        {{ $t('ui.areYouSureYouWantToSetupManualBillingForThisTeam') }}
                    </p>
                    <template v-if="trialMode">
                        <p><b>{{ $t('ui.thisTeamIsInTrialMode') }}</b></p>
                        <p>
                            {{ $t('ui.settingUpManualBillingWillAllowThisTeamToMakeFul') }}
                        </p>
                    </template>
                    <template v-else-if="billingSetUp">
                        <p><b>{{ $t('ui.thisTeamAlreadyHasBillingSetup') }}</b></p>
                        <p>
                            {{ $t('ui.settingUpManualBillingWillCancelTheirExistingSub') }}
                        </p>
                    </template>
                    <template v-else>
                        <p><b>{{ $t('ui.thisTeamDoesNotHaveBillingSetup') }}</b></p>
                        <p>
                            {{ $t('ui.enablingManualBillingWillAllowThisTeamToMakeFull') }}
                        </p>
                    </template>
                </div>

                <FormRow id="teamType" v-model="input.teamType" data-form="team-type" :options="teamTypes">{{ $t('ui.selectTheTeamTypeToApply') }}</FormRow>
            </form>
        </template>
    </ff-dialog>
</template>

<script>
import teamTypesApi from '../../../api/teamTypes.js'

import FormRow from '../../../components/FormRow.vue'

export default {
    name: 'ConfirmTeamManualBillingDialog',
    components: {
        FormRow
    },
    emits: ['setup-manual-billing'],
    setup () {
        return {
            show (team) {
                this.team = team
                this.input.teamType = this.team.type.id
                this.$refs.dialog.show()
                teamTypesApi.getTeamTypes().then(response => {
                    this.teamTypes = response.types.reduce((types, type) => {
                        if (type.active) {
                            types.push(type)
                        }
                        return types
                    }, [])
                }).catch(err => { console.warn(err) })
            }
        }
    },
    data () {
        return {
            input: {
                teamType: null
            },
            team: null,
            teamTypes: []
        }
    },
    computed: {
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
        confirm () {
            this.$emit('setup-manual-billing', this.input.teamType)
        }
    }
}
</script>
