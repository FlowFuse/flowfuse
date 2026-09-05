<template>
    <ff-dialog ref="dialog" data-el="suspend-team-dialog" :header="'Suspend Team: \'' + team?.name + '\''" kind="danger" :confirm-label="$t('ui.suspend')" :disable-primary="!formValid" @confirm="confirm()">
        <template #default>
            <form v-if="team" class="space-y-6" @submit.prevent>
                <p>
                    {{ $t('ui.areYouSureYouWantToSuspendThisTeamThisWillStopAl') }}
                </p>
                <p>
                    {{ $t('ui.name2') }} <span class="font-bold">{{ team?.name }}</span>
                </p>
                <p>
                    {{ $t('ui.pleaseTypeInTheTeamNameToConfirm') }}
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
