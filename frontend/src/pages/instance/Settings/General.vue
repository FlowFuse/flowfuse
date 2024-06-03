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
            <div v-if="customHostnameLauncherVersion">
                <div v-if="customHostnameTeamAvailable">
                    <FormRow v-model="input.customHostname" :error="errors.customHostname">
                        Custom Hostname
                        <template #description>
                            <p>This needs to be a fully qualified hostname</p>
                            <p>Please refer to this documentation for details of how to configure your DNS</p>
                        </template>
                    </FormRow>
                    <div style="padding-top: 5px">
                        <ff-button size="small" data-action="save-hostname" kind="secondary" :disabled="customHostnameChanged" @click="showCustomHostnameDialog()">Save</ff-button>
                        <CustomHostnameDialog ref="customHostnameDialog" @confirm="saveCustomHostname" />
                    </div>
                </div>
                <FeatureUnavailableToTeam v-if="!customHostnameTeamAvailable" featureName="Instance Custom Domain Name" />
            </div>
            <div v-else>
                <p>To be able to use Custom Hostnames you will need to update your stack version.</p>
                <p>There should be a button below to do this.</p>
            </div>
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
import SemVer from 'semver'

import { mapState } from 'vuex'

import instanceAPI from '../../../api/instances.js'

import FormHeading from '../../../components/FormHeading.vue'
import FormRow from '../../../components/FormRow.vue'
import FeatureUnavailableToTeam from '../../../components/banners/FeatureUnavailableToTeam.vue'

import Dialog from '../../../services/dialog.js'

import DangerSettings from './Danger.vue'

import CustomHostnameDialog from './dialogs/CustomHostnameDialog.vue'

export default {
    name: 'InstanceSettings',
    components: {
        FormRow,
        FormHeading,
        FeatureUnavailableToTeam,
        DangerSettings,
        CustomHostnameDialog
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
            url: ''
        }
    },
    computed: {
        ...mapState('account', ['features', 'team']),
        isHA () {
            return !!this.instance?.ha
        },
        customHostnameChanged () {
            return this.original.customHostname === this.input.customHostname
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
                return false
            }

            // needs to be  v2.5.0 or better
            return SemVer.satisfies(SemVer.coerce(launcherVersion), '>=2.4.0')
        }
    },
    watch: {
        project: 'fetchData'
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
        },
        async showCustomHostnameDialog () {
            this.$refs.customHostnameDialog.show(this.instance)
        },
        async saveCustomHostname () {
            const validChars = /^[a-zA-Z0-9-.]{1,253}\.?$/g
            let isValid = true
            this.errors.customHostname = ''

            if (this.input.customHostname.trim().length === 0) {
                try {
                    await instanceAPI.clearCustomHostname(this.instance.id)
                    this.original.customHostname = this.input.customHostname
                    this.input.customHostname = ''
                    this.original.customHostname = ''
                    this.$router.push({ name: 'Instance', params: { id: this.instance.id } })
                    this.$emit('instance-updated')
                } catch (err) {
                    this.errors.customHostname = 'hostname not available'
                }
                return
            }

            // contains valid chars
            if (!validChars.test(this.input.customHostname)) {
                isValid = false
            }

            // doesn't end with '.'
            if (this.input.customHostname.endsWith('.')) {
                isValid = false
            }

            if (!isValid) {
                this.errors.customHostname = 'not a valid hostname'
            } else {
                try {
                    const response = await instanceAPI.setCustomHostname(this.instance.id, this.input.customHostname)
                    if (response) {
                        if (!response.found) {
                            // need to show alert about setting up DNS CNAME
                            const warning = {
                                header: 'Hostname DNS not configured',
                                kind: 'primary',
                                html: `<p><code>${this.input.customHostname}</code> does not resolve to <code>${response.cname}</code>, please add a CNAME entry to your DNS</p><p>See docs <a href="https://flowfuse.com/docs/cloud/introduction/#custom-hostnames">here</a></p>`,
                                confirmLabel: 'OK',
                                canBeCanceled: false
                            }
                            this.original.customHostname = this.input.customHostname
                            Dialog.show(warning, () => {
                                this.$router.push({ name: 'Instance', params: { id: this.instance.id } })
                                this.$emit('instance-updated')
                            })
                            return
                        }
                    }

                    this.$router.push({ name: 'Instance', params: { id: this.instance.id } })
                    this.$emit('instance-updated')
                } catch (err) {
                    this.errors.customHostname = 'hostname not available'
                }
            }
        }
    }
}
</script>
