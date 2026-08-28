<template>
    <FormHeading class="mb-6">{{ $t('ui.instanceDetails') }}</FormHeading>
    <div class="space-y-6" data-el="instance-settings-general">
        <FormRow id="projectId" type="uneditable">
            {{ $t('ui.instanceId') }}
            <template #input>
                <TextCopier :text="input.projectId" class="w-full uneditable font-mono text-gray-800" />
            </template>
        </FormRow>

        <FormRow id="projectName" type="uneditable">
            {{ $t('ui.name') }}
            <template #input>
                <TextCopier :text="input.projectName" class="w-full uneditable text-gray-800" />
            </template>
        </FormRow>

        <FormRow v-model="input.projectTypeName" type="uneditable">
            {{ $t('ui.instanceType') }}
        </FormRow>

        <FormRow v-if="features.ha && input.haConfig" v-model="input.haConfig" type="uneditable">
            <template #default>{{ $t('ui.highAvailability') }}</template>
            <template #input>
                <div class="w-full uneditable undefined text-gray-800">{{ $t('ui.p0XInstances', { p0: input.haConfig.replicas }) }}</div>
            </template>
        </FormRow>
        <FormRow v-if="features.protectInstance && input.protectInstance" v-model="input.protectInstance" type="uneditable">
            <template #default>{{ $t('ui.instanceProtected2') }}</template>
            <template #input>
                <div>{{ $t('ui.protectedP0', { p0: input.protectInstance.enabled }) }}</div>
            </template>
        </FormRow>
        <FormRow v-model="input.stackDescription" type="uneditable">
            {{ $t('ui.nodeRedVersion') }}
        </FormRow>
        <FormRow v-model="input.templateName" type="uneditable">
            {{ $t('ui.template') }}
        </FormRow>
        <FormHeading class="mb-6">{{ $t('ui.hosting') }}</FormHeading>
        <FormRow type="uneditable">
            {{ $t('ui.directUrl') }}
            <template #input>
                <TextCopier :text="url" class="w-full uneditable text-gray-800" />
            </template>
        </FormRow>
        <div v-if="customHostnameAvailable">
            <FormRow v-model="input.customHostname" :error="errors.customHostname">
                {{ $t('ui.customDomain') }}
                <template #description>
                    <p>
                        {{ $t('ui.thisAllowsYouToAccessYourInstanceFromACustomSubd') }} <a class="ff-link" target="_blank" href="https://flowfuse.com/docs/user/custom-hostnames">{{ $t('ui.documentation2') }}</a>.
                    </p>
                </template>
                <template v-if="!customHostnameTeamAvailable" #input>
                    <FeatureUnavailableToTeam :featureName="$t('ui.customDomainName')" />
                </template>
                <template v-else-if="!customHostnameLauncherVersion" #input>
                    {{ $t('ui.toEnableCustomDomainsYouWillNeedToUpdateToTheLat') }}
                </template>
                <template v-if="customHostnameLauncherVersion && customHostnameTeamAvailable" #append>
                    <ff-button size="small" data-action="save-hostname" kind="secondary" :disabled="!customHostnameValid" @click="saveCustomHostname()">{{ $t('ui.save') }}</ff-button>
                </template>
            </FormRow>
            <p v-if="customHostnameLauncherVersion && customHostnameTeamAvailable && original.customHostname" class="text-xs pl-2 mt-1">
                <span v-if="checkingDomain">
                    <ArrowPathIcon class="w-4 inline" />
                    {{ $t('ui.checkingDomainStatus') }}
                </span>
                <span v-else-if="domainStatusValid" class="text-green-700">
                    <CheckBadgeIcon class="w-4 inline" /> {{ $t('ui.dnsVerified') }}
                </span>
                <span v-else class="text-red-700">
                    <ExclamationTriangleIcon class="w-4 inline" />
                    {{ $t('ui.dnsCheckFailed') }}
                </span>
            </p>
        </div>
        <DangerSettings
            :instance="instance"
            @instance-updated="$emit('instance-updated')"
            @instance-confirm-delete="$emit('instance-confirm-delete')"
            @instance-confirm-suspend="$emit('instance-confirm-suspend')"
        />
    </div>
</template>

<script>
import { ArrowPathIcon, CheckBadgeIcon, ExclamationTriangleIcon } from '@heroicons/vue/20/solid'

import { mapState } from 'pinia'
import SemVer from 'semver'

import instanceAPI from '../../../api/instances.js'

import FormHeading from '../../../components/FormHeading.vue'
import FormRow from '../../../components/FormRow.vue'
import TextCopier from '../../../components/TextCopier.vue'
import FeatureUnavailableToTeam from '../../../components/banners/FeatureUnavailableToTeam.vue'

import { t } from '../../../i18n.js'
import Dialog from '../../../services/dialog.js'

import DangerSettings from './Danger.vue'

import { useAccountSettingsStore } from '@/stores/account-settings.js'
import { useContextStore } from '@/stores/context.js'

