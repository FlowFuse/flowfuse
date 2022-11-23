<template>
    <ff-loading v-if="loading.deleting" message="Deleting Project..." />
    <ff-loading v-if="loading.duplicating" message="Copying Project..." />
    <ff-loading v-if="loading.changingStack" message="Changing Stack..." />
    <ff-loading v-if="loading.settingType" message="Setting Type..." />
    <ff-loading v-if="loading.suspend" message="Suspending Project..." />
    <ff-loading v-if="loading.importing" message="Importing Project..." />
    <form v-if="!isLoading" class="space-y-6">
        <template v-if="!project.projectType">
            <FormHeading>Set Project Type</FormHeading>
            <div class="flex flex-col lg:flex-row max-w-2xl space-y-4">
                <div class="flex-grow">
                    <div class="max-w-sm pt-2 space-y-1">
                        <p>You need to pick a type for this
                            project before you can make any changes to its stack.</p>
                        <p>This is a one-time action - you cannot change the project type once it has been set.</p>
                    </div>
                </div>
                <div class="min-w-fit flex-shrink-0">
                    <ff-button kind="secondary" @click="showChangeTypeDialog()">Set Project Type</ff-button>
                    <ChangeTypeDialog @confirm="changeType" ref="changeTypeDialog"/>
                </div>
            </div>
        </template>
        <FormHeading>Change Project Stack</FormHeading>
        <div v-if="project.stack && project.stack.replacedBy" class="flex flex-col lg:flex-row max-w-2xl space-y-4">
            <div class="flex-grow">
                <div class="max-w-sm pt-2">There is a new version of the current stack available.
                    Updating the stack will restart the project.
                </div>
            </div>
            <div class="min-w-fit flex-shrink-0">
                <ff-button :disabled="!project.projectType" kind="secondary" @click="upgradeStack()">Update Stack</ff-button>
            </div>
        </div>
        <div class="flex flex-col lg:flex-row max-w-2xl space-y-4">
            <div class="flex-grow">
                <div class="max-w-sm pt-2">Changing the project stack requires the
                    project to be restarted. The flows will not be running whilst
                    this happens.
                </div>
            </div>
            <div class="min-w-fit flex-shrink-0">
                <ff-button :disabled="!project.projectType" kind="secondary" @click="showChangeStackDialog()">Change Stack</ff-button>
                <ChangeStackDialog @confirm="changeStack" ref="changeStackDialog"/>
            </div>
        </div>

        <FormHeading>Copy Project</FormHeading>
        <!-- Hiding for now (0.5) -->
        <!-- <div>
            <div>
                <ff-button kind="secondary" @click="showExportProjectDialog()">Export Project</ff-button>
                <ExportProjectDialog @confirm="exportProject" ref="exportProjectDialog"/>
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
                <ExportToProjectDialog @confirm="exportToProject" ref="exportToProjectDialog"/>
            </div>
        </div>

        <FormHeading>Import Project</FormHeading>

        <div class="flex flex-col lg:flex-row max-w-2xl space-y-4">
            <div class="flex-grow">
                <div class="max-w-sm pt-2">
                    Import an existing Node-RED project.
                </div>
            </div>
            <div class="min-w-fit flex-shrink-0">
                <ff-button kind="secondary" @click="showImportProjectDialog()">Import Project</ff-button>
                <ImportProjectDialog @confirm="importProject" ref="importProjectDialog"/>
            </div>
        </div>

        <FormHeading class="text-red-700">Suspend Project</FormHeading>
        <div class="flex flex-col lg:flex-row max-w-2xl space-y-4">
            <div class="flex-grow">
                <div class="max-w-sm pt-2" v-if="project?.meta?.state === 'suspended'">
                    Your project is already suspended. To restart the project, select "Start" from the Project actions.
                </div>
                <div class="max-w-sm pt-2" v-else>
                    Once suspended, your project will not be available until restarted. Whilst suspended, the project will consume no <span v-if="features.billing">billable</span> resources.
                </div>
            </div>
            <div class="min-w-fit flex-shrink-0">
                <ff-button kind="danger" :disabled="project?.meta?.state === 'suspended'" @click="showConfirmSuspendDialog()">Suspend Project</ff-button>
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
                <ff-button data-action="delete-project" kind="danger" @click="showConfirmDeleteDialog()">Delete Project</ff-button>
                <ConfirmProjectDeleteDialog data-el="delete-project" @confirm="deleteProject" ref="confirmProjectDeleteDialog"/>
            </div>
        </div>
    </form>
