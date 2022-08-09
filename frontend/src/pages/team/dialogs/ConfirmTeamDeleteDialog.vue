<template>
    <ff-dialog ref="dialog" header="Delete Team" kind="danger" confirm-label="Delete" @confirm="confirm()" :disable-primary="!formValid">
        <template v-slot:default>
            <form class="space-y-6" v-if="team" @submit.prevent>
                <div class="space-y-6">
                    <p>
                        Are you sure you want to delete this team? Once deleted, there is no going back.
                    </p>
                    <p>
                        Enter the team name <code class="block">{{team.name}}</code> to continue.
                    </p>
                </div>
                <FormRow v-model="input.teamName" id="projectName">Name</FormRow>
            </form>
        </template>
    </ff-dialog>
</template>

<script>

import alerts from '@/services/alerts.js'

import FormRow from '@/components/FormRow'

export default {
    name: 'ConfirmProjectDeleteDialog',
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
            this.$emit('deleteTeam')
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
