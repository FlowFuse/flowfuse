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
        <FormRow v-model="instance.url" type="uneditable">
            Default URL
        </FormRow>
        <div v-if="customHostnameAvailable">
        <FormRow v-if="customHostnameTeamAvailable" v-model="input.hostname" :error="errors.hostname">
            Custom Hostname
            <template #description>
                <p>This needs to be a fully qualified hostname</p>
                <p>Please refer to this documentation for details of how to configure your DNS</p>
            </template>
            <template #append>
                <ff-button data-action="save-hostname" kind="secondary" @click="saveHostname()">Update</ff-button>
                <ChangeIndicator :value="changed.hostname" />
            </template>
        </FormRow>
        <FeatureUnavailableToTeam v-if="!customHostnameTeamAvailable" featureName="Instance Custom Domain Name"/>
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
import { mapState } from 'vuex'

import FormHeading from '../../../components/FormHeading.vue'
import FormRow from '../../../components/FormRow.vue'
import FeatureUnavailableToTeam from '../../../components/banners/FeatureUnavailableToTeam.vue'
import ChangeIndicator from '../../admin/Template/components/ChangeIndicator.vue'

import DangerSettings from './Danger.vue'

export default {
    name: 'InstanceSettings',
    components: {
        FormRow,
        FormHeading,
        FeatureUnavailableToTeam,
        DangerSettings,
        ChangeIndicator
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
                hostname: ''
            },
            original: {
                projectName: '',
                hostname: ''
            },
            changed: {
                hostname: false
            },
            errors: {
                hostname: ''
            }
        }
    },
    computed: {
        ...mapState('account', ['features', 'team']),
        isHA () {
            return !!this.instance?.ha
        },
        customHostnameAvailable () {
            const available = this.features.customHostnames
            return available
        },
        customHostnameTeamAvailable () {
            const available = this.features.customHostnames && this.team.type.properties.features?.customHostnames
            return available
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

            this.input.hostname = this.instance.hostname
            this.original.hostname = this.instance.hostname
        },
        saveHostname () {
            const validChars = /^[a-zA-Z0-9-.]{1,253}\.?$/g
            let isValid = true
            this.errors.hostname = ''

            // contains valid chars
            if (!validChars.test(this.input.hostname)) {
                isValid = false
            }

            // doesn't end with '.'
            if (this.input.hostname.endsWith('.')) {
                isValid = false
            }

            if (!isValid) {
                this.errors.hostname = "not a valid hostname"
            } else {
                console.log('all good')
            }
        }
    }
}
</script>
