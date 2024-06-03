<template>
    <FormHeading class="mb-6">Instance Details</FormHeading>
    <div class="space-y-6">
        <FormRow id="projectId" v-model="input.projectId" type="uneditable" inputClass="font-mono">
            Instance ID
        </FormRow>

        <FormRow id="projectName" v-model="input.projectName" type="uneditable">
            Name
        </FormRow>

        <FormRow v-model="input.projectTypeName" type="uneditable">
            Instance Type
        </FormRow>

        <FormRow v-if="features.ha && input.haConfig" v-model="input.haConfig" type="uneditable">
            <template #default>High Availability</template>
            <template #input>
                <div class="w-full uneditable undefined text-gray-800">
                    {{ input.haConfig.replicas }} x instances
                </div>
            </template>
        </FormRow>
        <FormRow v-if="features.protectInstance && input.protectInstance" v-model="input.protectInstance" type="uneditable">
            <template #default>Instance Protected</template>
            <template #input>
                <div>
                    Protected {{ input.protectInstance.enabled }}
                </div>
            </template>
        </FormRow>
        <FormRow v-model="input.stackDescription" type="uneditable">
            Stack
        </FormRow>
        <FormRow v-model="input.templateName" type="uneditable">
            Template
        </FormRow>
        <FormHeading class="mb-6">Hosting</FormHeading>
        <FormRow v-model="url" type="uneditable">
            Default URL
        </FormRow>
        <div v-if="customHostnameAvailable">
            <FormRow v-model="input.customHostname" :error="errors.customHostname">
                Custom domain
                <template #description>
                    <p>
                        This allows you to access your instance from a custom domain or subdomain. This requires the DNS entry for the domain to
                        be updated to point at the FlowFuse platform.
                        For more information, see the <a class="ff-link" target="_blank" href="https://flowfuse.com/docs/cloud/introduction/#custom-hostnames">documentation</a>.
                    </p>
                </template>
                <template v-if="!customHostnameTeamAvailable" #input>
                    <FeatureUnavailableToTeam featureName="Custom domain name" />
                </template>
                <template v-else-if="!customHostnameLauncherVersion" #input>
                    To enable custom domains you will need to update to the latest
                    stack using the option below.
                </template>
                <template v-if="customHostnameLauncherVersion && customHostnameTeamAvailable" #append>
                    <ff-button size="small" data-action="save-hostname" kind="secondary" :disabled="!customHostnameValid" @click="saveCustomHostname()">Save</ff-button>
                </template>
            </FormRow>
            <p v-if="customHostnameLauncherVersion && customHostnameTeamAvailable && original.customHostname" class="text-xs pl-2 mt-1">
                <span v-if="checkingDomain">
                    <RefreshIcon class="w-4 inline" />
                    Checking domain status...
                </span>
                <span v-else-if="domainStatusValid" class="text-green-700">
                    <BadgeCheckIcon class="w-4 inline" /> DNS verified
                </span>
                <span v-else class="text-red-700">
                    <ExclamationIcon class="w-4 inline" />
                    DNS check failed
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
import { BadgeCheckIcon, ExclamationIcon, RefreshIcon } from '@heroicons/vue/solid'
import SemVer from 'semver'

import { mapState } from 'vuex'

import instanceAPI from '../../../api/instances.js'

import FormHeading from '../../../components/FormHeading.vue'
import FormRow from '../../../components/FormRow.vue'
import FeatureUnavailableToTeam from '../../../components/banners/FeatureUnavailableToTeam.vue'

import Dialog from '../../../services/dialog.js'

import DangerSettings from './Danger.vue'

export default {
    name: 'InstanceSettings',
    components: {
        BadgeCheckIcon,
        ExclamationIcon,
        RefreshIcon,
        FormRow,
        FormHeading,
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
    emits: ['instance-updated', 'instance-confirm-delete', 'instance-confirm-suspend'],
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
            domainStatusValid: false
        }
    },
    computed: {
        ...mapState('account', ['features', 'team']),
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
            return SemVer.satisfies(SemVer.coerce(launcherVersion), '>=2.4.0')
        }
    },
    watch: {
        project: 'fetchData',
        'input.customHostname': function (v) {
            v = v || ''
            const validChars = /^[a-zA-Z0-9-.]{1,253}\.?$/g
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
                this.errors.customHostname = 'Not a valid domain name'
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

            Dialog.show({
                header: 'Custom domain',
                kind: 'primary',
                html: 'Changing the custom domain for an instance will cause it to be restarted to enable the change.'
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
