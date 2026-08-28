<template>
    <form class="space-y-4" data-el="instance-editor" @submit.prevent>
        <FormHeading>{{ $t('ui.editor') }}</FormHeading>
        <div class="flex flex-col sm:flex-row">
            <div class="w-full max-w-md sm:mr-8">
                <FormRow v-model="editable.settings.disableEditor" type="checkbox" :disabled="!editTemplate && !editable.policy.disableEditor">
                    {{ $t('ui.disableEditor') }}
                    <template #description>
                        {{ $t('ui.disableTheEditorForThisInstanceTheOnlyWayToModif') }}
                    </template>
                    <template #append><ChangeIndicator :value="editable.changed.settings.disableEditor" /></template>
                </FormRow>
            </div>
            <LockSetting v-model="editable.policy.disableEditor" :editTemplate="editTemplate" :changed="editable.changed.policy.disableEditor" />
        </div>
        <div class="flex flex-col sm:flex-row">
            <div class="w-full max-w-md sm:mr-8">
                <FormRow v-model="editable.settings.disableTours" type="checkbox" :disabled="!editTemplate && !editable.policy.disableTours">
                    {{ $t('ui.disableWelcomeTour') }}
                    <template #description>
                        {{ $t('ui.disableTheWelcomeTourWhenAccessingTheEditorTheFi') }}
                    </template>
                    <template #append><ChangeIndicator :value="editable.changed.settings.disableTours" /></template>
                </FormRow>
            </div>
            <LockSetting v-model="editable.policy.disableTours" :editTemplate="editTemplate" :changed="editable.changed.policy.disableTours" />
        </div>
        <div class="flex flex-col sm:flex-row">
            <div class="w-full max-w-md sm:mr-8">
                <FormRow v-model="editable.settings.httpAdminRoot" :error="editable.errors.httpAdminRoot" :disabled="!editTemplate && editable.policy.httpAdminRoot === false" type="text">
                    {{ $t('ui.editorUrlPath') }}
                    <template #description>
                        {{ $t('ui.thePathUsedToServeTheEditor') }}
                    </template>
                    <template #append><ChangeIndicator :value="editable.changed.settings.httpAdminRoot" /></template>
                </FormRow>
            </div>
            <LockSetting v-model="editable.policy.httpAdminRoot" class="flex justify-end flex-col" :editTemplate="editTemplate" :changed="editable.changed.policy.httpAdminRoot" />
        </div>
        <div class="flex flex-col sm:flex-row">
            <div class="w-full max-w-md sm:mr-8">
                <FormRow v-model="editable.settings.dashboardUI" :error="editable.errors.dashboardUI" :disabled="!editTemplate && !editable.policy.dashboardUI" type="text">
                    {{ $t('ui.legacyDashboardUrlPath') }}
                    <template #description>
                        <div>{{ $t('ui.thePathUsedToServeTheLegacyNodeRedDashboardUi') }}</div>
                        <div>
                            {{ $t('ui.noteNodeRedDashboard') }} <a href="https://flowfuse.com/blog/2024/06/dashboard-1-deprecated/" class="ff-link" target="_blank" rel="noopener noreferrer">{{ $t('ui.isDeprecated') }}</a>
                        </div>
                    </template>
                    <template #append><ChangeIndicator :value="editable.changed.settings.dashboardUI" /></template>
                </FormRow>
            </div>
            <LockSetting v-model="editable.policy.dashboardUI" class="flex justify-end flex-col" :editTemplate="editTemplate" :changed="editable.changed.policy.dashboardUI" />
        </div>
        <div class="flex flex-col sm:flex-row">
            <div class="w-full max-w-md sm:mr-8">
                <FormRow type="text">
                    {{ $t('ui.flowfuseDashboardUrlPath') }}
                    <template #description>
                        {{ $t('ui.thePathUsedToServeThe') }} <a href="https://dashboard.flowfuse.com/" class="ff-link" target="_blank" rel="noopener noreferrer">{{ $t('ui.flowfuseDashboard') }}</a>
                    </template>
                    <template #input>
                        <div data-el="form-row-uneditable" class="w-full uneditable undefined text-gray-300">/dashboard</div>
                    </template>
                </FormRow>
            </div>
            <LockSetting class="flex justify-end flex-col" :tooltip="$t('ui.thisSettingIsFixedAndCannotBeChanged')" />
        </div>
        <div v-if="dashboardIFrameAvailable">
            <div class="flex flex-col sm:flex-row">
                <div class="w-full max-w-md sm:mr-8">
                    <FormRow v-model="editable.settings.dashboardIFrame" :error="editable.errors.dashboardIFrame" :disabled="!editTemplate && !editable.policy.dashboardIFrame" type="checkbox">
                        {{ $t('ui.allowDashboardToBeEmbeddedInAnIframe') }}
                        <template #description>
                            {{ $t('ui.setsThe') }} <span>Content-Security-Policy: frame-ancestor '*'</span> {{ $t('ui.httpHeaderForTheDashboard') }}
                        </template>
                        <template #append><ChangeIndicator :value="editable.changed.settings.dashboardIFrame" /></template>
                    </FormRow>
                </div>
                <LockSetting v-model="editable.policy.dashboardIFrame" class="flex justify-end flex-col" :editTemplate="editTemplate" :changed="editable.changed.policy.dashboardIFrame" />
            </div>
        </div>
        <div v-else class="flex flex-col sm:flex-row">
            <div class="space-y-4 w-full max-w-md sm:mr-8">
                <p>{{ $t('ui.upgradeYourStackToBeAbleToEnable') }}</p>
                <p>{{ $t('ui.embeddingDashboardsInIframes') }}</p>
                <ff-button size="small" to="general">{{ $t('ui.upgrade') }}</ff-button>
            </div>
        </div>
        <div class="flex flex-col sm:flex-row">
            <div class="w-full max-w-md sm:mr-8">
                <FormRow v-model="editable.settings.codeEditor" :disabled="!editTemplate && !editable.policy.codeEditor" type="select" :options="[{label:'monaco', value:'monaco'},{label:'ace', value:'ace'}]">
                    {{ $t('ui.codeEditor') }}
                    <template #append><ChangeIndicator :value="editable.changed.settings.codeEditor" /></template>
                </FormRow>
            </div>
            <LockSetting v-model="editable.policy.codeEditor" class="flex justify-end flex-col" :editTemplate="editTemplate" :changed="editable.changed.policy.codeEditor" />
        </div>
        <div class="flex flex-col sm:flex-row">
            <div class="w-full max-w-md sm:mr-8">
                <FormRow v-model="editable.settings.header_title" :error="editable.errors.header_title" :disabled="!editTemplate && !editable.policy.header_title" type="text">
                    {{ $t('ui.editorTitle') }}
                    <template #description>
                        {{ $t('ui.theTitleToShowInTheHeader') }}
                    </template>
                    <template #append><ChangeIndicator :value="editable.changed.settings.header_title" /></template>
                </FormRow>
            </div>
            <LockSetting v-model="editable.policy.header_title" class="flex justify-end flex-col" :editTemplate="editTemplate" :changed="editable.changed.policy.header_title" />
        </div>
        <div class="flex flex-col sm:flex-row">
            <div class="w-full max-w-md sm:mr-8">
                <FormRow v-model="editable.settings.theme" :disabled="!editTemplate && !editable.policy.theme" type="uneditable" :options="themeOptions" wrapper-class="max-w-sm">
                    {{ $t('ui.editorTheme') }}
                    <template #append><ChangeIndicator :value="editable.changed.settings.theme" /></template>
                    <template #description>{{ $t('ui.chooseAStandardFlowfuseThemeOrEnterTheNameOfALoa') }}</template>
                    <template #input>
                        <ff-combobox
                            v-model="editable.settings.theme"
                            :options="themeOptions"
                            :disabled="!editTemplate && !editable.policy.theme"
                            :hasCustomValue="true"
                            data-el="theme-dropdown"
                        />
                    </template>
                </FormRow>
            </div>
            <LockSetting v-model="editable.policy.theme" class="flex justify-end flex-col" :editTemplate="editTemplate" :changed="editable.changed.policy.theme" />
        </div>
        <div class="flex flex-col sm:flex-row">
            <div class="w-full max-w-md sm:mr-8">
                <FormRow v-model="editable.settings.timeZone" :disabled="!editTemplate && !editable.policy.timeZone" type="select" :options="timezones">
                    {{ $t('ui.timeZone') }}
                    <template #append><ChangeIndicator :value="editable.changed.settings.timeZone" /></template>
                </FormRow>
            </div>
            <LockSetting v-model="editable.policy.timeZone" class="flex justify-end flex-col" :editTemplate="editTemplate" :changed="editable.changed.policy.timeZone" />
        </div>
        <FormHeading class="pt-8">{{ $t('ui.limits') }}</FormHeading>
        <div v-if="limitAvailable">
            <div v-if="limitsLauncherEnabled">
                <div class="flex flex-col sm:flex-row">
                    <div class="w-full max-w-md sm:mr-8">
                        <FormRow v-model="editable.settings.apiMaxLength" :disabled="apiLimitDisabled" type="text">
                            {{ $t('ui.maxHttpPayloadSize') }}
                            <template #description>
                                {{ $t('ui.theMaximumNumberOfBytesAllowedInAHttpRequestInBy') }}
                            </template>
                            <template #append><ChangeIndicator :value="editable.changed.settings.apiMaxLength" /></template>
                        </FormRow>
                    </div>
                    <LockSetting v-model="editable.policy.apiMaxLength" class="flex justify-end flex-col" :editTemplate="editTemplate" :changed="editable.changed.policy.apiMaxLength" />
                </div>
                <div class="flex flex-col sm:flex-row">
                    <div class="w-full max-w-md sm:mr-8">
                        <FormRow v-model="editable.settings.debugMaxLength" :disabled="debugLimitDisabled" type="number">
                            {{ $t('ui.maxDebugMessageSize') }}
                            <template #description>
                                {{ $t('ui.theMaximumNumberOfCharactersToShowOfAMessageInTh') }}
                            </template>
                            <template #append><ChangeIndicator :value="editable.changed.settings.debugMaxLength" /></template>
                        </FormRow>
                    </div>
                    <LockSetting v-model="editable.policy.debugMaxLength" class="flex justify-end flex-col" :editTemplate="editTemplate" :changed="editable.changed.policy.debugMaxLength" />
                </div>
            </div>
            <div v-else class="flex flex-col sm:flex-row">
                <div class="space-y-4 w-full max-w-md sm:mr-8">
                    {{ $t('ui.upgradeYourStackToBeAbleToSetApimaxlengthOrDebug') }}
                    <ff-button size="small" to="general">{{ $t('ui.upgrade') }}</ff-button>
                </div>
            </div>
        </div>
        <FeatureUnavailableToTeam v-if="!limitAvailable" :featureName="$t('ui.setApiAndDebugSizeLimits')" />
        <FormHeading class="pt-8">{{ $t('ui.externalModules') }}</FormHeading>
        <div class="flex flex-col sm:flex-row">
            <div class="space-y-4 w-full max-w-md sm:mr-8">
                <FormRow v-model="editable.settings.modules_allowInstall" type="checkbox" :disabled="!editTemplate && !editable.policy.modules_allowInstall">
                    {{ $t('ui.allowUserToInstallNewModulesInTheFunctionNode') }}
                    <template #append><ChangeIndicator :value="editable.changed.settings.modules_allowInstall" /></template>
                </FormRow>
            </div>
            <LockSetting v-model="editable.policy.modules_allowInstall" :editTemplate="editTemplate" :changed="editable.changed.policy.modules_allowInstall" />
        </div>

        <div class="flex flex-col sm:flex-row">
            <div class="w-full max-w-md sm:mr-8">
                <FormRow v-model="editable.settings.modules_denyList" :disabled="!editTemplate && !editable.policy.modules_denyList" :error="editable.errors.modules_denyList" :type="(editTemplate||editable.policy.modules_denyList)?'text':'uneditable'">
                    {{ $t('ui.preventInstallOfExternalModules') }}
                    <template #description>
                        {{ $t('ui.thisCanBeUsedToPreventTheInstallationOfModulesIn') }} <pre>'package-name@semVer, foo@^0.1.0, @scope/*'</pre>
                    </template>
                    <template #append><ChangeIndicator :value="editable.changed.settings.modules_denyList" /></template>
                </FormRow>
            </div>
            <LockSetting v-model="editable.policy.modules_denyList" class="flex justify-end flex-col" :editTemplate="editTemplate" :changed="editable.changed.policy.modules_denyList" />
        </div>
    </form>
