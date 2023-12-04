<template>
    <ff-dialog ref="dialog" data-el="delete-team-dialog" header="Setup Manual Billing" kind="danger" confirm-label="Setup manual billing" @confirm="confirm()">
        <template #default>
            <form v-if="team" class="space-y-6" @submit.prevent>
                <div class="space-y-6">
                    <p>
                        Are you sure you want to setup manual billing for this team?
                    </p>
                    <p>
                        This will bring the trial to an end and allow the team to make
                        full use of the platform without requiring them to configure
                        their billing details.
                    </p>
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
    methods: {
        confirm () {
            this.$emit('setup-manual-billing', this.input.teamType)
        }
    }
}
</script>
