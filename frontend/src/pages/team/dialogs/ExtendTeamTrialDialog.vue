<template>
    <ff-dialog ref="dialog" data-el="extend-trial-dialog" header="Extend Team Trial" kind="danger" confirm-label="Extend team trial" @confirm="confirm()">
        <template #default>
            <form v-if="team" class="space-y-6" @submit.prevent>
                <p v-if="!trialHasEnded">This team's trial ends at <b>{{ trialEndDate }}</b>.</p>
                <p v-else>This team's trial has ended.</p>
                <p>
                    Select a new end date for the team's trial:
                </p>
                <FormRow id="endDate" v-model="input.endDate" type="date" data-form="expiry-date" />
            </form>
        </template>
    </ff-dialog>
</template>

<script>
import FormRow from '../../../components/FormRow.vue'
import formatDateMixin from '../../../mixins/DateTime.js'

export default {
    name: 'ExtendTeamTrialDialog',
    components: {
        FormRow
    },
    mixins: [formatDateMixin],
    emits: ['extend-team-trial'],
    setup () {
        return {
            show (team) {
                this.team = team
                if (this.team.billing.trialEndsAt) {
                    this.originalEndDate = this.team.billing.trialEndsAt.substring(0, 10)
                } else {
                    this.originalEndDate = (new Date()).toISOString().split('T')[0]
                }
                this.input.endDate = this.originalEndDate
                this.$refs.dialog.show()
            }
        }
    },
    data () {
        return {
            input: {
                endDate: null
            },
            team: null
        }
    },
    computed: {
        billingSetUp () {
            return this.team.billing?.active
        },
        trialMode () {
            return this.team.billing?.trial
        },
        trialHasEnded () {
            return this.team.billing?.trialEnded
        },
        trialEndDate () {
            return this.formatDateTime(this.team.billing?.trialEndsAt)
        }
    },
    methods: {
        confirm () {
            this.$emit('extend-team-trial', this.input.endDate)
        }
    }
}
</script>
