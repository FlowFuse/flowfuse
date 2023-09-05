<template>
    <ff-dialog ref="dialog" data-el="delete-team-dialog" header="Delete Team" kind="danger" confirm-label="Delete" :disable-primary="!formValid" @confirm="confirm()">
        <template #default>
            <form v-if="team" class="space-y-6" @submit.prevent>
                <div class="space-y-6">
                    <p>
                        Are you sure you want to delete this team? Once deleted, there is no going back.
                    </p>
                    <p>
                        Enter the team name <code class="block">{{ team.name }}</code> to continue.
                    </p>
                </div>
                <FormRow id="projectName" v-model="input.teamName" data-form="team-name">Name</FormRow>
            </form>
        </template>
    </ff-dialog>
</template>

<script>

import FormRow from '../../../components/FormRow.vue'
import alerts from '../../../services/alerts.js'

export default {
    name: 'ConfirmTeamDeleteDialog',
    components: {
        FormRow
    },
    data () {
        return {
            input: {
                teamName: ''
            },
            formValid: false,
            team: null
        }
    },
    watch: {
        'input.teamName': function () {
            this.formValid = this.team?.name === this.input.teamName
        }
    },
    methods: {
        confirm () {
            this.$emit('delete-team')
            alerts.emit('Team successfully deleted', 'confirmation')
        }
    },
    setup () {
        return {
            show (team) {
                this.team = team
                this.$refs.dialog.show()
            }
        }
    }
}
</script>
