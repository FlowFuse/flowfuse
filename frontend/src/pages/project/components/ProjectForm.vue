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
                :error="errors.name || submitErrors?.name"
                :disabled="!creatingNew"
                data-form="project-name"
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
            <ProjectCreditBanner :subscription="subscription" />
            <ff-tile-selection
                v-model="input.projectType"
                class="mt-5"
                data-form="project-type"
            >
                <ff-tile-selection-option
                    v-for="(projType, index) in projectTypes"
                    :key="index"
                    :label="projType.name"
                    :description="projType.description"
                    :price="projType.price"
                    :price-interval="projType.priceInterval"
                    :value="projType.id"
                    :disabled="projType.disabled"
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
                data-form="project-stack"
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
                data-form="project-template"
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
        <div v-if="showBilling">
            <ProjectChargesTable
                v-model:confirmed="input.billingConfirmation"
                :project-type="selectedProjectType"
                :subscription="subscription"
                :trialMode="isTrialProjectSelected"
            />
        </div>

        <!-- Submit -->
        <div class="flex flex-wrap gap-1 items-center">
            <ff-button
                v-if="!creatingNew"
                class="ff-btn--secondary"
                @click="$router.back()"
            >
                Cancel
            </ff-button>

            <ff-button
                :disabled="!submitEnabled"
                :data-action="creatingNew ? 'create-project' : 'update-project'"
                type="submit"
            >
                <template v-if="creatingNew">
                    Create Project
                </template>
                <template v-else>
                    Confirm Changes
                </template>

            </ff-button>
            <label
                v-if="!creatingNew && !formDirty"
                class="text-sm text-gray-400"
            >
                No changes have been made
            </label>
        </div>

    </form>
</template>

<script>
import { mapState } from 'vuex'

import { RefreshIcon } from '@heroicons/vue/outline'

import ExportProjectComponents from './ExportProjectComponents'
import ProjectChargesTable from './ProjectChargesTable'
import ProjectCreditBanner from './ProjectCreditBanner'

