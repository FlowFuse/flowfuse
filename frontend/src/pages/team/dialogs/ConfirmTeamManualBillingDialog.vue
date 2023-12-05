<template>
    <ff-dialog ref="dialog" data-el="delete-team-dialog" header="Setup Manual Billing" kind="danger" confirm-label="Setup manual billing" @confirm="confirm()">
        <template #default>
            <form v-if="team" class="space-y-6" @submit.prevent>
                <div class="space-y-6">
                    <p>
                        Are you sure you want to setup manual billing for this team?
                    </p>
                    <template v-if="trialMode">
                        <p><b>This team is in trial mode.</b></p>
                        <p>
                            Setting up manual billing will allow this team to make
                            full use of the platform without requiring them to
                            configure their billing details.
                        </p>
                    </template>
                    <template v-else-if="billingSetUp">
                        <p><b>This team already has billing setup.</b></p>
                        <p>
                            Setting up manual billing will cancel their existing
                            subscription and allow this team to make full use of the
                            platform without requiring them to configure their billing
                            details.
                        </p>
                    </template>
                    <template v-else>
                        <p><b>This team does not have billing setup.</b></p>
                        <p>
                            Enabling manual billing will allow this team to make full
                            use of the platform without requiring them to configure
                            their billing details.
                        </p>
                    </template>
                </div>

                <FormRow id="teamType" v-model="input.teamType" data-form="team-type" :options="teamTypes">Select the team type to apply:</FormRow>
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