</template>

<script>
import { mapState } from 'pinia'
import SemVer from 'semver'

import FormHeading from '../../../../components/FormHeading.vue'
import FormRow from '../../../../components/FormRow.vue'
import FeatureUnavailableToTeam from '../../../../components/banners/FeatureUnavailableToTeam.vue'
import timezonesData from '../../../../data/timezones.json'
import { t } from '../../../../i18n.js'
import { isInstanceOnNR5Plus } from '../../../../utils/instanceVersion'
import ChangeIndicator from '../components/ChangeIndicator.vue'
import LockSetting from '../components/LockSetting.vue'

import { useAccountSettingsStore } from '@/stores/account-settings.js'

export default {
    name: 'TemplateSettingsEditor',
    components: {
        FormRow,
        FormHeading,
        FeatureUnavailableToTeam,
        LockSetting,
        ChangeIndicator
    },
    props: {
        editTemplate: {
            type: Boolean,
            default: false
        },
        modelValue: {
            type: Object,
            default: null
        },
        instance: {
            type: Object,
            required: false,
            default: () => {}
        },
        team: {
            type: Object,
            default: null
        }
    },
    emits: ['update:modelValue'],
    data () {
        return {
            timezones: timezonesData.timezones
        }
    },
    computed: {
        ...mapState(useAccountSettingsStore, ['features']),
        editable: {
            get () {
                return this.modelValue
            },
            set (localValue) {
                this.$emit('update:modelValue', localValue)
            }
        },
        limitsLauncherEnabled () {
            const launcherVersion = this.instance?.meta?.versions?.launcher
            if (!launcherVersion) {
                // We won't have this for a suspended project - so err on the side
                // of permissive
                return true
            }
            return SemVer.satisfies(SemVer.coerce(launcherVersion), '>=2.2.1')
        },
        limitAvailable () {
            if (!this.team && this.features.editorLimits) {
                // If on the Admin Template view, then this option is available
                return true
            }
            const flag = this.features.editorLimits && this.team.type.properties.features?.editorLimits
            return !!flag
        },
        apiLimitDisabled () {
            return !this.editTemplate && !this.editable.policy.apiMaxLength
        },
        debugLimitDisabled () {
            return !this.editTemplate && !this.editable.policy.debugMaxLength
        },
        dashboardIFrameAvailable () {
            const launcherVersion = this.instance?.meta?.versions?.launcher
            if (!launcherVersion) {
                // We won't have this for a suspended project - so err on the side
                // of permissive
                return true
            }
            return SemVer.satisfies(SemVer.coerce(launcherVersion), '>=2.12.0')
        },
        instanceOnNR5Plus () {
            return isInstanceOnNR5Plus(this.instance)
        },
        defaultThemes () {
            // NR5+ runtime gate collapses Light/Dark to `forge`; show one option.
            // Admin Template stays version-agnostic since it targets any NR version.
            if (!this.editTemplate && this.instanceOnNR5Plus) {
                return [{ label: t('ui.flowfuse2'), value: 'forge' }]
            }
            return [
                { label: t('ui.flowfuseLight'), value: 'forge-light' },
                { label: t('ui.flowfuseDark'), value: 'forge-dark' }
            ]
        },
        themeOptions () {
            if (this.modelValue?.settings?.theme && !this.defaultThemes.map(th => th.value).includes(this.modelValue.settings.theme)) {
                // set the custom theme as one of the available options
                return [...this.defaultThemes, { label: this.modelValue.settings.theme, value: this.modelValue.settings.theme }]
            }

            return this.defaultThemes
        }
    }
}
</script>
