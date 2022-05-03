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
                            <DialogTitle as="h3" class="text-lg font-medium leading-6 text-red-700">Duplicate project</DialogTitle>
                            <form class="space-y-6">
                                <div class="mt-2 space-y-2">
                                    <p class="text-sm text-gray-500">
                                        Select project components to use in new project:
                                    </p>
                                </div>
                                <div>
                                    <FormRow :error="errors.name" v-model="input.name">
                                        <template v-slot:default>New Project Name</template>
                                        <template v-slot:append>
                                            <ff-button kind="secondary" @click="refreshName"><template v-slot:icon><RefreshIcon /></template></ff-button>
                                        </template>
                                    </FormRow>
                                    <span class="block text-xs ml-4 italic text-gray-500 m-0 max-w-sm">Please note, currently, project names cannot be changed once a project is created</span>
                                </div>

                                <FormRow :options="stacks" :error="errors.stack" v-model="input.stack" id="stack">Stack</FormRow>

                                <FormRow disabled :options="templates" :error="errors.template" v-model="input.template" id="template">Template</FormRow>

                                <FormHeading>Copy from {{project.name}}</FormHeading>
                                <ExportProjectComponents id="exportSettings" v-model="parts" />
                                <div class="mt-4 flex flex-row justify-end">
                                    <ff-button kind="secondary" @click="close()">Cancel</ff-button>
                                    <ff-button class="ml-4" @click="confirm()">Duplicate project</ff-button>
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

import FormRow from '@/components/FormRow'
import FormHeading from '@/components/FormHeading'
import NameGenerator from '@/utils/name-generator'
import { RefreshIcon } from '@heroicons/vue/outline'
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
        RefreshIcon,
        ExportProjectComponents
    },
    data () {
        return {
            init: false,
            teams: [],
            stacks: [],
            input: {
                name: NameGenerator(),
                team: '',
                stack: '',
                template: '',
                billingConfirmation: false
            },
            parts: {
                showSecret: false,
                flows: true,
                creds: true,
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
            console.log(parts)
            if (parts.creds && parts.credsSecret && parts.credsSecret.trim()) {
                parts.creds = parts.credsSecret.trim()
                delete parts.credsSecret
            }

            const newProject = {
                ...this.input,
                sourceProject: {
                    id: this.project.id,
                    options: parts
                }
            }
            this.$emit('duplicateProject', newProject)
            this.isOpen = false
        },
        refreshName () {
            this.input.name = NameGenerator()
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
                    showSecret: false,
                    flows: true,
                    creds: true,
                    nodes: true,
                    envVars: true,
                    envVarsKo: false,
                    settings: true
                }
                isOpen.value = true
                this.input.name = NameGenerator()
                this.input.stack = this.project.stack.id
                this.input.template = this.project.template.id
                this.input.team = this.project.team.id
            }
        }
    }
}
</script>
