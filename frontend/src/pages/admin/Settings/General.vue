<template>
    <ff-loading v-if="loading" message="Saving Settings..." />
    <div v-else class="space-y-4">
        <FormHeading>Users</FormHeading>
        <FormRow v-model="input['user:signup']" data-el="enable-signup" type="checkbox" :error="errors.requiresEmail" :disabled="!!errors.requiresEmail">
            Allow new users to register on the login screen
            <template #description>
                If self-registration is not enabled, an Administrator must create users
                and provide their login details manually
            </template>
        </FormRow>
        <template v-if="input['user:signup']">
            <FormRow v-model="input['branding:account:signUpTopBanner']" data-el="banner" containerClass="max-w-sm ml-9">
                HTML content to show above the sign-up form
            </FormRow>
            <FormRow v-model="input['branding:account:signUpLeftBanner']" containerClass="max-w-sm ml-9">
                HTML content to show to the left of the sign-up form
                <template #input><textarea v-model="input['branding:account:signUpLeftBanner']" data-el="splash" class="w-full" rows="6" /></template>
            </FormRow>
        </template>
        <FormRow v-model="input['user:team:auto-create']" type="checkbox">
            Create a personal team for users when they register
            <template #description>
                If a team is not automatically created, they will either have to manually create one, or be invited
                to join an existing team.
            </template>
        </FormRow>
        <FormRow v-if="input['user:team:auto-create']" v-model="input['user:team:auto-create:teamType']" :options="teamTypesOptions" containerClass="max-w-sm ml-9">
            Personal Team Type
            <template #description>
                The type of team to create for a user when they register.
                <template v-if="features.billing">Trial mode is configured within the individual TeamTypes.</template>
            </template>
        </FormRow>
        <FormRow v-if="input['user:team:auto-create']" v-model="input['user:team:auto-create:instanceType']" :options="instanceTypeOptionsForSelectedTeamType" :disabled="!input['user:team:auto-create:teamType']" :error="autoCreateInstanceError" containerClass="max-w-sm ml-9">
            Starter Instance Type
            <template #description>
                To optionally create a starter instance when users first register, set the instance type.
                <template v-if="features.billing">Ensure TeamType is configured to allow this instance type at no charge.</template>
            </template>
        </FormRow>
        <FormRow v-model="input['user:reset-password']" type="checkbox" :error="errors.requiresEmail" :disabled="!!errors.requiresEmail">
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
        <FormRow v-if="input['user:tcs-required']" v-model="input['user:tcs-url']" containerClass="max-w-sm ml-9" type="text" :error="errors.termsAndConditions" data-el="terms-and-condition-url">
            Terms &amp; Conditions URL
            <template #description>
                <p>Changing this URL will require all users to reaccept the terms the next time they access the platform</p>
            </template>
        </FormRow>
        <FormRow v-if="input['user:tcs-required']" containerClass="max-w-sm ml-9">
            <template #description>
                <p>Last updated: {{ tcsDate }}.</p>
                <div class="flex items-center space-x-2"><p>Require users to reaccept the terms now: </p><ff-button size="small" :disabled="loading" kind="tertiary" data-action="terms-and-condition-update" @click="updateTermsAndConditions">update now</ff-button></div>
            </template>
            <template #input>&nbsp;</template>
        </FormRow>
        <FormHeading>Teams</FormHeading>
        <FormRow v-model="input['team:create']" type="checkbox">
            Allow users to create teams
            <template #description>
                <p>
                    If a user creates a team, they become its Owner. Otherwise they
                    must be invited to an existing team by an Administrator or Team Owner.
                </p>
                <p>Administrators can always create teams.</p>
            </template>
        </FormRow>
        <FormRow v-model="input['team:user:invite:external']" type="checkbox" :disabled="!!errors.requiresEmail" :error="errors.requiresEmail">
            Allow users to invite external users to teams
            <template #description>
                <p>
                    Users can invite existing users to join a team. If they provide
                    an email address of an unregistered user, the invitation will be
                    sent to that email address.
                </p>
            </template>
        </FormRow>
        <FormHeading>Platform</FormHeading>
        <FormRow v-model="platformStatsTokenEnabled" type="checkbox">
            Allow token-based access to platform statistics
            <template #description>
                <p>
                    This can be used to enable remote monitoring of the platform
                    without providing full access to the admin API.
                </p>
                <p>
                    The token is generated when this option is enabled. Once
                    enabled, the token cannot be retrieved.
                </p>
                <p>
                    To regenerate the token, disable, then re-enable this option.
                </p>
            </template>
        </FormRow>
        <ff-dialog ref="enablePlatformStatsToken" header="Allow token-based access to platform statistics">
            <template #default>
                <ff-loading v-if="platformStatsTokenGenerating" message="Generating token..." />
                <template v-else>
                    <p>The following token can be used to access the platform statistics api.</p>
                    <code class="block my-2">{{ platformStatsToken }}</code>
                    <p>
                        This is the only time this token will be shared. Make sure you save it
                        before closing this dialog.
                    </p>
                </template>
            </template>
            <template #actions>
                <ff-button v-if="!platformStatsTokenGenerating" @click="$refs['enablePlatformStatsToken'].close()">Close</ff-button>
                <span v-else>&nbsp;</span>
            </template>
        </ff-dialog>
        <ff-dialog ref="disablePlatformStatsToken" header="Disable token-based access to platform statistics">
            <template #default>
                <p>This will delete the active token used to access the platform statistics.</p>
                <p>Are you sure?</p>
            </template>
            <template #actions>
                <ff-button @click="cancelDisablePlatformStatsToken">Cancel</ff-button>
                <ff-button kind="danger" @click="disableStatsToken">Disable</ff-button>
            </template>
        </ff-dialog>

        <FormRow v-if="!isLicensed" v-model="input['telemetry:enabled']" type="checkbox">
            Enable collection of anonymous statistics
            <template #description>
                <p>
                    We collect anonymous statistics about how FlowFuse is used.
                    This allows us to improve how it works and make a better product.
                </p>
                <p>
                    For more information about the data we collect and how it is used,
                    please see our <a class="forge-link" href="https://flowfuse.com/docs/admin/telemetry/" target="_blank">Usage Data Collection Policy</a>
                </p>
            </template>
        </FormRow>

        <div class="pt-8">
            <ff-button :disabled="!saveEnabled" data-action="save-settings" @click="saveChanges">Save settings</ff-button>
        </div>
    </div>
