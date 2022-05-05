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
                            <DialogTitle as="h3" class="text-lg font-medium leading-6 text-red-700">Export To Project</DialogTitle>
                            <form class="space-y-6">
                                <div class="mt-2 space-y-2">
                                    <p class="text-sm text-gray-500">
                                        Select project components to copy to project:
                                    </p>
                                </div>
                                <div>
                                    <FormRow :error="errors.target" v-model="input.target" :options="projects">
                                        <template v-slot:default>Target Project</template>
                                    </FormRow>
                                </div>
                                <!-- <FormRow :options="stacks" :error="errors.stack" v-model="input.stack" id="stack">Stack</FormRow>

                                <FormRow disabled :options="templates" :error="errors.template" v-model="input.template" id="template">Template</FormRow> -->

                                <FormHeading>Copy from {{project.name}}</FormHeading>
                                <ExportProjectComponents id="exportSettings" v-model="parts" />
                                <div class="mt-4 flex flex-row justify-end">
                                    <ff-button kind="secondary" @click="close()">Cancel</ff-button>
                                    <ff-button class="ml-4" @click="confirm()">Export To Project</ff-button>
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

import stacksApi from '@/api/stacks'
import templatesApi from '@/api/templates'
import teamApi from '@/api/team'

import FormRow from '@/components/FormRow'
import FormHeading from '@/components/FormHeading'
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
        FormHeading,
        ExportProjectComponents
    },
    data () {
        return {
            init: false,
            teams: [],
            stacks: [],
            projects: [],
            input: {
                target: '',
                team: '',
                stack: '',
                template: '',
                billingConfirmation: false
            },
            parts: {
                showSecret: false,
                allowJustCreds: true,
                exportTemplate: true,
                flows: true,
                creds: true,
                template: true,
                nodes: true,
                envVars: true,
                envVarsKo: false,
                settings: true
            },
            errors: {
                stack: '',
                name: '',
                template: ''
            }
        }
    },
    watch: {
        'input.name': function (value, oldValue) {
            if (/^[a-z0-9-]+$/.test(value)) {
                this.errors.name = ''
            } else {
                this.errors.name = 'Names can include a-z, 0-9 & - with no spaces'
            }
        }
    },
    methods: {
        confirm () {
            const parts = this.parts
            if (parts.creds && parts.credsSecret && parts.credsSecret.trim()) {
                parts.creds = parts.credsSecret.trim()
                delete parts.credsSecret
            }

            const settings = {
                target: this.input.target,
                sourceProject: {
                    id: this.project.id,
                    options: parts
                }
            }
            this.$emit('exportToProject', settings)
            this.isOpen = false
        }
    },
    async created () {
        const stackList = await stacksApi.getStacks()
        this.stacks = stackList.stacks.filter(stack => stack.active).map(stack => { return { value: stack.id, label: stack.name } })

        const templateList = await templatesApi.getTemplates()
        this.templates = templateList.templates.filter(template => template.active).map(template => { return { value: template.id, label: template.name } })
    },
    setup () {
        const isOpen = ref(false)

        return {
            isOpen,
            close () {
                isOpen.value = false
            },
            async show (project) {
                this.project = project
                this.parts = {
                    allowJustCreds: true,
                    exportTemplate: true,
                    showSecret: false,
                    flows: true,
                    creds: true,
                    template: true,
                    nodes: true,
                    envVars: true,
                    envVarsKo: false,
                    settings: true
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

                setTimeout(() => {
                    this.input.target = this.projects.length > 0 ? this.projects[0].value : ''
                }, 100)
            }
        }
    }
}
</script>
