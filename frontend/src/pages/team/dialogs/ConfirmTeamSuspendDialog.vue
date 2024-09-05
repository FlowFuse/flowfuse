<template>
    <ff-dialog ref="dialog" data-el="delete-team-dialog" :header="'Suspend Team: \'' + team?.name + '\''" kind="danger" confirm-label="Suspend" :disable-primary="!formValid" @confirm="confirm()">
        <template #default>
            <form v-if="team" class="space-y-6" @submit.prevent>
                <p>
                    Are you sure you want to suspend this team? This will stop all instances and prevent any further activity in the team.
                    You will still be able to unsuspended the team at any time.
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

export default {
    name: 'ConfirmTeamSuspendDialog',
    components: {
        FormRow
    },
    emits: ['suspend-team'],
    setup () {
        return {
            show (team) {
                this.team = team
                this.$refs.dialog.show()
            }
        }
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
            this.$emit('suspend-team')
        }
    }
}
</script>
