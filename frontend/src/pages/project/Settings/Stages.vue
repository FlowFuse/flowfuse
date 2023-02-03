<template>
    <FormHeading>Pipeline Stages</FormHeading>
    <FormRow>
        <template #description>
            <p class="mb-3">Here, you can configure a "Stage". This will enable you to deploy the updates to this project, directly onto the next "Stage" in your development Pipeline.</p>
            <p class="">This feature is often used to create a Dev > Staging > Production pipeline, where each Stage of your pipeline is a standalone Project.</p>
        </template>
        <template #input>&nbsp;</template>
    </FormRow>

    <FormRow v-model="input.target" :options="projects" data-el="target-project">
        <template v-slot:default>Target Project</template>
    </FormRow>

    <div class="mt-6 flex gap-4">
        <ff-button :disabled="!input.target || loading" @click="deploy()" data-action="push-stage">
            {{ deploying ? 'Pushing Stage...' : 'Push to Stage' }}
        </ff-button>
        <ff-button kind="secondary" :to="{name: 'Project', params: { 'id': input.target }}" :disabled="!input.target" data-action="view-target-project">
            View Target Project
        </ff-button>
    </div>
</template>

<script>
import Alerts from '@/services/alerts'
import Dialog from '@/services/dialog'

import ProjectAPI from '@/api/project'
import TeamAPI from '@/api/team'

import FormHeading from '@/components/FormHeading'
import FormRow from '@/components/FormRow'

export default {
    name: 'ProjectSettingsStages',
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
            const msg = {
                header: 'Push to Stage',
                html: '<p>Are you sure you want to push to your target project?</p><p>This will copy over all flows, nodes and credentials from this project.</p><p>It will also transfer the keys of any newly created Environment Variables that your target project does not currently have.</p>'
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

                const target = this.input.target
                const source = {
                    id: this.project.id,
                    options: { ...this.parts }
                }

                await ProjectAPI.updateProject(target, { sourceProject: source })

                this.deploying = false
                Alerts.emit(`Project successfully pushed to ${target}.`, 'confirmation')
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
                            value: projectList.projects[i].id
                        })
                    }
                }
            }
        }
    },
    components: {
        FormHeading,
        FormRow
    }
}
</script>
