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

import DangerSettings from './Danger.vue'

export default {
    name: 'InstanceSettings',
    components: {
        FormRow,
        FormHeading,
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
                haConfig: {}
            },
            original: {
                projectName: ''
            }
        }
    },
    computed: {
        ...mapState('account', ['features']),
        isHA () {
            return !!this.instance?.ha
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
        }
    }
}
</script>
