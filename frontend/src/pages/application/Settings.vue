<template>
    <SectionTopMenu hero="Application Settings" />
    <div class="flex flex-col sm:flex-row mt-9 ml-6" data-el="application-settings">
        <SectionSideMenu :options="sideNavigation" />
        <div class="space-y-6">
            <FormHeading class="mb-6">Application Details</FormHeading>
            <div class="space-y-6">
                <FormRow id="projectId" v-model="input.projectId" type="uneditable" inputClass="font-mono">
                    Application ID
                </FormRow>

                <FormRow id="projectName" ref="appName" v-model="input.projectName" data-form="application-name" :type="editing ? 'text' : 'uneditable'">
                    Name
                </FormRow>
            </div>
            <div class="space-x-4 whitespace-nowrap">
                <template v-if="!editing">
                    <ff-button kind="primary" data-action="application-edit" @click="editName">Edit Application Name</ff-button>
                </template>
                <template v-else>
                    <div class="flex gap-x-3">
                        <ff-button kind="secondary" @click="cancelEditName">Cancel</ff-button>
                        <ff-button kind="primary" :disabled="!formValid" data-form="submit" @click="saveApplication">Save</ff-button>
                    </div>
                </template>
            </div>

            <FormHeading class="text-red-700">Delete Application</FormHeading>
            <div class="flex flex-col space-y-4 max-w-2xl">
                <div class="flex-grow">
                    <div class="max-w-sm">
                        {{ getDeleteApplicationText }}
                    </div>
                </div>
                <div class="min-w-fit flex-shrink-0">
                    <ff-button data-action="delete-application" kind="danger" :disabled="options.instances > 0" @click="$emit('application-delete')">
                        Delete Application
                    </ff-button>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import ApplicationAPI from '../../api/application.js'

import FormHeading from '../../components/FormHeading.vue'
import FormRow from '../../components/FormRow.vue'
import SectionSideMenu from '../../components/SectionSideMenu.vue'
import SectionTopMenu from '../../components/SectionTopMenu.vue'

import permissionsMixin from '../../mixins/Permissions.js'
import Alerts from '../../services/alerts.js'

export default {
    name: 'ProjectSettings',
    components: {
        SectionTopMenu,
        SectionSideMenu,
        FormHeading,
        FormRow
    },
    mixins: [permissionsMixin],
    inheritAttrs: false,
    props: {
        application: {
            type: Object,
            required: true
        }
    },
    emits: ['application-delete', 'application-updated'],
    data () {
        return {
            sideNavigation: [{
                name: 'General',
                path: './settings'
            }],
            input: {
                projectName: this.application.name,
                projectId: this.application.id,
                application: this.application
            },
            editing: false,
            options: {
                instances: []
            }

        }
    },
    computed: {
        formValid () {
            return this.input.projectName
        },
        getDeleteApplicationText () {
            if (this.options.instances === 0) {
                return 'Once deleted, your application  permanently deleted. This cannot be undone.'
            } else {
                return 'Once you delete all your instances of this application, you can delete this application.'
            }
        }
    },
    mounted () {
        this.loadInstances(this.application.id)
    },
    methods: {
        loadInstances (applicationId) {
            ApplicationAPI.getApplicationInstances(applicationId)
                .then((instances) => {
                    this.options.instances = instances?.length || 0
                })
                .catch((error) => {
                    console.error(error)
                })
        },
        editName () {
            this.editing = true
            this.$refs.appName.focus()
        },
        cancelEditName () {
            this.editing = false
            // reset the field if changed
            this.input.projectName = this.application.name
        },
        saveApplication () {
            ApplicationAPI.updateApplication(
                this.application.id,
                this.input.projectName
            )
                .then(() => {
                    this.$emit('application-updated')
                    Alerts.emit('Application updated.', 'confirmation')
                })
                .finally(() => {
                    this.editing = false
                })
                .catch(() => {
                    Alerts.emit('Unable to update Application.', 'warning')
                })
        }
    }
}
</script>
