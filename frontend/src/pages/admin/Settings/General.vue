<template>
    <ff-loading v-if="loading" message="Saving Settings..."/>
    <div v-else class="space-y-4">
        <FormHeading>Users</FormHeading>
        <FormRow v-model="input['user:signup']" type="checkbox"  :error="errors.requiresEmail" :disabled="errors.requiresEmail">
            Allow new users to register on the login screen
            <template #description>
                If self-registration is not enabled, an Administrator must create users
                and provide their login details manually
            </template>
        </FormRow>
        <FormRow v-model="input['user:team:auto-create']" type="checkbox">
            Create a personal team for users when they register
            <template #description>
                If a team is not automatically created, they will either have to manually create one, or be invited
                to join an existing team.
            </template>
        </FormRow>
        <FormRow v-model="input['user:reset-password']" type="checkbox" :error="errors.requiresEmail" :disabled="errors.requiresEmail">
            Allow users to reset their password on the login screen
            <template #description>
                Users will be sent an email with a link back to the platform to reset their password.
            </template>
        </FormRow>
        <FormRow v-model="input['user:tcs-required']" type="checkbox" data-el="terms-and-condition-required">
            Require user agreement to Terms &amp; Conditions
            <template #description>
                When signing up, users will be presented with a link to the terms and conditions, and will be required to accept them in order to register.
            </template>
        </FormRow>
        <FormRow v-if="input['user:tcs-required']" containerClass="max-w-sm ml-9" v-model="input['user:tcs-url']" type="text" :error="errors.termsAndConditions" data-el="terms-and-condition-url">
            Terms &amp; Conditions URL
            <template #description>
                <p>Changing this URL will require all users to reaccept the terms the next time they access the platform</p>
            </template>
        </FormRow>
        <FormRow v-if="input['user:tcs-required']" containerClass="max-w-sm ml-9">
            <template #description>
                <p>Last updated: {{tcsDate}}.</p>
                <div class="flex items-center space-x-2"><p>Require users to reaccept the terms now: </p><ff-button size="small" :disabled="loading" kind="tertiary" @click="updateTermsAndConditions" data-action="terms-and-condition-update">update now</ff-button></div>
            </template>
            <template #input>&nbsp;</template>
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
                    an email address of an unregistered user, the invitation will be
                    sent to that email address.</p>
            </template>
        </FormRow>
        <FormHeading>Platform</FormHeading>
        <FormRow v-model="input['telemetry:enabled']" type="checkbox">
            Enable collection of anonymous statistics
            <template #description>
                <p>
                    We collect anonymous statistics about how FlowForge is used.
                    This allows us to improve how it works and make a better product.
                </p>
                <p>
                    For more information about the data we collect and how it is used,
                    please see our <a class="forge-link" href="https://github.com/flowforge/flowforge/tree/main/docs/admin/telemetry.md" target="_blank">Usage Data Collection Policy</a>
                </p>
            </template>
        </FormRow>
        <div>
            <ff-button :disabled="!saveEnabled" @click="saveChanges" data-action="save-settings">Save settings</ff-button>
        </div>

    </div>
</template>

<script>
import settingsApi from '@/api/settings'
import Dialog from '@/services/dialog'
import Alerts from '@/services/alerts'
import FormRow from '@/components/FormRow'
import FormHeading from '@/components/FormHeading'
import { mapState } from 'vuex'

const validSettings = [
    'user:signup',
    'user:reset-password',
    'user:team:auto-create',
    'user:tcs-required',
    'user:tcs-url',
    'user:tcs-date',
    'team:create',
    'team:user:invite:external',
    'telemetry:enabled'
]

export default {
    name: 'AdminSettingsGeneral',
    data () {
        return {
            loading: false,
            input: {
            },
            errors: {
                requiresEmail: null,
                termsAndConditions: null
            }
        }
    },
    computed: {
        ...mapState('account', ['settings']),
        tcsDate () {
            const _tcsDate = this.input['user:tcs-date']
            if (_tcsDate && (typeof _tcsDate === 'string' || (_tcsDate instanceof Date && !isNaN(_tcsDate) && _tcsDate > 0))) {
                return new Date(_tcsDate).toUTCString()
            }
            return '<Not Set>'
        },
        saveEnabled () {
            let result = false
            // check values are valid
            if (this.validate()) {
                // has anything changed
                validSettings.forEach(s => {
                    if (s === 'user:tsc-date') {
                        return // dont check tsc-date for change (no need to save if changed)
                    }
                    if (s !== 'user:tsc-url' || this.input['user:tcs-required']) {
                        // Check to see if the property has changed.
                        // In the case of tsc-url, we only do that if tcs-required is true
                        result = result || (this.input[s] !== this.settings[s])
                    }
                })
            }
            return result
        }
    },
    created () {
        if (!this.settings.email) {
            this.errors.requiresEmail = 'This option requires email to be configured'
        }
        validSettings.forEach(s => {
            this.input[s] = this.settings[s]
        })
    },
    methods: {
        validate () {
            if (this.input['user:tcs-required']) {
                const url = this.input['user:tcs-url'] || ''
                if (url.trim() === '') {
                    this.errors.termsAndConditions = 'A URL for the Terms & Conditions must be set.'
                    return false
                }
            }
            this.errors.termsAndConditions = ''
            return true
        },
        async saveChanges () {
            this.loading = true
            const options = {}
            // Only save options that have changed
            validSettings.forEach(s => {
                if (this.input[s] !== this.settings[s]) {
                    options[s] = this.input[s]
                }
            })
            // don't save the T&C's date
            delete options['user:tcs-date']
            // don't save the T&C's URL if no requirement for T&Cs
            if (!this.input['user:tcs-required']) {
                if (this.settings['user:tcs-url']) {
                    options['user:tcs-url'] = ''
                } else {
                    delete options['user:tcs-url']
                }
            }
            // if tcs-url present in options then it has changed - set tcs-updated as well
            if (this.input['user:tcs-required'] && options['user:tcs-url']) {
                options['user:tcs-updated'] = true
            }
            settingsApi.updateSettings(options)
                .then(() => {
                    this.$store.dispatch('account/refreshSettings')
                    this.input['user:tcs-date'] = this.settings['user:tcs-date']
                })
                .catch((err) => {
                    console.warn(err)
                })
                .finally(() => {
                    this.loading = false
                })
        },
        async updateTermsAndConditions () {
            // don't save the T&C's if not required
            if (!this.input['user:tcs-required']) {
                return
            }
            Dialog.show({
                header: 'Update Terms and Conditions',
                kind: 'danger',
                html: '<p>This action will require all existing users to reaccept the Terms and Conditions the next time they access the platform.</p><p>Are you sure?</p>',
                confirmLabel: 'Continue'
            }, async () => {
                this.loading = true
                const options = {}
                options['user:tcs-updated'] = true
                try {
                    await settingsApi.updateSettings(options)
                    this.$store.dispatch('account/refreshSettings')
                    Alerts.emit('Terms and Conditions update success', 'info', 5000)
                } catch (error) {
                    console.warn(error)
                } finally {
                    this.loading = false
                }
            })
        }
    },
    components: {
        FormRow,
        FormHeading
    }
}
</script>
