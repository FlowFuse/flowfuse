<template>
    <form class="space-y-4" data-el="http-auth" @submit.prevent>
        <template v-if="device">
            <FormHeading>Node-RED Local Login</FormHeading>
            <FormRow v-model="editable.settings.localAuth_enabled" containerClass="none" type="checkbox" :disabled="!editTemplate && !editable.policy.localAuth_enabled">
                Allow offline access
                <template #description>
                    <div>
                        Permits local login at <span class="font-mono font-bold">http://&lt;host&gt;/device-editor</span>
                    </div>
                    <div v-if="!localAuthSupported">
                        This feature requires Device Agent v3.2.0 or later
                    </div>
                    <div v-if="editable.settings.localAuth_enabled" class="text-red-400">
                        NOTE: Local login is not recommended for day-to-day use.
                    </div>
                </template>
            </FormRow>
            <template v-if="editable.settings.localAuth_enabled">
                <div class="flex flex-col sm:flex-row sm:ml-4">
                    <div class="space-y-4 w-full max-w-md sm:mr-8">
                        <FormRow v-model="editable.settings.localAuth_user" :disabled="!editTemplate && !editable.policy.localAuth_user" :type="(editTemplate||editable.policy.localAuth_user)?'text':'uneditable'" :error="editable.errors.localAuth_user">
                            Username
                            <template #append><ChangeIndicator :value="editable.changed.settings.localAuth_user" /></template>
                        </FormRow>
                    </div>
                    <LockSetting v-model="editable.policy.localAuth_user" class="flex justify-end flex-col" :editTemplate="editTemplate" :changed="editable.changed.policy.localAuth_user" />
                </div>
                <div class="flex flex-col sm:flex-row sm:ml-4">
                    <div class="space-y-4 w-full max-w-md sm:mr-8">
                        <FormRow v-model="editable.settings.localAuth_pass" :disabled="!editTemplate && !editable.policy.localAuth_pass" :type="(editTemplate||editable.policy.localAuth_pass)?'password':'uneditable'" :error="editable.errors.localAuth_pass">
                            Password
                            <template #append><ChangeIndicator :value="editable.changed.settings.localAuth_pass" /></template>
                        </FormRow>
                    </div>
                    <LockSetting v-model="editable.policy.localAuth_pass" class="flex justify-end flex-col" :editTemplate="editTemplate" :changed="editable.changed.policy.localAuth_pass" />
                </div>
            </template>
        </template>
        <template v-if="corsAvailable">
            <FormHeading>HTTP Node CORS</FormHeading>
            <div class="flex flex-col sm:flex-row sm:ml-4">
                <div class="space-y-4 w-full max-w-md sm:mr-8">
                    <FormRow v-model="editable.settings.httpNodeCORS_enabled" type="checkbox" :disabled="!editTemplate && !editable.policy.httpNodeCORS">
                        Enable CORS handling
                        <template #description>Select How resources can be shared with other hosts</template>
                        <template #append><ChangeIndicator :value="editable.changed.settings.httpNodeCORS_enabled" /></template>
                    </FormRow>
                </div>
                <LockSetting v-model="editable.policy.httpNodeCORS" class="flex justify-end flex-col" :editTemplate="editTemplate" :changed="editable.changed.policy.httpNodeCORS" />
            </div>
            <div v-if="editable.settings.httpNodeCORS_enabled" class="flex flex-col gap-3 ml-5">
                <div class="flex flex-col sm:flex-row">
                    <div class="w-full sm:mr-8">
                        <FormRow v-model="editable.settings.httpNodeCORS_origin" :disabled="!editTemplate && !editable.policy.httpNodeCORS" :error="editable.errors.httpNodeCORS_origin" :type="(editTemplate||editable.policy.httpNodeCORS)?'text':'uneditable'">
                            Allowed Origin
                            <template #description>
                                The allowed URL or * for all
                            </template>
                            <template #append><ChangeIndicator :value="editable.changed.settings.httpNodeCORS_origin" /></template>
                        </FormRow>
                    </div>
                </div>

                <div class="flex flex-row">
                    <div class="flex flex-col">
                        <div class="flex flex-col sm:flex-row">
                            <div class="w-full sm:mr-8">
                                <FormRow v-model="editable.settings.httpNodeCORS_GET" type="checkbox" :disabled="!editTemplate && !editable.policy.httpNodeCORS">
                                    GET
                                    <template #description>
                                        Allow GET requests
                                    </template>
                                    <template #append><ChangeIndicator :value="editable.changed.settings.httpNodeCORS_GET" /></template>
                                </FormRow>
                            </div>
                        </div>
                        <div class="flex flex-col sm:flex-row">
                            <div class="w-full sm:mr-8">
                                <FormRow v-model="editable.settings.httpNodeCORS_POST" type="checkbox" :disabled="!editTemplate && !editable.policy.httpNodeCORS">
                                    POST
                                    <template #description>
                                        Allow POST requests
                                    </template>
                                    <template #append><ChangeIndicator :value="editable.changed.settings.httpNodeCORS_POST" /></template>
                                </FormRow>
                            </div>
                        </div>
                        <div class="flex flex-col sm:flex-row">
                            <div class="w-full sm:mr-8">
                                <FormRow v-model="editable.settings.httpNodeCORS_PUT" type="checkbox" :disabled="!editTemplate && !editable.policy.httpNodeCORS">
                                    PUT
                                    <template #description>
                                        Allow PUT requests
                                    </template>
                                    <template #append><ChangeIndicator :value="editable.changed.settings.httpNodeCORS_PUT" /></template>
                                </FormRow>
                            </div>
                        </div>
                    </div>

                    <div class="flex flex-col">
                        <div class="flex flex-col sm:flex-row">
                            <div class="w-full sm:mr-8">
                                <FormRow v-model="editable.settings.httpNodeCORS_PATCH" type="checkbox" :disabled="!editTemplate && !editable.policy.httpNodeCORS">
                                    PATCH
                                    <template #description>
                                        Allow PATCH requests
                                    </template>
                                    <template #append><ChangeIndicator :value="editable.changed.settings.httpNodeCORS_PATCH" /></template>
                                </FormRow>
                            </div>
                        </div>
                        <div class="flex flex-col sm:flex-row">
                            <div class="w-full sm:mr-8">
                                <FormRow v-model="editable.settings.httpNodeCORS_HEAD" type="checkbox" :disabled="!editTemplate && !editable.policy.httpNodeCORS">
                                    HEAD
                                    <template #description>
                                        Allow HEAD requests
                                    </template>
                                    <template #append><ChangeIndicator :value="editable.changed.settings.httpNodeCORS_HEAD" /></template>
                                </FormRow>
                            </div>
                        </div>
                        <div class="flex flex-col sm:flex-row">
                            <div class="w-full sm:mr-8">
                                <FormRow v-model="editable.settings.httpNodeCORS_DELETE" type="checkbox" :disabled="!editTemplate && !editable.policy.httpNodeCORS">
                                    DELETE
                                    <template #description>
                                        Allow DELETE requests
                                    </template>
                                    <template #append><ChangeIndicator :value="editable.changed.settings.httpNodeCORS_DELETE" /></template>
                                </FormRow>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </template>
        <template v-else-if="!device && !corsAvailable && instance">
            <FormHeading>HTTP Node CORS</FormHeading>
            <FeatureUnavailable>
                <template #default>
                    <p class="flex gap-3 items-center">This requires latest version of the Node-RED, please <ff-button size="small" to="../general?highlight=updateStack">Update</ff-button></p>
                </template>
            </FeatureUnavailable>
            <div class="flex flex-col sm:flex-row sm:ml-4">
                <div class="space-y-4 w-full max-w-md sm:mr-8">
                    <FormRow v-model="editable.settings.httpNodeCORS_enabled" type="checkbox" :disabled="true">
                        Enable CORS handling
                        <template #description>Select How resources can be shared with other hosts</template>
                        <template #append><ChangeIndicator :value="editable.changed.settings.httpNodeCORS_enabled" /></template>
                    </FormRow>
                </div>
                <LockSetting v-model="editable.policy.httpNodeCORS" class="flex justify-end flex-col" :editTemplate="editTemplate" :changed="editable.changed.policy.httpNodeCORS" />
            </div>
        </template>
        <FormHeading>HTTP Node Security</FormHeading>
        <div class="flex flex-col sm:flex-row sm:ml-4">
            <div class="space-y-4 w-full max-w-md sm:mr-8">
                <FormRow>
                    <template #description>Select the type of security to apply to all http routes served by the Node-RED flows. This includes all HTTP In nodes and Node-RED Dashboard.</template>
                    <template #input>&nbsp;</template>
                </FormRow>
            </div>
            <LockSetting v-model="editable.policy.httpNodeAuth_type" class="flex justify-end flex-col" :editTemplate="editTemplate" :changed="editable.changed.policy.httpNodeAuth_type" />
        </div>
        <ff-radio-group v-model="editable.settings.httpNodeAuth_type" orientation="vertical" :options="authOptions1" />
        <template v-if="editable.settings?.httpNodeAuth_type === 'basic'">
            <div class="flex flex-col sm:flex-row sm:ml-4">
                <div class="space-y-4 w-full max-w-md sm:mr-8">
                    <FormRow v-model="editable.settings.httpNodeAuth_user" :disabled="editable.settings.httpNodeAuth_type !=='basic' || !editTemplate && !editable.policy.httpNodeAuth_user" :type="(editTemplate||editable.policy.httpNodeAuth_user)?'text':'uneditable'">
                        HTTP Auth Username
                        <template #append><ChangeIndicator :value="editable.changed.settings.httpNodeAuth_user" /></template>
                    </FormRow>
                </div>
                <LockSetting v-model="editable.policy.httpNodeAuth_user" class="flex justify-end flex-col" :editTemplate="editTemplate" :changed="editable.changed.policy.httpNodeAuth_user" />
            </div>
            <div class="flex flex-col sm:flex-row sm:ml-4">
                <div class="space-y-4 w-full max-w-md sm:mr-8">
                    <FormRow v-model="editable.settings.httpNodeAuth_pass" :disabled="editable.settings.httpNodeAuth_type !=='basic' || !editTemplate && !editable.policy.httpNodeAuth_pass" :type="(editTemplate||editable.policy.httpNodeAuth_pass)?'password':'uneditable'">
                        HTTP Auth Password
                        <template #append><ChangeIndicator :value="editable.changed.settings.httpNodeAuth_pass" /></template>
                    </FormRow>
                </div>
                <LockSetting v-model="editable.policy.httpNodeAuth_pass" class="flex justify-end flex-col" :editTemplate="editTemplate" :changed="editable.changed.policy.httpNodeAuth_pass" />
            </div>
        </template>
        <FeatureUnavailableToTeam v-if="!ffAuthFeatureAvailable" featureName="FlowFuse User Authentication" />
        <ff-radio-group v-model="editable.settings.httpNodeAuth_type" data-el="http-auth-option-ff" orientation="vertical" :options="authOptions2" />
    </form>
