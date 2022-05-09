<template>
    <TransitionRoot appear :show="isOpen" as="template">
        <Dialog as="div" @close="close">
            <div class="fixed inset-0 z-10 overflow-y-auto">
                <div class="min-h-screen px-4 text-center">
                    <DialogOverlay class="fixed inset-0 bg-black opacity-50" />
                    <span class="inline-block h-screen align-middle" aria-hidden="true">
                        &#8203;
                    </span>
                    <TransitionChild
                        as="template"
                        enter="duration-300 ease-out"
                        enter-from="opacity-0 scale-95"
                        enter-to="opacity-100 scale-100"
                        leave="duration-200 ease-in"
                        leave-from="opacity-100 scale-100"
                        leave-to="opacity-0 scale-95"
                    >
                        <div class="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-lg rounded">
                            <DialogTitle as="h3" class="text-lg font-medium leading-6 text-red-700">Export to Existing Project</DialogTitle>
                            <form class="space-y-6">
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
                                <div class="mt-4 flex flex-row justify-end">
                                    <ff-button kind="secondary" @click="close()">Cancel</ff-button>
                                    <ff-button :disabled="!exportEnabled" class="ml-4" @click="confirm()">Export To Existing Project</ff-button>
                                </div>
                            </form>
                        </div>
                    </TransitionChild>
                </div>
            </div>
        </Dialog>
    </TransitionRoot>
</template>

<script>
import { ref } from 'vue'
import {
    TransitionRoot,
    TransitionChild,
    Dialog,
    DialogOverlay,
    DialogTitle
} from '@headlessui/vue'

import teamApi from '@/api/team'

import FormRow from '@/components/FormRow'
import ExportProjectComponents from '../../components/ExportProjectComponents'

export default {
    name: 'DuplicateProjectDialog',
    components: {
        TransitionRoot,
        TransitionChild,
        Dialog,
        DialogOverlay,
        DialogTitle,
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