</template>

<script>
import projectApi from '@/api/project'

import Dialog from '@/services/dialog'
import alerts from '@/services/alerts'
import permissionsMixin from '@/mixins/Permissions'

import FormHeading from '@/components/FormHeading'
import ConfirmProjectDeleteDialog from './dialogs/ConfirmProjectDeleteDialog'
import ChangeStackDialog from './dialogs/ChangeStackDialog'
import ChangeTypeDialog from './dialogs/ChangeTypeDialog'
import ExportToProjectDialog from './dialogs/ExportToProjectDialog'
import ImportProjectDialog from './dialogs/ImportProjectDialog'
import { useRouter } from 'vue-router'
import { mapState } from 'vuex'

export default {
    name: 'ProjectSettingsDanger',
    props: ['project'],
    emits: ['projectUpdated'],
    mixins: [permissionsMixin],
    computed: {
        ...mapState('account', ['team', 'features', 'teamMembership']),
        isLoading () {
            return this.loading.deleting || this.loading.suspend || this.loading.changingStack || this.loading.duplicating || this.loading.settingType
        }
    },
    data () {
        return {
            loading: {
                settingType: false,
                deleting: false,
                changingStack: false,
                duplicating: false,
                suspend: false,
                importing: false
            }
        }
    },
    mounted () {
        this.checkAccess()
    },
    methods: {
        async checkAccess () {
            if (!this.hasPermission('project:edit')) {
                useRouter().push({ replace: true, path: 'general' })
            }
        },
        showConfirmDeleteDialog () {
            this.$refs.confirmProjectDeleteDialog.show(this.project)
        },
        showConfirmSuspendDialog () {
            Dialog.show({
                header: 'Suspend Project',
                text: 'Are you sure you want to suspend this project?',
                confirmLabel: 'Suspend',
                kind: 'danger'
            }, () => {
                this.loading.suspend = true
                projectApi.suspendProject(this.project.id).then(() => {
                    this.$router.push({ name: 'Home' })
                    alerts.emit('Project successfully suspended.', 'confirmation')
                }).catch(err => {
                    console.warn(err)
                    alerts.emit('Project failed to suspend.', 'warning')
                }).finally(() => {
                    this.loading.suspend = false
                })
            })
        },
        showChangeTypeDialog () {
            this.$refs.changeTypeDialog.show(this.project)
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
        showImportProjectDialog () {
            this.$refs.importProjectDialog.show(this.project)
        },
        upgradeStack () {
            this.changeStack(this.project.stack.replacedBy)
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
        importProject (parts) {
            this.loading.importing = true
            projectApi.importProject(this.project.id, parts).then(result => {
                this.$router.push({ name: 'Project', params: { id: this.project.id } })
                alerts.emit('Project flows imported.', 'confirmation')
            }).catch(err => {
                console.log(err)
                alerts.emit('Failed to import flows.', 'warning')
            }).finally(() => {
                this.loading.importing = false
            })
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
        changeType (selectedType) {
            if (!this.project.projectType && selectedType) {
                this.loading.settingType = true
                projectApi.updateProject(this.project.id, {
                    projectType: selectedType
                }).catch(err => {
                    console.warn(err)
                }).finally(() => {
                    this.$emit('projectUpdated')
                    this.loading.settingType = false
                })
            }
        },
        changeStack (selectedStack) {
            if (this.project.stack?.id !== selectedStack) {
                this.loading.changingStack = true
                projectApi.changeStack(this.project.id, selectedStack).then(() => {
                    this.$router.push({ name: 'Project', params: { id: this.project.id } })
                    this.$emit('projectUpdated')
                    alerts.emit('Project stack successfully updated.', 'confirmation')
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
        ChangeTypeDialog,
        // ExportProjectDialog,
        ExportToProjectDialog,
        ImportProjectDialog
    }
}
</script>
