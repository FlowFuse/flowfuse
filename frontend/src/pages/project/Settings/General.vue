<template>
    <form class="space-y-6">
        <FormRow v-model="input.projectId" type="uneditable" id="projectId" inputClass="font-mono">
            Project ID
        </FormRow>

        <FormRow v-model="input.projectName" type="uneditable" id="projectName">
            Name
        </FormRow>

        <FormRow v-model="input.projectTypeName" type="uneditable">
            Project Type
        </FormRow>

        <FormRow v-model="input.stackDescription" type="uneditable">
            Stack
            <template v-slot:append>
                <div v-if="project.stack && project.stack.replacedBy">
                    <ff-button size="small" to="./danger">Update</ff-button>
                </div>
            </template>
        </FormRow>
        <FormRow v-model="input.templateName" type="uneditable">
            Template
        </FormRow>

        <FormRow
            v-model="input.hostname"
            placeholder="my-project.example.com"
            :disabled="!customHostnameEnabled"
            :type="hasPermission('project:edit') ? 'text' : 'uneditable'"
        >
            Hostname
            <template #description>
                <!-- todo: help docs / DNS guide link -->
                A <abbr title="Fully qualified domain name - e.g. somehost.example.com">FQDN</abbr> that the editor will be served at, this requires DNS setup.
            </template>
        </FormRow>

        <div
            v-if="hasPermission('project:edit')"
            class="space-x-4 whitespace-nowrap"
        >
            <ff-button
                size="small"
                :disabled="!formDirty"
                @click="saveSettings()"
            >
                Save
            </ff-button>
        </div>
    </form>
</template>

<script>
import { mapState } from 'vuex'

import projectApi from '@/api/project'
import FormRow from '@/components/FormRow'
import permissionsMixin from '@/mixins/Permissions'
import alerts from '@/services/alerts'

export default {
    name: 'ProjectSettings',
    components: {
        FormRow
    },
    mixins: [permissionsMixin],
    props: {
        project: {
            type: Object,
            required: true
        }
    },
    emits: ['projectUpdated'],
    data () {
        return {
            input: {
                projectId: '',
                projectName: '',
                projectTypeName: '',
                stackDescription: '',
                templateName: '',
                hostname: ''
            }
        }
    },
    computed: {
        ...mapState('account', ['teamMembership', 'features']),
        formDirty () {
            return this.customHostnameDirty
        },
        customHostnameDirty: function () {
            // Todo project.hostname doesn't exist yet...
            return (this.input.hostname || '') !== (this.project.hostname || '')
        },
        customHostnameEnabled () {
            return this.features['project-custom-domain']
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

            this.input.hostname = this.project.hostname // to-do: doesn't exist yet
        },
        async saveSettings () {
            if (!this.formDirty) {
                return
            }

            const hostnameChanged = this.customHostnameDirty

            // to-do: add validation that hostname is a FQDN and is unique

            // only hostname can be updated for now
            await projectApi.updateProject(this.project.id, { hostname: this.input.hostname })
            alerts.emit('Project successfully updated.', 'confirmation')

            if (hostnameChanged) {
                setTimeout(() => {
                    alerts.emit('Project hostname has been updated, updates will only be applied after a restart.', 'warning', 7000)
                }, 3000)
            }

            this.$emit('projectUpdated')
        }
    }
}
</script>
