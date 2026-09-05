<template>
    <ff-loading v-if="loading" :message="$t('ui.savingSettings')" />
    <div v-else class="space-y-4">
        <FormHeading>{{ $t('ui.users') }}</FormHeading>
        <FormRow v-model="input['user:signup']" data-el="enable-signup" type="checkbox" :error="errors.requiresEmail" :disabled="!!errors.requiresEmail">
            {{ $t('ui.allowNewUsersToRegisterOnTheLoginScreen') }}
            <template #description>
                {{ $t('ui.ifSelfRegistrationIsNotEnabledAnAdministratorMus') }}
            </template>
        </FormRow>
        <template v-if="input['user:signup']">
            <FormRow v-model="input['branding:account:signUpTopBanner']" data-el="banner" containerClass="max-w-sm ml-9">
                {{ $t('ui.htmlContentToShowAboveTheSignUpForm') }}
            </FormRow>
            <FormRow v-model="input['branding:account:signUpLeftBanner']" containerClass="max-w-sm ml-9">
                {{ $t('ui.htmlContentToShowToTheLeftOfTheSignUpForm') }}
                <template #input><textarea v-model="input['branding:account:signUpLeftBanner']" data-el="splash" class="w-full" rows="6" /></template>
            </FormRow>
        </template>
        <FormRow v-model="input['user:team:auto-create']" type="checkbox" data-el="team-auto-create">
            {{ $t('ui.createAPersonalTeamForUsersWhenTheyRegister') }}
            <template #description>
                {{ $t('ui.ifATeamIsNotAutomaticallyCreatedTheyWillEitherHa') }}
            </template>
        </FormRow>
        <FormRow v-if="input['user:team:auto-create']" v-model="input['user:team:auto-create:teamType']" :options="teamTypesOptions" containerClass="max-w-sm ml-9" data-el="team-auto-create-teamType">
            {{ $t('ui.personalTeamType') }}
            <template #description>
                {{ $t('ui.theTypeOfTeamToCreateForAUserWhenTheyRegister') }}
                <template v-if="features.billing">{{ $t('ui.trialModeIsConfiguredWithinTheIndividualTeamtype') }}</template>
            </template>
        </FormRow>
        <FormRow v-if="input['user:team:auto-create']" v-model="input['user:team:auto-create:instanceType']" :options="instanceTypeOptionsForSelectedTeamType" :disabled="!input['user:team:auto-create:teamType']" :error="autoCreateInstanceError" containerClass="max-w-sm ml-9" data-el="team-auto-create-instanceType">
            {{ $t('ui.starterInstanceType') }}
            <template #description>
                {{ $t('ui.toOptionallyCreateAStarterInstanceWhenUsersFirst') }}
                <template v-if="features.billing">{{ $t('ui.ensureTeamtypeIsConfiguredToAllowThisInstanceTyp') }}</template>
            </template>
        </FormRow>
        <FormRow v-model="input['user:reset-password']" type="checkbox" :error="errors.requiresEmail" :disabled="!!errors.requiresEmail">
            {{ $t('ui.allowUsersToResetTheirPasswordOnTheLoginScreen') }}
            <template #description>
                {{ $t('ui.usersWillBeSentAnEmailWithALinkBackToThePlatform') }}
            </template>
        </FormRow>
        <FormRow v-model="input['user:tcs-required']" type="checkbox" data-el="terms-and-condition-required">
            {{ $t('ui.requireUserAgreementToTermsAmpConditions') }}
            <template #description>
                {{ $t('ui.whenSigningUpUsersWillBePresentedWithALinkToTheT') }}
            </template>
        </FormRow>
        <FormRow v-if="input['user:tcs-required']" v-model="input['user:tcs-url']" containerClass="max-w-sm ml-9" type="text" :error="errors.termsAndConditions" data-el="terms-and-condition-url">
            {{ $t('ui.termsAmpConditionsUrl') }}
            <template #description>
                <p>{{ $t('ui.changingThisUrlWillRequireAllUsersToReacceptTheT') }}</p>
            </template>
        </FormRow>
        <FormRow v-if="input['user:tcs-required']" containerClass="max-w-sm ml-9">
            <template #description>
                <p>{{ $t('ui.lastUpdatedP0', { p0: tcsDate }) }}</p>
                <div class="flex items-center space-x-2"><p>{{ $t('ui.requireUsersToReacceptTheTermsNow') }} </p><ff-button size="small" :disabled="loading" kind="tertiary" data-action="terms-and-condition-update" @click="updateTermsAndConditions">{{ $t('ui.updateNow') }}</ff-button></div>
            </template>
            <template #input>&nbsp;</template>
        </FormRow>
        <FormRow v-model="input['user:offboarding-required']" type="checkbox" data-el="offboarding-required">
            {{ $t('ui.redirectOffboardingUsers') }}
            <template #description>
                {{ $t('ui.whenDeletingTheirAccountsUsersWillBeRedirectedTo') }}
            </template>
        </FormRow>
        <FormRow
            v-if="input['user:offboarding-required']"
            :error="errors.offboardingUrl"
            containerClass="max-w-sm ml-9" data-el="offboarding-url"
        >
            <div class="flex items-center space-x-2">
                <p>{{ $t('ui.offboardingUrl') }} </p>
            </div>
            <template #input>
                <input v-model="input['user:offboarding-url']" type="text" class="w-full">
            </template>
        </FormRow>
        <FormHeading>{{ $t('ui.teams') }}</FormHeading>
        <FormRow v-model="input['team:create']" type="checkbox">
            {{ $t('ui.allowUsersToCreateTeams') }}
            <template #description>
                <p>
                    {{ $t('ui.ifAUserCreatesATeamTheyBecomeItsOwnerOtherwiseTh') }}
                </p>
                <p>{{ $t('ui.administratorsCanAlwaysCreateTeams') }}</p>
            </template>
        </FormRow>
        <template v-if="input['team:create']">
            <FormRow v-model="input['user:team:auto-create:application']" type="checkbox" containerClass="max-w-sm ml-9">
                {{ $t('ui.createADefaultApplicationInTheTeam') }}
                <template #description>
                    <p>
                        {{ $t('ui.wheneverATeamIsCreatedThisWillCreateADefaultAppl') }}
                    </p>
                </template>
            </FormRow>
        </template>
        <FormRow v-model="input['team:user:invite:external']" type="checkbox" :disabled="!!errors.requiresEmail" :error="errors.requiresEmail">
            {{ $t('ui.allowUsersToInviteExternalUsersToTeams') }}
            <template #description>
                <p>
                    {{ $t('ui.usersCanInviteExistingUsersToJoinATeamIfTheyProv') }}
                </p>
            </template>
        </FormRow>
        <FormHeading>{{ $t('ui.platform') }}</FormHeading>
        <FormRow v-model="platformStatsTokenEnabled" type="checkbox">
            {{ $t('ui.allowTokenBasedAccessToPlatformStatistics') }}
            <template #description>
                <p>
                    {{ $t('ui.thisCanBeUsedToEnableRemoteMonitoringOfThePlatfo') }}
                </p>
                <p>
                    {{ $t('ui.theTokenIsGeneratedWhenThisOptionIsEnabledOnceEn') }}
                </p>
                <p>
                    {{ $t('ui.toRegenerateTheTokenDisableThenReEnableThisOptio') }}
                </p>
            </template>
        </FormRow>
        <ff-dialog ref="enablePlatformStatsToken" :header="$t('ui.allowTokenBasedAccessToPlatformStatistics')">
            <template #default>
                <ff-loading v-if="platformStatsTokenGenerating" :message="$t('ui.generatingToken')" />
                <template v-else>
                    <p>{{ $t('ui.theFollowingTokenCanBeUsedToAccessThePlatformSta') }}</p>
                    <code class="block my-2">{{ platformStatsToken }}</code>
                    <p>
                        {{ $t('ui.thisIsTheOnlyTimeThisTokenWillBeSharedMakeSureYo') }}
                    </p>
                </template>
            </template>
            <template #actions>
                <ff-button v-if="!platformStatsTokenGenerating" @click="$refs['enablePlatformStatsToken'].close()">{{ $t('ui.close') }}</ff-button>
                <span v-else>&nbsp;</span>
            </template>
        </ff-dialog>
        <ff-dialog ref="disablePlatformStatsToken" :header="$t('ui.disableTokenBasedAccessToPlatformStatistics')">
            <template #default>
                <p>{{ $t('ui.thisWillDeleteTheActiveTokenUsedToAccessThePlatf') }}</p>
                <p>{{ $t('ui.areYouSure') }}</p>
            </template>
            <template #actions>
                <ff-button @click="cancelDisablePlatformStatsToken">{{ $t('ui.cancel') }}</ff-button>
                <ff-button kind="danger" @click="disableStatsToken">{{ $t('ui.disable') }}</ff-button>
            </template>
        </ff-dialog>
        <FormRow v-if="!isLicensed" v-model="input['telemetry:enabled']" type="checkbox">
            {{ $t('ui.enableCollectionOfAnonymousStatistics') }}
            <template #description>
                <p>
                    {{ $t('ui.weCollectAnonymousStatisticsAboutHowFlowfuseIsUs') }}
                </p>
                <p>
                    {{ $t('ui.forMoreInformationAboutTheDataWeCollectAndHowItI') }} <a class="forge-link" href="https://flowfuse.com/docs/admin/telemetry/" target="_blank">{{ $t('ui.usageDataCollectionPolicy') }}</a>
                </p>
            </template>
        </FormRow>

        <template v-if="ssoEnabled">
            <FormHeading>{{ $t('ui.socialLogins') }}</FormHeading>
            <FormRow v-model="input['platform:sso:google']" type="checkbox" data-el="google-sso">
                {{ $t('ui.allowUsersToLoginWithGoogleSso') }}
                <template #description>
                    {{ $t('ui.usersCanLoginUsingGoogleSingleSignOnThisOnlySupp') }}
                </template>
            </FormRow>
            <FormRow v-if="input['platform:sso:google']" v-model="input['platform:sso:google:clientId']" containerClass="max-w-sm ml-9" type="text" data-el="google-sso-">
                {{ $t('ui.clientId') }}
                <template #description>
                    {{ $t('ui.theClientIdForTheGoogleSsoApplication') }}
                </template>
            </FormRow>
            <FormRow v-if="input['platform:sso:google']" v-model="input['platform:sso:google:auto-create']" containerClass="max-w-sm ml-9" type="checkbox" data-el="google-sso-auto-create">
                {{ $t('ui.createNewUsersAutomatically') }}
            </FormRow>
        </template>

        <template v-if="ssoEnabled">
            <FormHeading>{{ $t('ui.directSsoLogin') }}</FormHeading>
            <FormRow v-model="input['platform:sso:direct']" type="checkbox" data-el="direct-sso">
                {{ $t('ui.showButtonsOnLoginPageToJumpDirectlyToASamlSsoPr') }}
                <template #description>
                    {{ $t('ui.allowsBypassingEmailMatchingForSamlSsoLoginsRead') }} <a class="forge-link" href="https://flowfuse.com/docs/admin/sso/saml/" target="_blank">{{ $t('ui.here') }}</a>
                </template>
            </FormRow>
        </template>

        <template v-if="ssoEnabled">
            <FormHeading>{{ $t('ui.automaticSsoRedirect') }}</FormHeading>
            <FormRow v-model="input['platform:sso:only']" type="checkbox" data-el="single-sso">
                {{ $t('ui.automaticallyRedirectAllLoginsToASingleSamlSsoPr') }}
                <template #description>
                    {{ $t('ui.usersWillBeAutomaticallyRedirectedToTheSamlSsoPr') }}
                    <br>
                    {{ $t('ui.adminUsersCanStillAccessTheLoginPageByGoingToAdm') }}
                </template>
            </FormRow>
            <FormRow v-if="input['platform:sso:only']" v-model="input['platform:sso:only:provider']" :error="errors.ssoOnlyProvider" :options="ssoProvidersOptions" containerClass="max-w-sm ml-9" data-el="single-sso-provider">
                {{ $t('ui.whichActiveSamlSsoProviderToUseForAllLogins') }}
            </FormRow>
            <FormRow v-if="input['platform:sso:only']" v-model="input['platform:sso:only:logoutURL']" containerClass="max-w-sm ml-9" type="text" data-el="single-sso-url">
                {{ $t('ui.urlToRedirectToOnLogout') }}
                <template #description>
                    {{ $t('ui.preventsRedirectLoopsAutomaticallyLoggingUserBac') }}
                </template>
            </FormRow>
        </template>

        <div class="pt-8">
            <ff-button :disabled="!saveEnabled" data-action="save-settings" @click="saveChanges">{{ $t('ui.saveSettings2') }}</ff-button>
        </div>
    </div>