</template>

<script>
import semver from 'semver'

import FormHeading from '../../../../components/FormHeading.vue'
import FormRow from '../../../../components/FormRow.vue'
import FeatureUnavailable from '../../../../components/banners/FeatureUnavailable.vue'
import FeatureUnavailableToTeam from '../../../../components/banners/FeatureUnavailableToTeam.vue'
import ChangeIndicator from '../components/ChangeIndicator.vue'
import LockSetting from '../components/LockSetting.vue'

export default {
    name: 'TemplateSettingsSecurity',
    components: {
        FormRow,
        FormHeading,
        LockSetting,
        ChangeIndicator,
        FeatureUnavailable,
        FeatureUnavailableToTeam
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
        team: {
            type: Object,
            default: null
        },
        device: {
            type: Object,
            default: null
        },
        instance: {
            type: Object,
            default: null
        }
    },
    emits: ['update:modelValue'],
    computed: {
        editable: {
            get () {
                return this.modelValue
            },
            set (localValue) {
                this.$emit('update:modelValue', localValue)
            }
        },
        ffAuthFeatureAvailable () {
            if (!this.team) {
                // If on the Admin Template view, then this option is available
                return true
            }
            const flag = this.team.type.properties.features?.teamHttpSecurity
            return flag === undefined || flag
        },
        localAuthSupported () {
            if (!this.device) {
                return false // not a device!
            }
            if (!this.device.agentVersion) {
                // Device has not called home yet - so we don't know what agent
                // version it is running.
                return false
            }
            return semver.gte(this.device.agentVersion, '3.2.0')
        },
        corsAvailable () {
            if (this.device) {
                return false
            }

            // template
            if (!this.instance) {
                return true
            } else {
                const launcherVersion = this.instance.meta?.versions?.launcher
                if (launcherVersion) {
                    return semver.gte(launcherVersion, '2.21.0')
                } else {
                    return false
                }
            }
        },
        authOptions1 () {
            return [
                {
                    label: 'None',
                    value: 'none',
                    disabled: !this.editTemplate && !this.editable.policy.httpNodeAuth_type,
                    description: 'Anyone is able to access the http routes of the application instance'
                },
                {
                    label: 'Basic Authentication',
                    value: 'basic',
                    disabled: !this.editTemplate && !this.editable.policy.httpNodeAuth_type,
                    description: 'Require a username/password to be provided'
                }
            ]
        },
        authOptions2 () {
            return [
                {
                    label: 'FlowFuse User Authentication',
                    value: 'flowforge-user',
                    disabled: !this.ffAuthFeatureAvailable || (!this.editTemplate && !this.editable.policy.httpNodeAuth_type),
                    description: 'Only members of the instance\'s team will be able to access the routes'
                }
            ]
        }
    }
}
</script>
