<template>
    <form class="space-y-6">
        <FormHeading>Change Project Stack</FormHeading>
        <div class="flex">
            <div class="max-w-sm pr-2">Changing the project stack requires the
                project to be restarted. The flows will not be running whilst
                this happens.</div>
            <div class="pl-2">
                <ff-button kind="secondary" @click="showChangeStackDialog()">Change Project Stack</ff-button>
                <ChangeStackDialog @changeStack="changeStack" ref="changeStackDialog"/>
            </div>
        </div>

        <FormHeading>Export Project</FormHeading>
        <div class="flex">
            <div class="max-w-sm pr-2">Allows you to export a snapshot of the
                project's current state.</div>
            <div class="pl-2">
                <ff-button kind="secondary" @click="showExportProjectDialog()">Export Project</ff-button>
                <ExportProjectDialog @exportProject="exportProject" ref="exportProjectDialog"/>
            </div>
        </div>

        <div class="flex">
            <div class="max-w-sm pr-2">Allows you to use a snapshot of the
                project's current state to create a new project.</div>
            <div class="pl-2">
                <ff-button kind="secondary" @click="showDuplicateProjectDialog()">Duplicate Project</ff-button>
                <DuplicateProjectDialog @duplicateProject="duplicateProject" ref="duplicateProjectDialog"/>
            </div>
        </div>

        <FormHeading class="text-red-700">Delete Project</FormHeading>
        <div class="flex">
            <div class="max-w-sm pr-2">Once deleted, your project is gone. This cannot be undone.</div>
            <div class="pl-2">
                <ff-button kind="danger" @click="showConfirmDeleteDialog()">Delete Project</ff-button>
                <ConfirmProjectDeleteDialog @deleteProject="deleteProject" ref="confirmProjectDeleteDialog"/>
            </div>
        </div>
    </form>
</template>

<script>
import projectApi from '@/api/project'
import FormHeading from '@/components/FormHeading'
import ConfirmProjectDeleteDialog from './dialogs/ConfirmProjectDeleteDialog'
import ChangeStackDialog from './dialogs/ChangeStackDialog'
import ExportProjectDialog from './dialogs/ExportProjectDialog'
import DuplicateProjectDialog from './dialogs/DuplicateProjectDialog'

export default {
    name: 'ProjectSettingsDanger',
    props: ['project'],
    methods: {
        showConfirmDeleteDialog () {
            this.$refs.confirmProjectDeleteDialog.show(this.project)
        },
        showChangeStackDialog () {
            this.$refs.changeStackDialog.show(this.project)
        },
        showExportProjectDialog () {
            this.$refs.exportProjectDialog.show(this.project)
        },
        showDuplicateProjectDialog () {
            this.$refs.duplicateProjectDialog.show(this.project)
        },
        exportProject (parts) {
            // call projectApi to generate zipped json
            projectApi.exportProject(this.project.id, parts)
        },
        duplicateProject (parts) {
            console.log('copy project', parts)
            projectApi.create(parts).then(result => {
                console.log(result)
                console.log(result.id)
                console.log(result.name)
                this.$router.push({ name: 'Project', params: { id: result.id } })
            }).catch(err => {
                console.log(err)
            })
        },
        deleteProject () {
            projectApi.deleteProject(this.project.id).then(() => {
                this.$router.push({ name: 'Home' })
            }).catch(err => {
                console.warn(err)
            })
        },
        changeStack (selectedStack) {
            if (this.project.stack.id !== selectedStack) {
                projectApi.changeStack(this.project.id, selectedStack).then(() => {
                    this.$router.push({ name: 'Project', params: { id: this.project.id } })
                    this.$emit('projectUpdated')
                }).catch(err => {
                    console.warn(err)
                })
            }
        }
    },
    components: {
        FormHeading,
        ConfirmProjectDeleteDialog,
        ChangeStackDialog,
        ExportProjectDialog,
        DuplicateProjectDialog
    }
}
</script>