import billingApi from '@/api/billing'
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
        ProjectCreditBanner,
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
        project: {
            default: null,
            type: Object
        },
        sourceProject: {
            default: null,
            type: Object
        },
        submitErrors: {
            default: null,
            type: Object
        }
    },
    emits: ['on-submit'],
    data () {
        const project = this.project || this.sourceProject

        return {
            stacks: [],
            templates: [],
            projectTypes: [],
            subscription: null,
            input: {
                billingConfirmation: false,

                // Only read name from existing project, never source
                name: this.project?.name || NameGenerator(),

                // Handle both full project objects and short-form project details
                projectType: project?.projectType?.id || project?.projectType || '',
                stack: project?.stack?.id || project?.stack || '',
                template: project?.template?.id || project?.template || ''
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
        ...mapState('account', ['settings']),
        creatingNew () {
            return !this.project?.id
        },
        isCopyProject () {
            return !!this.sourceProject && this.creatingNew
        },
        projectTypeChanged () {
            return this.project?.projectType?.id !== this.input.projectType
        },
        projectStackChanged () {
            return ((this.project?.stack?.id || this.stacks?.[0]?.id) !== this.input.stack)
        },
        formDirty () {
            return this.creatingNew || this.projectTypeChanged || this.projectStackChanged
        },
        showBilling () {
            return this.billingEnabled && (this.creatingNew || this.projectTypeChanged)
        },
        formValid () {
            return this.input.name && !this.errors.name &&
              this.input.projectType && !this.errors.projectType &&
              this.input.stack && !this.errors.stack &&
              (this.creatingNew ? (this.input.template && !this.errors.template) : true)
        },
        submitEnabled () {
            const billingConfirmed = !this.showBilling || this.team.billing?.trial || this.input.billingConfirmation
            return billingConfirmed && this.formValid && this.formDirty
        },
        isTrialProjectSelected () {
            //  - Team is in trial mode, and
            //  - Team billing is not configured, or
            //  - team billing is configured, but they still have an available
            //     trial project to create, and they have selected the trial
            //     project type
            return this.team.billing?.trial && (
                !this.team.billing?.active || (
                    this.team.billing.trialProjectAllowed &&
                    this.selectedProjectType?.id === this.settings['user:team:trial-mode:projectType']
                )
            )
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

        let activeProjectTypeCount = this.projectTypes.length
        if (this.billingEnabled) {
            try {
                this.subscription = await billingApi.getSubscriptionInfo(this.team.id)
            } catch (err) {
                if (err.response?.data?.code === 'not_found') {
                    // This team has no subscription.
                    if (!this.team.billing?.trial || this.team.billing?.trialEnded) {
                        throw err
                    }
                }
            }
            this.projectTypes.forEach(pt => {
                if (pt.properties?.billingDescription) {
                    pt.price = pt.properties?.billingDescription?.split('/')[0]
                    pt.priceInterval = pt.properties?.billingDescription?.split('/')[1]
                }
                if (this.team.billing?.trial) {
                    const isTrialProjectType = pt.id === this.settings['user:team:trial-mode:projectType']
                    if (!this.team.billing?.active) {
                        // No active billing - only allow the trial project type
                        pt.disabled = !isTrialProjectType
                    }
                    if (isTrialProjectType && this.team.billing?.trialProjectAllowed) {
                        pt.price = 'Free Trial'
                        pt.priceInterval = pt.properties?.billingDescription
                    }
                    if (pt.disabled) {
                        activeProjectTypeCount--
                    }
                }
            })
        }

        if (this.projectTypes.length === 0) {
            this.errors.projectType = 'No project types available. Ask an Administrator to create a new project type'
        } else if (activeProjectTypeCount === 1) {
            this.input.projectType = this.projectTypes.find(pt => !pt.disabled).id
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
        // Redirect to billing if:
        // - billing feature is enabled, and:
        // - team has no billing configured and:
        //    - team is not a trial team, or:
        //    - team is a trial team and:
        //       - has expired, or:
        //       - already has a project created
        if (this.billingEnabled &&
            !this.team.billing?.active &&
            (
                this.team.billing?.canceled ||
                (
                    !this.team.billing?.trial || (
                        this.team.billing?.trialEnded || this.team.projectCount > 0
                    )
                )
            )
        ) {
            this.$router.push({
                path: `/team/${this.team.slug}/billing`
            })
        }
    },
    methods: {
        refreshName () {
            this.input.name = NameGenerator()
        },
        findStackById (stackId) {
            return this.stacks.find(stack => stack.id === stackId)
        },
        async updateProjectType (projectTypeId) {
            const projectType = this.projectTypes.find(pt => pt.id === projectTypeId)
            this.selectedProjectType = projectType
            await this.updateStacks(projectType)
        },
        async updateStacks (projectType) {
            this.errors.stack = ''

            const stackList = await stacksApi.getStacks(null, null, null, projectType.id)
            this.stacks = stackList.stacks.filter(stack => stack.active)

            if (this.stacks.length === 0) {
                this.input.stack = null
                this.errors.stack = 'No stacks available for this project type. Ask an Administrator to create a new stack definition'
                return
            }

            // Read stack from source project
            if (this.sourceProject?.stack && this.findStackById(this.sourceProject.stack.id)) {
                this.input.stack = this.sourceProject.stack.id
                return
            }

            // Read from currently edited project
            if (this.project?.stack && this.findStackById(this.project.stack.id)) {
                this.input.stack = this.project.stack.id
                return
            }

            // Read from project type
            if (projectType.defaultStack && this.findStackById(projectType.defaultStack)) {
                this.input.stack = projectType.defaultStack
                return
            }

            // Fallback to first
            this.input.stack = this.stacks[0]?.id
        }
    }
}
</script>