</template>

<script>
import { mapActions, mapState } from 'pinia'

import adminApi from '../../../api/admin.js'
import instanceTypesApi from '../../../api/instanceTypes.js'
import settingsApi from '../../../api/settings.js'
import ssoApi from '../../../api/sso.js'
import teamTypesApi from '../../../api/teamTypes.js'
import FormHeading from '../../../components/FormHeading.vue'
import FormRow from '../../../components/FormRow.vue'
import { isValidURL } from '../../../composables/strings/String.js'
import { t } from '../../../i18n.js'
import Alerts from '../../../services/alerts.js'
import Dialog from '../../../services/dialog.js'

import { useAccountSettingsStore } from '@/stores/account-settings.js'

const validSettings = [
    'user:signup',
    'user:reset-password',
    'user:team:auto-create',
    'user:team:auto-create:teamType',
    'user:team:auto-create:instanceType',
    'user:team:auto-create:application',
    'user:tcs-required',
    'user:tcs-url',
    'user:tcs-date',
    'user:offboarding-required',
    'user:offboarding-url',
    'team:create',
    'team:user:invite:external',
    'telemetry:enabled',
    'branding:account:signUpTopBanner',
    'branding:account:signUpLeftBanner',
    'platform:stats:token',
    'platform:sso:google',
    'platform:sso:google:auto-create',
    'platform:sso:google:clientId',
    'platform:sso:direct',
    'platform:sso:only',
    'platform:sso:only:provider',
    'platform:sso:only:logoutURL'
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
                termsAndConditions: null,
                offboardingUrl: null,
                ssoOnlyProvider: null
            },
            teamTypes: [],
            instanceTypes: [],
            teamTypesOptions: [],
            platformStatsTokenGenerating: false,
            ssoProvidersOptions: []
        }
    },
    computed: {
        ...mapState(useAccountSettingsStore, ['features', 'settings']),
        isLicensed () {
            return !!this.settings['platform:licensed']
        },
        ssoEnabled () {
            return this.features.sso
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
                    if (s !== 'user:offboarding-required' || this.input['user:offboarding-url']) {
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
                    label: t('ui.none')
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
                label: t('ui.none')
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
            this.errors.requiresEmail = t('ui.thisOptionRequiresEmailToBeConfigured')
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

        const ssoProviders = (await ssoApi.getProviders()).providers
        const filtered = ssoProviders.filter(sso => (sso.active && sso.type === 'saml'))
        this.ssoProvidersOptions = filtered.map(sso => {
            return {
                order: sso.order,
                value: sso.id,
                label: sso.name
            }
        })
    },
    methods: {
        ...mapActions(useAccountSettingsStore, ['refreshSettings']),
        validate () {
            if (this.input['user:tcs-required']) {
                const url = this.input['user:tcs-url'] || ''
                if (url.trim() === '') {
                    this.errors.termsAndConditions = t('ui.aUrlForTheTermsConditionsMustBeSet')
                    return false
                }
            }
            this.errors.termsAndConditions = ''

            if (this.input['user:offboarding-required']) {
                const url = this.input['user:offboarding-url'] || ''
                if (url.trim() === '') {
                    this.errors.offboardingUrl = t('ui.aUrlForTheOffboardingRedirectMustBeSet')
                    return false
                }

                if (!isValidURL(url)) {
                    this.errors.offboardingUrl = t('ui.aValidUrlForTheOffboardingRedirectMustBeSet')
                    return false
                }
            }
            this.errors.offboardingUrl = ''

            if (this.input['platform:sso:only'] && this.input['platform:sso:only:provider'] === null) {
                this.errors.ssoOnlyProvider = t('ui.youMustPickASamlSsoProvider')
                return false
            }
            this.errors.ssoOnlyProvider = ''

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
            if (!this.input['user:offboarding-required']) {
                if (this.settings['user:offboarding-required']) {
                    options['user:offboarding-url'] = ''
                } else {
                    delete options['user:offboarding-url']
                }
            }
            // if tcs-url present in options then it has changed - set tcs-updated as well
            if (this.input['user:tcs-required'] && options['user:tcs-url']) {
                options['user:tcs-updated'] = true
            }
            settingsApi.updateSettings(options)
                .then(() => {
                    this.refreshSettings()
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
                header: t('ui.updateTermsAndConditions'),
                kind: 'danger',
                text: `This action will require all existing users to reaccept the Terms and Conditions the next time they access the platform.
                       Are you sure?`,
                confirmLabel: 'Continue'
            }, async () => {
                this.loading = true
                const options = {}
                options['user:tcs-updated'] = true
                try {
                    await settingsApi.updateSettings(options)
                    this.refreshSettings()
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
