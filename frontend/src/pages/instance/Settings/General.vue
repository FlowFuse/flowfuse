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

        <FormRow v-model="input.stackDescription" type="uneditable">
            Stack
            <template #append>
                <div v-if="project.stack && project.stack.replacedBy">
                    <ff-button size="small" to="./danger">Update</ff-button>
                </div>
            </template>
        </FormRow>
        <FormRow v-model="input.templateName" type="uneditable">
            Template
        </FormRow>
        <DangerSettings
            :instance="project"
            @instance-confirm-delete="$emit('instance-confirm-delete')"
            @instance-confirm-suspend="$emit('instance-confirm-suspend')"
        />
    </div>
</template>

<script>

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
        project: {
            type: Object,
            required: true
        }
    },
    emits: ['instance-confirm-delete', 'instance-confirm-suspend'],
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
                templateName: ''
            },
            original: {
                projectName: ''
            }
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
            this.input.projectId = this.project.id
            if (this.project.stack) {
                this.input.stackDescription = this.project.stack.label || this.project.stack.name
            } else {
                this.input.stackDescription = 'none'
            }
            if (this.project.projectType) {
                this.input.projectTypeName = this.project.projectType.name
            } else {
                this.input.projectTypeName = 'none'
            }

            if (this.project.template) {
                this.input.templateName = this.project.template.name
            } else {
                this.input.templateName = 'none'
            }

            this.input.projectName = this.project.name
        }
    }
}
</script>
