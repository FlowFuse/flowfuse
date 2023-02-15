<template>
    <FormHeading>DevOps Pipeline</FormHeading>
    <FormRow>
        <template #description>
            <p class="mb-3">Here, you can configure the next stage in your DevOps Pipeline. You can deploy changes made to this project, directly onto the next stage in your DevOps Pipeline.</p>
            <p class="">This feature is often used to create a Dev > Staging > Production pipeline, where each stage of your pipeline is a standalone FlowForge Project.</p>
            <p class="">Changes are only pushed to the next stage upon manual actioning of the "Push" button below.</p>
        </template>
        <template #input>&nbsp;</template>
    </FormRow>

    <FormRow v-model="input.target" :options="projects" data-el="target-project">
        <template #default>Target Project</template>
    </FormRow>

    <div class="mt-6 flex gap-4">
        <ff-button :disabled="!input.target || loading" data-action="push-stage" @click="deploy()">
            {{ deploying ? `Pushing to "${input.target.name}"...` : 'Push to Stage' }}
        </ff-button>
        <ff-button kind="secondary" :to="{name: 'Project', params: { 'id': input.target?.id }}" :disabled="!input.target" data-action="view-target-project">
            View Target Project
        </ff-button>
    </div>
</template>

<script>

import ProjectAPI from '@/api/project'
import TeamAPI from '@/api/team'

import FormHeading from '@/components/FormHeading'
import FormRow from '@/components/FormRow'
import Alerts from '@/services/alerts'
import Dialog from '@/services/dialog'

export default {
    name: 'ProjectSettingsStages',
    components: {
        FormHeading,
        FormRow
    },
    props: ['project'],
    data: function () {
        return {
            projects: [],
            deploying: false,
            input: {
                target: null
            }
        }
    },
    watch: {
        project: function () {
            this.loadProjects()
        }
    },
    mounted () {
        this.loadProjects()
    },
    methods: {
        async deploy () {
            const target = this.input.target
            const msg = {
                header: `Push to "${target.name}"`,
                html: `<p>Are you sure you want to push to "${target.name}"?</p><p>This will copy over all flows, nodes and credentials from "${this.project.name}".</p><p>It will also transfer the keys of any newly created Environment Variables that your target project does not currently have.</p>`
            }

            Dialog.show(msg, async () => {
                this.deploying = true
                // settings for when we deploy to a new stage
                this.parts = {
                    flows: true,
                    credentials: true,
                    template: false,
                    nodes: true,
                    settings: false,
                    envVars: 'keys'
                }

                const source = {
                    id: this.project.id,
                    options: { ...this.parts }
                }

                await ProjectAPI.updateProject(target.id, { sourceProject: source })

                this.deploying = false
                Alerts.emit(`Project successfully pushed "${this.project.name}" to "${target.name}".`, 'confirmation')
            })
        },
        async loadProjects () {
            if (this.project && this.project.team) {
                const projectList = await TeamAPI.getTeamProjects(this.project.team.id)
                this.projects = []
                for (let i = 0; i < projectList.count; i++) {
                    if (this.project.id !== projectList.projects[i].id) {
                        this.projects.push({
                            label: projectList.projects[i].name,
                            value: {
                                id: projectList.projects[i].id,
                                name: projectList.projects[i].name
                            }
                        })
                    }
                }
            }
        }
    }
}
</script>
