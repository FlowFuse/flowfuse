<template>
    <div class="flex flex-col sm:flex-row">
        <SectionSideMenu :options="sideNavigation" />
        <div class="flex-grow">
            <FormHeading class="mb-6">Project Details</FormHeading>
            <div class="space-y-6">
                <FormRow id="projectId" v-model="input.projectId" type="uneditable" inputClass="font-mono">
                    Project ID
                </FormRow>

                <FormRow id="projectName" v-model="input.projectName" type="uneditable">
                    Name
                </FormRow>
            </div>
        </div>
    </div>
</template>

<script>
import FormHeading from '@/components/FormHeading'
import FormRow from '@/components/FormRow'
import SectionSideMenu from '@/components/SectionSideMenu'
import permissionsMixin from '@/mixins/Permissions'

export default {
    name: 'ProjectSettings',
    components: {
        SectionSideMenu,
        FormHeading,
        FormRow
    },
    mixins: [permissionsMixin],
    props: {
        project: {
            type: Object,
            required: true
        }
    },
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
