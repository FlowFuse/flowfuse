<template>
    <SectionTopMenu hero="Application Settings" />
    <div class="flex flex-col sm:flex-row mt-9 ml-6">
        <SectionSideMenu :options="sideNavigation" />
        <div class="space-y-6">
            <FormHeading class="mb-6">Application Details</FormHeading>
            <div class="space-y-6">
                <FormRow id="projectId" v-model="input.projectId" type="uneditable" inputClass="font-mono">
                    Application ID
                </FormRow>

                <FormRow ref="appName" id="projectName" v-model="input.projectName" :type="editing ? 'text' : 'uneditable'">
                    Name
                </FormRow>
            </div>
            <div class="space-x-4 whitespace-nowrap">
                <template v-if="!editing">
                    <ff-button kind="primary" @click="editName">Edit Application Name</ff-button>
                </template>
                <template v-else>
                    <div class="flex gap-x-3">
                        <ff-button kind="secondary" @click="cancelEditName">Cancel</ff-button>
                        <ff-button kind="primary" :disabled="!formValid" @click="saveApplication">Save</ff-button>
                    </div>
                </template>
            </div>

            <FormHeading class="text-red-700">Delete Application</FormHeading>
            <div class="flex flex-col space-y-4 max-w-2xl">
                <div class="flex-grow">
                    <div class="max-w-sm">
                        Once deleted, your application and all it's instances are permanently deleted. This cannot be undone.
                    </div>
                </div>
                <div class="min-w-fit flex-shrink-0">
                    <ff-button data-action="delete-application" kind="danger" @click="$emit('application-delete')">Delete Application</ff-button>
                </div>
            </div>
        </div>
    </div>
</template>

<script>

import ApplicationAPI from '@/api/application'
import Alerts from '@/services/alerts'

import FormHeading from '@/components/FormHeading'
import FormRow from '@/components/FormRow'
import SectionSideMenu from '@/components/SectionSideMenu'
import SectionTopMenu from '@/components/SectionTopMenu'
import permissionsMixin from '@/mixins/Permissions'

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
            sideNavigation: [{ name: 'General', path: './settings' }],
            input: {
                projectName: this.application.name,
                projectId: this.application.id
            },
            editing: false
        }
    },
    watch: {
        project () {
            this.input.projectName = this.application.name
            this.input.projectId = this.application.id
        }
    },
    computed: {
        formValid () {
            return this.input.projectName
        }
    },
    methods: {
        editName () {
            this.editing = true
            this.$refs.appName.focus()
        },
        saveApplication () {
            ApplicationAPI.updateApplication(this.application.id, this.input.projectName)
                .then(() => {
                    this.$emit('application-updated')
                    Alerts.emit('Application updated.', 'confirmation')
                })
                .catch(() => {
                    Alerts.emit('Unable to update Application.', 'warning')
                })
                .finally(() => {
                    this.editing = false
                })
        }
    }
}
</script>
