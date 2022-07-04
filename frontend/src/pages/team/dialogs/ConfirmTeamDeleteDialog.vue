<template>
    <ff-dialog :open="isOpen" header="Delete Team" @close="close">
        <template v-slot:default>
            <form class="space-y-6" v-if="team">
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
        <template v-slot:actions>
            <ff-button kind="secondary" @click="close()">Cancel</ff-button>
            <ff-button kind="danger" :disabled="!formValid" class="ml-4" @click="confirm()">Delete</ff-button>
        </template>
    </ff-dialog>
</template>

<script>
import { ref } from 'vue'

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
            this.isOpen = false
        }
    },
    setup () {
        const isOpen = ref(false)
        return {
            isOpen,
            close () {
                isOpen.value = false
            },
            show (team) {
                this.team = team
                isOpen.value = true
            }
        }
    }
}
</script>
