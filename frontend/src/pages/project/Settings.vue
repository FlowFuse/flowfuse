<template>
    <SectionTopMenu hero="Application Settings" info="Live logs from your FlowForge instances of Node-RED"></SectionTopMenu>
    <div class="flex flex-col sm:flex-row mt-3 ml-6">
        <SectionSideMenu :options="sideNavigation" />
        <div class="space-y-6">
            <FormHeading class="mb-6">Application Details</FormHeading>
            <div class="space-y-6">
                <FormRow id="projectId" v-model="input.projectId" type="uneditable" inputClass="font-mono">
                    Application ID
                </FormRow>

                <FormRow id="projectName" v-model="input.projectName" type="uneditable">
                    Name
                </FormRow>
            </div>

            <FormHeading class="text-red-700">Delete Application</FormHeading>
            <div class="flex flex-col space-y-4 max-w-2xl lg:flex-row lg:items-center lg:space-y-0">
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
import FormHeading from '@/components/FormHeading'
import FormRow from '@/components/FormRow'
import SectionTopMenu from '@/components/SectionTopMenu'
import SectionSideMenu from '@/components/SectionSideMenu'
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
        project: {
            type: Object,
            required: true
        }
    },
    emits: ['application-delete'],
    data () {
        return {
            sideNavigation: [{ name: 'General', path: './settings' }],
            input: {
                projectName: this.project.name,
                projectId: this.project.id
            }
        }
    },
    watch: {
        project () {
            this.input.projectName = this.project.name
            this.input.projectId = this.project.id
        }
    }
}
</script>