export default {
    name: 'InstanceSettings',
    components: {
        CheckBadgeIcon,
        ExclamationTriangleIcon,
        ArrowPathIcon,
        FormRow,
        FormHeading,
        TextCopier,
        FeatureUnavailableToTeam,
        DangerSettings
    },
    inheritAttrs: false,
    props: {
        instance: {
            type: Object,
            required: true
        }
    },
    emits: ['instance-updated', 'instance-confirm-delete', 'instance-confirm-suspend', 'save-button-state'],
    data () {
        return {
            editing: {
                projectName: false
            },
            input: {
                projectId: '',
                projectName: '',
                projectTypeName: '',
                stackDescription: '',
                templateName: '',
                haConfig: {},
                customHostname: ''
            },
            original: {
                projectName: '',
                customHostname: ''
            },
            changed: {
                customHostname: false
            },
            errors: {
                customHostname: ''
            },
            url: '',
            checkingDomain: false,
            domainStatusValid: false,
            saveButton: {
                visible: false,
                disabled: true
            }
        }
    },
    computed: {
        ...mapState(useContextStore, ['team']),
        ...mapState(useAccountSettingsStore, ['features', 'settings']),
        isHA () {
            return !!this.instance?.ha
        },
        customHostnameValid () {
            return this.errors.customHostname === '' && this.original.customHostname !== this.input.customHostname
        },
        customHostnameAvailable () {
            const available = this.features.customHostnames
            return available
        },
        customHostnameTeamAvailable () {
            const available = this.features.customHostnames && this.team.type.properties.features?.customHostnames
            return available
        },
        customHostnameLauncherVersion () {
            const launcherVersion = this.instance?.meta?.versions?.launcher
            if (!launcherVersion) {
                // Not sure the launcher version - could be suspended/started
                // Be optimistic
                return true
            }

            // needs to be  v2.5.0 or better
            return SemVer.satisfies(SemVer.coerce(launcherVersion), '>=2.5.0')
        }
    },
    watch: {
        project: 'fetchData',
        'input.customHostname': function (v) {
            v = v || ''
            const validChars = /^[a-zA-Z0-9-.]{1,253}\.[a-zA-Z0-9-.]{1,253}\.[a-zA-Z0-9-.]{1,253}$/g
            let isValid = true
            const trimmedValue = v.trim()
            if (trimmedValue.length > 0) {
                // contains valid chars
                if (!validChars.test(trimmedValue)) {
                    isValid = false
                }
                // doesn't end with '.'
                if (trimmedValue.endsWith('.')) {
                    isValid = false
                }
            }
            if (isValid) {
                this.errors.customHostname = ''
            } else {
                this.errors.customHostname = t('ui.notAValidSubdomainName')
            }
        },
        saveButton: {
            immediate: true,
            handler: function (state) {
                this.$emit('save-button-state', state)
            }
        }
    },
    mounted () {
        this.fetchData()
    },
    methods: {
        fetchData () {
            this.input.projectId = this.instance.id
            if (this.instance.stack) {
                this.input.stackDescription = this.instance.stack.label || this.instance.stack.name
            } else {
                this.input.stackDescription = 'none'
            }
            if (this.instance.projectType) {
                this.input.projectTypeName = this.instance.projectType.name
            } else {
                this.input.projectTypeName = 'none'
            }

            if (this.instance.template) {
                this.input.templateName = this.instance.template.name
            } else {
                this.input.templateName = 'none'
            }

            this.input.projectName = this.instance.name
            if (this.instance.ha?.replicas !== undefined) {
                this.input.haConfig = this.instance.ha
            } else {
                this.input.haConfig = undefined
            }

            this.input.customHostname = this.instance.customHostname
            this.original.customHostname = this.instance.customHostname
            this.url = this.instance.url

            if (this.input.customHostname) {
                this.checkCustomHostnameStatus()
            }
        },
        async checkCustomHostnameStatus () {
            this.checkingDomain = true
            try {
                const result = await instanceAPI.checkCustomHostnameStatus(this.instance.id)
                if (result) {
                    this.domainStatusValid = true
                } else {
                    this.domainStatusValid = false
                }
            } catch (_) {
                this.domainStatusValid = false
            } finally {
                this.checkingDomain = false
            }
        },
        async saveCustomHostname () {
            // Validation of the value has already passed
            const domainName = this.input.customHostname.trim()

            const message = []
            if (domainName === '') {
                message.push('Clearing the custom domain will cause the instance to be restarted to enable the change.')
            } else {
                message.push('Setting the custom domain will cause the instance to be restarted to enabled the change.')
                message.push('The domain must have a <code>CNAME</code> record pointing at:')
                message.push(`<code>${this.settings.cnameTarget}</code>`)
            }

            Dialog.show({
                header: t('ui.customDomain'),
                kind: 'primary',
                html: `<p>${message.join('</p><p>')}</p>`
            }, async () => {
                if (domainName.length === 0) {
                    try {
                        await instanceAPI.clearCustomHostname(this.instance.id)
                        this.input.customHostname = ''
                        this.original.customHostname = ''
                        this.$emit('instance-updated')
                    } catch (err) {
                        // TODO: notify of failure to clear
                    }
                } else {
                    try {
                        this.checkingDomain = true
                        await instanceAPI.setCustomHostname(this.instance.id, domainName)
                        await this.checkCustomHostnameStatus()
                        this.original.customHostname = domainName
                        this.$emit('instance-updated')
                    } catch (err) {
                        this.errors.customHostname = 'domain not available'
                    }
                }
            })
        }
    }
}
</script>
