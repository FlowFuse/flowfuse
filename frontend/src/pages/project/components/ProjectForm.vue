<template>
    <form
        class="space-y-6"
        @submit.prevent="$emit('on-submit', input)"
    >
        <SectionTopMenu
            :hero="creatingNew ? 'Create a new project' : 'Update Project'"
        />

        <!-- Form title -->
        <div class="mb-8 text-sm text-gray-500">
            <template v-if="creatingNew">
                <template v-if="!isCopyProject">
                    Let's get your new Node-RED project setup in no time.
                </template>
            </template>
            <template v-else>
                Here you can make changes to the projects settings.
            </template>
        </div>

        <!-- Project Name -->
        <div>
            <FormRow
                v-model="input.name"
                :error="errors.name"
                :disabled="!creatingNew"
            >
                <template #default>
                    Project Name
                </template>
                <template
                    v-if="creatingNew"
                    #description
                >
                    Please note, currently, project names cannot be changed once a project is created
                </template>
                <template
                    v-if="creatingNew"
                    #append
                >
                    <ff-button
                        kind="secondary"
                        @click="refreshName"
                    >
                        <template #icon>
                            <RefreshIcon />
                        </template>
                    </ff-button>
                </template>
            </FormRow>
        </div>

        <!-- Project Type -->
        <div
            v-if="errors.projectTypes"
            class="text-red-400 text-xs"
        >
            {{ errors.projectTypes }}
        </div>
        <div
            v-else
            class="flex flex-wrap items-stretch"
        >
            <label class="w-full block text-sm font-medium text-gray-700">Choose your Project Type</label>
            <ff-tile-selection
                v-model="input.projectType"
                class="mt-5"
            >
                <ff-tile-selection-option
                    v-for="(projType, index) in projectTypes"
                    :key="index"
                    :label="projType.name"
                    :description="projType.description"
                    :price="projType.properties?.billingDescription?.split('/')[0]"
                    :price-interval="projType.properties?.billingDescription?.split('/')[1]"
                    :value="projType.id"
                />
            </ff-tile-selection>
        </div>

        <!-- Stack -->
        <div class="flex flex-wrap gap-1 items-stretch">
            <label class="w-full block text-sm font-medium text-gray-700 mb-4">Choose your Stack</label>
            <label
                v-if="!input.projectType"
                class="text-sm text-gray-400"
            >
                Please select a Project Type first.</label>
            <label
                v-if="errors.stack"
                class="text-sm text-gray-400"
            >
                {{ errors.stack }}
            </label>
            <ff-tile-selection
                v-if="input.projectType"
                v-model="input.stack"
            >
                <ff-tile-selection-option
                    v-for="(stack, index) in stacks"
                    :key="index"
                    :value="stack.id"
                    :label="stack.label || stack.name"
                />
            </ff-tile-selection>
        </div>

        <!-- Template -->
        <div
            v-if="creatingNew && templates.length > 1 "
            class="flex flex-wrap gap-1 items-stretch"
        >
            <label class="w-full block text-sm font-medium text-gray-700 mb-1">Template</label>
            <label
                v-if="!input.projectType && !input.stack"
                class="text-sm text-gray-400"
            >Please select a Project Type &amp; Stack first.</label>
            <label
                v-if="errors.template"
                class="text-sm text-gray-400"
            >{{ errors.template }}</label>
            <ff-tile-selection
                v-if="input.projectType"
                v-model="input.template"
            >
                <ff-tile-selection-option
                    v-for="(t, index) in templates"
                    :key="index"
                    :value="t.id"
                    :disabled="isCopyProject"
                    :label="t.name"
                    :description="t.description"
                />
            </ff-tile-selection>
        </div>

        <!-- Copying a project -->
        <template v-if="isCopyProject">
            <p class="text-gray-500">
                Select the components to copy from '{{ sourceProject?.name }}'
            </p>
            <ExportProjectComponents
                id="exportSettings"
                v-model="copyParts"
            />
        </template>

        <!-- Billing details -->
        <div v-if="billingEnabled">
            <ProjectChargesTable
                v-model:confirmed="input.billingConfirmation"
                :team="team"
                :project-type="selectedProjectType"
            />
        </div>

        <!-- Submit -->
        <div class="flex flex-wrap gap-1">
            <ff-button
                v-if="!creatingNew"
                class="ff-btn--secondary"
                @click="$router.back()"
            >
                Cancel
            </ff-button>

            <ff-button
                v-if="creatingNew"
                type="submit"
                :disabled="!submitEnabled"
                data-action="create-project"
            >
                Create Project
            </ff-button>
            <ff-button
                v-else
                :disabled="!submitEnabled"
                data-action="change-project-type"
                type="submit"
            >
                Confirm Changes
            </ff-button>
        </div>
        <label
            v-if="!creatingNew && !formDirty"
            class="text-sm text-gray-400"
        >
            No changes have been made
        </label>
    </form>
</template>

<script>

import { RefreshIcon } from '@heroicons/vue/outline'
import { ChevronLeftIcon } from '@heroicons/vue/solid'

