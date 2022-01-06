<template>
    <form class="space-y-4">
        <FormHeading>Users</FormHeading>
        <FormRow v-model="input['user:signup']" type="checkbox"  :error="errors.requiresEmail" :disabled="errors.requiresEmail">
            Allow new users to register on the login screen
            <template #description>
                If self-registration is not enabled, an Administrator must create users
                and provide their login details manually
            </template>
        </FormRow>
        <FormRow v-model="input['user:team:auto-create']" type="checkbox" :disabled="!input['user:signup']">
            Create a personal team for users when they register
            <template #description>
                If a team is not automatically created, they will either have to manually create one, or be invited
                to join an existing team.
            </template>
        </FormRow>
        <FormHeading>Teams</FormHeading>
        <FormRow v-model="input['team:create']" type="checkbox">
            Allow users to create teams
            <template #description>
                <p>If a user creates a team, they become its Owner. Otherwise they
                must be invited to an existing team by an Administrator or Team Owner.</p>
                <p>Administrators can always create teams.</p>
            </template>
        </FormRow>
        <FormRow v-model="input['team:user:invite:external']" type="checkbox" :disabled="errors.requiresEmail" :error="errors.requiresEmail">
            Allow users to invite external users to teams
            <template #description>
                <p>Users can invite existing users to join a team. If they provide
                an email address of an unregistered user, the invitiation will be
                sent to that email address.</p>
            </template>
        </FormRow>

        <div>
            <button type="button" :disabled="!saveEnabled" class="forge-button forge-button-small" @click="saveChanges">Save settings</button>
        </div>

    </form>
</template>

<script>
import settingsApi from '@/api/settings'

import FormRow from '@/components/FormRow'
import FormHeading from '@/components/FormHeading'
import { mapState } from 'vuex'

const validSettings = [
    'user:signup',
    'user:team:auto-create',
    'team:create',
    'team:user:invite:external'
]

export default {
    name: 'AdminSettingsGeneral',
    data() {
        return {
            input: {
            },
            errors: {
                requiresEmail: null
            },
        }
    },
    computed: {
        ...mapState('account',['settings']),
        saveEnabled: function() {
            let result = false;
            validSettings.forEach(s => {
                result = result || (this.input[s] != this.settings[s])
            })
            return result;
        }
    },
    created() {
        if (!this.settings.email) {
            this.errors.requiresEmail = "This option requires email to be configured"
        }
        validSettings.forEach(s => {
            this.input[s] = this.settings[s]
        })
    },
    methods: {
        async saveChanges() {
            const options = {};
            validSettings.forEach(s => {
                if (this.input[s] != this.settings[s]) {
                    options[s] = this.input[s]
                }
            })
            try {
                await settingsApi.updateSettings(options)
                this.$store.dispatch('account/refreshSettings');
            } catch(err) {
                console.warn(err);

            }

        }
    },
    components: {
        FormRow,
        FormHeading
    },
}
</script>
