<template>
    <ff-dialog header="Export to Existing Project" :open="isOpen">
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
        <template v-slot:actions>
            <ff-button kind="secondary" @click="close()">Cancel</ff-button>
            <ff-button :disabled="!exportEnabled" class="ml-4" @click="confirm()">Export To Existing Project</ff-button>
        </template>
    </ff-dialog>
</template>

<script>
import { ref } from 'vue'

import teamApi from '@/api/team'

import FormRow from '@/components/FormRow'
import ExportProjectComponents from '../../components/ExportProjectComponents'

export default {
    name: 'DuplicateProjectDialog',
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
                this.$emit('exportToProject', settings)
                this.isOpen = false
            }
        }
    },
    setup () {
        const isOpen = ref(false)

        return {
            isOpen,
            close () {
                isOpen.value = false
            },
            async show (project) {
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
                isOpen.value = true
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

                // setTimeout(() => {
                //     this.input.target = this.projects.length > 0 ? this.projects[0].value : ''
                // }, 100)
            }
        }
    }
}
</script>
