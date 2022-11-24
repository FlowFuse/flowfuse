<template>
    <ff-dialog
        ref="dialog"
        header="Export to Existing Project"
        confirm-label="Export to Existing Project"
        class="ff-dialog-fixed-height"
        :disable-primary="!exportEnabled"
        @confirm="confirm()"
    >
        <template v-slot:default>
            <form class="space-y-6" @submit.prevent>
                <FormRow>
                    Select the components to copy over to the new project
                    <template #input>
                        <ExportProjectComponents id="exportSettings" v-model="parts" showTemplate="true" showSettings="true" />
                    </template>
                </FormRow>
                <FormRow v-model="input.target" :options="projects">
                    <template v-slot:default>Target Project</template>
                </FormRow>
                <FormRow type="checkbox" v-model="input.exportConfirm">
                    Confirm export
                    <template v-slot:description>
                        The target project will be restarted once the export is complete.
                    </template>
                </FormRow>
            </form>
        </template>
    </ff-dialog>
</template>

<script>

import teamApi from '@/api/team'

import FormRow from '@/components/FormRow'
import ExportProjectComponents from '../../components/ExportProjectComponents'

export default {
    name: 'DuplicateProjectDialog',
    emits: ['confirm'],
    components: {
        FormRow,
        ExportProjectComponents
    },
    computed: {
        exportEnabled () {
            return this.input.exportConfirm && this.input.target
        }
    },
    data () {
        return {
            projects: [],
            input: {
                target: '',
                team: '',
                stack: '',
                template: '',
                exportConfirm: false
            },
            parts: {
                flows: true,
                credentials: true,
                template: true,
                nodes: true,
                settings: false,
                envVars: 'all'
            }
        }
    },
    methods: {
        confirm () {
            if (this.exportEnabled) {
                const settings = {
                    target: this.input.target,
                    sourceProject: {
                        id: this.project.id,
                        options: { ...this.parts }
                    }
                }
                this.$emit('confirm', settings)
            }
        }
    },
    setup () {
        return {
            async show (project) {
                this.$refs.dialog.show()
                this.input.target = ''
                this.input.exportConfirm = false
                this.project = project
                this.parts = {
                    flows: true,
                    credentials: true,
                    template: true,
                    nodes: true,
                    settings: false,
                    envVars: 'all'
                }
                this.input.stack = this.project.stack.id
                this.input.template = this.project.template.id
                this.input.team = this.project.team.id
                const projectList = await teamApi.getTeamProjects(this.project.team.id)
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
    }
}
</script>