import ExportProjectComponents from './ExportProjectComponents'
import ProjectChargesTable from './ProjectChargesTable'

import projectTypesApi from '@/api/projectTypes'
import stacksApi from '@/api/stacks'
import templatesApi from '@/api/templates'

import FormRow from '@/components/FormRow'
import SectionTopMenu from '@/components/SectionTopMenu'

import NameGenerator from '@/utils/name-generator'

export default {
    name: 'ProjectForm',
    components: {
        ExportProjectComponents,
        FormRow,
        ProjectChargesTable,
        RefreshIcon,
        SectionTopMenu
    },

    props: {
        team: {
            required: true,
            type: Object
        },
        billingEnabled: {
            default: false,
            type: Boolean
        },
        existingProject: {
            default: null,
            type: Object
        },
        sourceProject: {
            default: null,
            type: Object
        }
    },
    emits: ['on-submit'],
    data () {
        const project = this.existingProject || this.sourceProject

        return {
            mounted: false,
            icons: {
                chevronLeft: ChevronLeftIcon
            },
            stacks: [],
            templates: [],
            projectTypes: [],
            input: {
                billingConfirmation: false,
                name: this.existingProject?.name || NameGenerator(),
                projectType: project?.projectType?.id || '',
                stack: project?.stack?.id || '',
                template: project?.template?.id || ''
            },
            errors: {
                name: '',
                projectType: '',
                stack: '',
                template: ''
            },
            copyParts: {
                flows: true,
                credentials: true,
                nodes: true,
                envVars: 'all'
            },
            selectedProjectType: null
        }
    },
    computed: {
        creatingNew () {
            return !this.existingProject
        },
        isCopyProject () {
            return !!this.sourceProject && this.creatingNew
        },
        projectTypeChanged () {
            return this.existingProject?.projectType?.id !== this.input.projectType
        },
        projectStackChanged () {
            return ((this.existingProject?.stack?.id || this.stacks?.[0]?.id) !== this.input.stack)
        },
        formDirty () {
            return this.projectTypeChanged || this.projectStackChanged
        },
        formValid () {
            return this.input.name && !this.errors.name &&
              this.input.projectType && !this.errors.projectType &&
              this.input.stack && !this.errors.stack &&
              (this.creatingNew ? (this.input.template && !this.errors.template) : true)
        },
        submitEnabled () {
            const billingConfirmed = (this.billingEnabled ? this.input.billingConfirmation : true)

            return billingConfirmed && this.formValid && this.formDirty
        }
    },
    watch: {
        'input.name': function (value, oldValue) {
            if (/^[a-zA-Z][a-zA-Z0-9-]*$/.test(value)) {
                this.errors.name = ''
            } else {
                this.errors.name = 'Names must only include a→z, A→Z, -, 0→9 and can not start with 0→9'
            }
        },
        'input.projectType': async function (value, oldValue) {
            if (value) {
                await this.updateProjectType(value)
            }
        }
    },
    async created () {
        const projectTypesPromise = projectTypesApi.getProjectTypes()
        const templateListPromise = templatesApi.getTemplates()

        this.projectTypes = (await projectTypesPromise).types
        this.templates = (await templateListPromise).templates.filter(template => template.active)

        if (this.projectTypes.length === 0) {
            this.errors.projectType = 'No project types available. Ask an Administrator to create a new project type'
        }

        if (this.creatingNew && this.templates.length === 0) {
            this.errors.template = 'No templates available. Ask an Administrator to create a new template definition'
        }

        if (this.creatingNew && !this.isCopyProject) {
            this.input.template = this.templates[0]?.id || ''
        }

        // Callback loads in related stacks
        if (this.input.projectType) {
            this.updateProjectType(this.input.projectType)
        }
    },
    async beforeMount () {
        if (this.billing && !this.team.billingSetup) {
            this.$router.push({
                path: `/team/${this.team.slug}/billing`
            })
        }
    },
    async mounted () {
        this.mounted = true
    },
    methods: {
        refreshName () {
            this.input.name = NameGenerator()
        },
        async updateProjectType (projectTypeId) {
            const projectType = this.projectTypes.find(pt => pt.id === projectTypeId)
            this.selectedProjectType = projectType
            await this.updateStacks(projectType)
        },
        async updateStacks (projectType) {
            this.input.stack = null
            this.errors.stack = ''

            const stackList = await stacksApi.getStacks(null, null, null, projectType.id)
            this.stacks = stackList.stacks.filter(stack => stack.active)

            if (this.stacks.length === 0) {
                this.errors.stack = 'No stacks available for this project type. Ask an Administrator to create a new stack definition'
                return
            }

            // Read stack from source project
            if (this.sourceProject && this.stacks.find(st => st.id === this.sourceProject.stack.id)) {
                this.input.stack = this.sourceProject.stack.id
                return
            }

            // Read from project type
            if (projectType.defaultStack) {
                const defaultStack = this.stacks.find(st => st.id === projectType.defaultStack)
                if (defaultStack) {
                    this.input.stack = projectType.defaultStack
                    return
                }
            }

            // Fallback to first
            this.input.stack = this.stacks[0]?.id
        }
    }
}
</script>