</template>

<script>
import { mapState } from 'vuex'

import adminApi from '../../../api/admin.js'
import instanceTypesApi from '../../../api/instanceTypes.js'
import settingsApi from '../../../api/settings.js'
import teamTypesApi from '../../../api/teamTypes.js'
import FormHeading from '../../../components/FormHeading.vue'
import FormRow from '../../../components/FormRow.vue'
import Alerts from '../../../services/alerts.js'
import Dialog from '../../../services/dialog.js'

const validSettings = [
    'user:signup',
    'user:reset-password',
    'user:team:auto-create',
    'user:team:auto-create:teamType',
    'user:team:auto-create:instanceType',
    'user:tcs-required',
    'user:tcs-url',
    'user:tcs-date',
    'team:create',
    'team:user:invite:external',
    'telemetry:enabled',
    'branding:account:signUpTopBanner',
    'branding:account:signUpLeftBanner',
    'platform:stats:token'
]

export default {
    name: 'AdminSettingsGeneral',
    components: {
        FormRow,
        FormHeading
    },
    data () {
        return {
            loading: false,
            input: {
            },
            platformStatsTokenEnabled: false,
            platformStatsToken: null,
            errors: {
                requiresEmail: null,
                termsAndConditions: null
            },
            teamTypes: [],
            instanceTypes: [],
            teamTypesOptions: [],
            platformStatsTokenGenerating: false
        }
    },
    computed: {
        ...mapState('account', ['features', 'settings']),
        isLicensed () {
            return !!this.settings['platform:licensed']
        },
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
        },

        autoCreateInstanceError () {
            if (!this.input['user:team:auto-create:teamType']) {
                return 'Requires Team Type to be set'
            }

            if (!this.selectedTeamType) {
                return 'Selected Team Type not found'
            }

            if (!(this.instanceTypeOptionsForSelectedTeamType?.length)) {
                return 'No instance types found for selected Team Type'
            }

            return null
        },
        selectedTeamType () {
            return this.teamTypes.find(tt => tt.id === this.input['user:team:auto-create:teamType'])
        },
        instanceTypeOptionsForSelectedTeamType () {
            if (!this.input['user:team:auto-create:teamType'] || !this.selectedTeamType) {
                return [{
                    value: null,
                    label: 'None'
                }]
            }

            const activeInstanceTypesIds = Object.keys(this.selectedTeamType.properties.instances)

            const instanceTypeOptions = this.instanceTypes
                .filter(instanceType => activeInstanceTypesIds.includes(instanceType.id))
                .map((instanceType) => {
                    return {
                        value: instanceType.id,
                        label: instanceType.name
                    }
                })

            instanceTypeOptions.unshift({
                value: null,
                label: 'None'
            })

            return instanceTypeOptions
        }
    },
    watch: {
        platformStatsTokenEnabled: function (newValue) {
            if (this.platformStatsToken === null) {
                // This is the initial setting of the value - ignore it
                this.platformStatsToken = ''
                return
            }
            if (newValue) {
                this.showGenerateStatsToken()
            } else {
                this.showDisableStatsToken()
            }
        }
    },
    async created () {
        if (!this.settings.email) {
            this.errors.requiresEmail = 'This option requires email to be configured'
        }
        validSettings.forEach(s => {
            this.input[s] = this.settings[s]
        })

        this.instanceTypes = (await instanceTypesApi.getInstanceTypes()).types

        this.teamTypes = (await teamTypesApi.getTeamTypes()).types
        this.teamTypesOptions = this.teamTypes.map(tt => {
            return {
                order: tt.order,
                value: tt.id,
                label: tt.name
            }
        })
        this.teamTypesOptions.sort((A, B) => { return A.order - B.order })

        this.platformStatsTokenEnabled = this.input['platform:stats:token']
        if (!this.platformStatsTokenEnabled) {
            this.platformStatsToken = ''
        }
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
                    Alerts.emit('Settings changed successfully.', 'confirmation')
                })
                .catch((err) => {
                    console.warn(err)
                    Alerts.emit(`Something went wrong: ${err}`, 'warning')
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
        },

        showGenerateStatsToken () {
            this.platformStatsTokenGenerating = true
            this.$refs.enablePlatformStatsToken.show()
            adminApi.generateStatsAccessToken().then(result => {
                this.platformStatsToken = result.token
                this.platformStatsTokenGenerating = false
            }).catch(err => {
                console.warn('Error loading stats token', err)
            })
        },
        showDisableStatsToken () {
            this.$refs.disablePlatformStatsToken.show()
        },
        cancelDisablePlatformStatsToken () {
            this.$refs.disablePlatformStatsToken.close()
            this.platformStatsToken = null
            this.platformStatsTokenEnabled = true
        },
        disableStatsToken () {
            this.$refs.disablePlatformStatsToken.close()
            this.platformStatsToken = ''
            this.platformStatsTokenEnabled = false
            adminApi.deleteStatsAccessToken()
                .then(result => {})
                .catch(err => {
                    if (err.response?.status === 403) {
                        this.$router.push('/')
                    }
                    console.warn('Error disabling stats token', err)
                })
        }
    }
}
</script>
