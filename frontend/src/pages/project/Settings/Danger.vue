<template>
    <ff-loading v-if="loading.deleting" message="Deleting Project..." />
    <ff-loading v-if="loading.duplicating" message="Copying Project..." />
    <ff-loading v-if="loading.changingStack" message="Changing Stack..." />
    <form v-if="!isLoading" class="space-y-6">
        <FormHeading>Change Project Stack</FormHeading>
        <div class="flex flex-col lg:flex-row max-w-2xl space-y-4">
            <div class="flex-grow">
                <div class="max-w-sm pt-2">Changing the project stack requires the
                    project to be restarted. The flows will not be running whilst
                    this happens.
                </div>
            </div>
            <div class="min-w-fit flex-shrink-0">
                <ff-button kind="secondary" @click="showChangeStackDialog()">Change Project Stack</ff-button>
                <ChangeStackDialog @changeStack="changeStack" ref="changeStackDialog"/>
            </div>
        </div>

        <FormHeading>Export Project</FormHeading>
        <!-- Hiding for now (0.5) -->
        <!-- <div>
            <div>
                <ff-button kind="secondary" @click="showExportProjectDialog()">Export Project</ff-button>
                <ExportProjectDialog @exportProject="exportProject" ref="exportProjectDialog"/>
            </div>
            <div class="max-w-sm pt-2">Allows you to export a snapshot of the
                project's current state.</div>
        </div> -->

        <div class="flex flex-col lg:flex-row max-w-2xl space-y-4">
            <div class="flex-grow">
                <div class="max-w-sm pt-2">
                    Create a copy of this project.
                </div>
            </div>
            <div class="min-w-fit flex-shrink-0">
                <ff-button kind="secondary" @click="showDuplicateProjectDialog()">Copy Project</ff-button>
            </div>
        </div>

        <div class="flex flex-col lg:flex-row max-w-2xl space-y-4">
            <div class="flex-grow">
                <div class="max-w-sm pt-2">
                    Copy the project's state to an existing project.
                </div>
            </div>
            <div class="min-w-fit flex-shrink-0">
                <ff-button kind="secondary" @click="showExportToProjectDialog()">Export to existing project</ff-button>
                <ExportToProjectDialog @exportToProject="exportToProject" ref="exportToProjectDialog"/>
            </div>
        </div>

        <FormHeading class="text-red-700">Delete Project</FormHeading>
        <div class="flex flex-col lg:flex-row max-w-2xl space-y-4">
            <div class="flex-grow">
                <div class="max-w-sm pt-2">
                    Once deleted, your project is gone. This cannot be undone.
                </div>
            </div>
            <div class="min-w-fit flex-shrink-0">
                <ff-button kind="danger" @click="showConfirmDeleteDialog()">Delete Project</ff-button>
                <ConfirmProjectDeleteDialog @deleteProject="deleteProject" ref="confirmProjectDeleteDialog"/>
            </div>
        </div>
    </form>
</template>

<script>
import projectApi from '@/api/project'

import alerts from '@/services/alerts'

import FormHeading from '@/components/FormHeading'
import ConfirmProjectDeleteDialog from './dialogs/ConfirmProjectDeleteDialog'
import ChangeStackDialog from './dialogs/ChangeStackDialog'
// import ExportProjectDialog from './dialogs/ExportProjectDialog'
import ExportToProjectDialog from './dialogs/ExportToProjectDialog'
import { mapState } from 'vuex'

export default {
    name: 'ProjectSettingsDanger',
    props: ['project'],
    emits: ['projectUpdated'],
    computed: {
        ...mapState('account', ['team']),
        isLoading: function () {
            return this.loading.deleting || this.loading.changingStack || this.loading.duplicating
        }
    },
    data () {
        return {
            loading: {
                deleting: false,
                changingStack: false,
                duplicating: false
            }
        }
    },
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
            this.$router.push({
                name: 'CreateTeamProject',
                params: { team_slug: this.team.slug },
                query: { sourceProject: this.project.id }
            })
        },
        showExportToProjectDialog () {
            this.$refs.exportToProjectDialog.show(this.project)
        },
        exportProject (parts) {
            // call projectApi to generate zipped json
            projectApi.exportProject(this.project.id, parts)
        },
        duplicateProject (parts) {
            this.loading.duplicating = true
            projectApi.create(parts).then(result => {
                this.$router.push({ name: 'Project', params: { id: result.id } })
                alerts.emit('Project successfully duplicated.', 'confirmation')
            }).catch(err => {
                console.log(err)
                alerts.emit('Project failed to duplicate.', 'warning')
            }).finally(() => {
                this.loading.duplicating = false
            })
        },
        exportToProject (parts) {
            const options = {
                sourceProject: parts.sourceProject
            }
            projectApi.updateProject(parts.target, options)
        },
        deleteProject () {
            this.loading.deleting = true
            projectApi.deleteProject(this.project.id).then(() => {
                this.$router.push({ name: 'Home' })
                alerts.emit('Project successfully deleted.', 'confirmation')
            }).catch(err => {
                console.warn(err)
                alerts.emit('Project failed to delete.', 'warning')
            }).finally(() => {
                this.loading.deleting = false
            })
        },
        changeStack (selectedStack) {
            if (this.project.stack?.id !== selectedStack) {
                this.loading.changingStack = true
                projectApi.changeStack(this.project.id, selectedStack).then(() => {
                    this.$router.push({ name: 'Project', params: { id: this.project.id } })
                    this.$emit('projectUpdated')
                    alerts.emit('Project stack successfuly updated.', 'confirmation')
                }).catch(err => {
                    console.warn(err)
                    alerts.emit('Project stack was not updated due to an error.', 'warning')
                }).finally(() => {
                    this.loading.changingStack = false
                })
            }
        }
    },
    components: {
        FormHeading,
        ConfirmProjectDeleteDialog,
        ChangeStackDialog,
        // ExportProjectDialog,
        ExportToProjectDialog
    }
}
</script>
