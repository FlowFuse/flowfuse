<template>
    <ff-dialog ref="dialog" data-el="delete-team-dialog" :header="'Delete Team: \'' + team?.name + '\''" kind="danger" confirm-label="Delete" :disable-primary="!formValid" @confirm="confirm()">
        <template #default>
            <form v-if="team" class="space-y-6" @submit.prevent>
                <p>
                    Are you sure you want to delete this team? Once deleted, there is no going back.
                </p>
                <p>
                    Name: <span class="font-bold">{{ team?.name }}</span>
                </p>
                <p>
                    Please type in the team name to confirm.
                </p>
                <FormRow id="projectName" v-model="input.teamName" :placeholder="'Team Name'" data-form="team-name" />
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
    emits: ['delete-team'],
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
