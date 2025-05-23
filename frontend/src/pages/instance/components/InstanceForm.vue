<template>
    <form class="space-y-6" @submit.prevent="onSubmit">
        <SectionTopMenu v-if="hasHeader" :hero="heroTitle" />
        <!-- Form title -->
        <div v-if="hasHeader" class="mb-8 text-sm text-gray-500">
            <template v-if="creatingNew">
                <template v-if="!creatingApplication || applicationSelection">
                    Let's get your new Node-RED instance setup in no time.
                </template>
                <template v-else-if="!isCopyProject">
                    Applications are used to manage and group together your Node-RED instances and devices.
                </template>
            </template>
            <template v-else>
                Here you can make changes to the instances settings.
            </template>
        </div>

        <!-- Application Selection -->
        <div v-if="applicationSelection && hasApplicationsToChooseFrom">
            <FormRow
                v-model="input.applicationId"
                :options="applications"
                :error="!input.applicationId ? (errors.applicationId || submitErrors?.applicationId) : undefined"
                :disabled="applicationFieldsLocked"
                data-form="application-id"
            >
                <template #default>
                    Application
                </template>
            </FormRow>
            <div class="italic text-gray-500 pl-1 pt-0.5 text-sm truncate">{{ selectedApplication?.description || '' }}</div>
        </div>
        <!-- No Existing Applications, or we are creating a new one -->
        <div v-else-if="creatingApplication" class="space-y-6">
            <FormRow
                v-model="input.applicationName"
                :error="errors.applicationName || submitErrors?.applicationName"
                :disabled="!creatingNew || applicationFieldsLocked"
                placeholder="My Application Name"
                data-form="application-name"
            >
                <template #default>
                    Application Name
                </template>
            </FormRow>
            <FormRow
                v-model="input.applicationDescription"
                :error="errors.applicationDescription || submitErrors?.applicationDescription"
                :disabled="!creatingNew || applicationFieldsLocked"
                placeholder="My Application Description"
                data-form="application-description"
            >
                <template #default>
                    Application Description
                </template>
            </FormRow>
        </div>

        <FormRow v-if="creatingApplication && instancesAvailable" v-model="input.createInstance" type="checkbox" data-form="create-instance">
            Create Node-RED Instance
            <template #description>
                This will create an instance of Node-RED that will be managed in your new Application.
            </template>
        </FormRow>

        <div v-if="instancesAvailable && (!creatingApplication || input.createInstance)" :class="creatingApplication ? 'ml-6' : ''" class="space-y-6">
            <FeatureUnavailableToTeam v-if="teamRuntimeLimitReached" fullMessage="You have reached the runtime limit for this team." />
            <FeatureUnavailableToTeam v-else-if="teamInstanceLimitReached" fullMessage="You have reached the instance limit for this team." />
            <!-- Instance Name -->
            <div>
                <FormRow
                    v-model="input.name"
                    :error="errors.name || submitErrors?.name"
                    :disabled="!creatingNew"
                    container-class="max-w-xl"
                    data-form="project-name"
                >
                    <template #default>
                        Instance Name
                    </template>
                    <template v-if="creatingNew" #appended-description>
                        <p v-if="hasValidName" class="instance-name-confirmation">
                            <CheckCircleIcon class="ff-btn--icon" />
                            <span>Your instance hostname will be "<i>{{ instanceName.toLowerCase() }}</i>".</span>
                        </p>
                        The instance name is used to access the editor, so it must be suitable for use in a URL. It is not currently possible to rename the instance after it has been created.
                    </template>
                    <template v-if="creatingNew" #append>
                        <ff-button kind="secondary" @click="refreshName">
                            <template #icon>
                                <RefreshIcon />
                            </template>
                        </ff-button>
                    </template>
                </FormRow>
            </div>

            <div v-if="creatingNew && flowBlueprintsEnabled && atLeastOneFlowBlueprint && !isCopyProject">
                <div data-form="blueprint">
                    <label class="block text-sm font-medium text-gray-800 mb-2">Blueprint</label>
                    <BlueprintTileSmall v-if="selectedBlueprint" :blueprint="selectedBlueprint" @click="previewBlueprint" />
                    <div v-if="showFlowBlueprintSelection" class="mt-2 flex gap-4" data-action="blueprint-actions">
                        <div
                            class="text-blue-600 cursor-pointer hover:text-blue-700 hover:underline text-sm flex gap-1 items-center"
                            @click="previewBlueprint(selectedBlueprint)"
                        >
                            <ProjectIcon class="ff-btn--icon" />
                            <span>Preview Blueprint</span>
                        </div>
                        <div
                            class="text-blue-600 cursor-pointer hover:text-blue-700 hover:underline text-sm flex gap-1 items-center"
                            @click="blueprintDialogVisible = true"
                        >
                            <FolderIcon class="ff-btn--icon" />
                            <span>Choose a different Blueprint</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Instance Type -->
            <div v-if="errors.projectType" class="text-red-400 text-xs">
                {{ errors.projectType }}
            </div>
            <template v-else>
                <div v-if="projectTypes.length > 0" class="flex flex-wrap items-stretch">
                    <label class="w-full block text-sm font-medium text-gray-700">Choose your Instance Type</label>
                    <InstanceCreditBanner :subscription="subscription" />
                    <ff-tile-selection v-model="input.projectType" class="mt-5" data-form="project-type">
                        <ff-tile-selection-option
                            v-for="(projType, index) in filteredProjectTypes"
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
                    <label class="w-full block text-sm font-medium text-gray-700 mb-1">Choose your Node-RED Version</label>
                    <FormRow
                        v-model="input.stack"
                        value="id" :options="stacks"
                        :disabled="emptyStacks"
                        data-el="stack-selector"
                        container-class="max-w-sm w-full"
                    >
                        <template #description>
                            <label v-if="!input.projectType" class="text-sm text-gray-400">
                                Please select a Instance Type first.
                            </label>
                            <label v-if="errors.stack" class="text-sm text-gray-400">
                                {{ errors.stack }}
                            </label>
                        </template>
                    </FormRow>
                </div>

                <!-- Template -->
                <div v-if="creatingNew && templates.length > 1 " class="flex flex-wrap gap-1 items-stretch">
                    <label class="w-full block text-sm font-medium text-gray-700 mb-1">Template</label>
                    <label v-if="!input.projectType || !input.stack" class="text-sm text-gray-400">
                        Please select a Instance Type &amp; Node-RED Version first.
                    </label>
                    <label v-if="errors.template" class="text-sm text-gray-400">{{ errors.template }}</label>
                    <ff-tile-selection v-if="input.projectType && input.stack" v-model="input.template" data-form="project-template">
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

                <!-- Copying a instance -->
                <template v-if="isCopyProject">
                    <p class="text-gray-500">
                        Select the components to copy from '{{ sourceInstance?.name }}'
                    </p>
                    <ExportInstanceComponents id="exportSettings" v-model="copyParts" />
                </template>

                <!-- Billing details -->
                <div v-if="showBilling">
                    <InstanceChargesTable
                        :project-type="selectedProjectType"
                        :subscription="subscription"
                        :trialMode="isTrialProjectSelected"
                        :prorationMode="team?.type?.properties?.billing?.proration"
                    />
                </div>
            </template>
        </div>

        <div class="flex flex-wrap gap-1 items-center">
            <ff-button v-if="!creatingNew" class="ff-btn--secondary" @click="$router.back()">
                Cancel
            </ff-button>

            <ff-button
                :disabled="!submitEnabled"
                :data-action="creatingNew ? 'create-project' : 'update-project'"
                type="submit"
            >
                <template v-if="creatingNew">
                    <span v-if="applicationFieldsVisible">Create Application<span v-if="input.createInstance && instancesAvailable"> &amp; Instance</span></span>
                    <span v-else>Create Instance</span>
                </template>
                <template v-else>
                    Confirm Changes
                </template>
            </ff-button>
            <label v-if="!creatingNew && !formDirty" class="text-sm text-gray-400">
                No changes have been made
            </label>
        </div>
        <AssetDetailDialog ref="flowRendererDialog" class="preview-main-blueprint" />
        <BlueprintSelectorDialog
            v-if="blueprintDialogVisible && blueprints.length"
            ref="blueprintSelectorDialog"
            :active-blueprint="selectedBlueprint"
            @blueprint-updated="input.flowBlueprintId = $event.id"
            @close="blueprintDialogVisible = false"
        />
    </form>
</template>

<script>
import { CheckCircleIcon, FolderIcon, RefreshIcon } from '@heroicons/vue/outline'
import { mapActions, mapGetters, mapState } from 'vuex'

import billingApi from '../../../api/billing.js'
import instanceTypesApi from '../../../api/instanceTypes.js'
import stacksApi from '../../../api/stacks.js'
import templatesApi from '../../../api/templates.js'

import FormRow from '../../../components/FormRow.vue'
import SectionTopMenu from '../../../components/SectionTopMenu.vue'
import FeatureUnavailableToTeam from '../../../components/banners/FeatureUnavailableToTeam.vue'
import AssetDetailDialog from '../../../components/dialogs/AssetDetailDialog.vue'
import BlueprintSelectorDialog from '../../../components/dialogs/BlueprintSelectorDialog.vue'

import ProjectIcon from '../../../components/icons/Projects.js'

import NameGenerator from '../../../utils/name-generator/index.js'

import BlueprintTileSmall from '../Blueprints/BlueprintTileSmall.vue'

import ExportInstanceComponents from './ExportImportComponents.vue'
import InstanceChargesTable from './InstanceChargesTable.vue'
import InstanceCreditBanner from './InstanceCreditBanner.vue'

export default {
    name: 'InstanceForm',
    components: {
        AssetDetailDialog,
        BlueprintSelectorDialog,
        FolderIcon,
        ExportInstanceComponents,
        FeatureUnavailableToTeam,
        FormRow,
        InstanceChargesTable,
        InstanceCreditBanner,
        RefreshIcon,
        SectionTopMenu,
        BlueprintTileSmall,
        CheckCircleIcon,
        ProjectIcon
    },
    props: {
        team: {
            required: true,
            type: Object
        },
        // EE Features
        billingEnabled: {
            default: false,
            type: Boolean
        },
        flowBlueprintsEnabled: {
            default: false,
            type: Boolean
        },
        // Instance
        instance: {
            default: null,
            type: Object
        },
        sourceInstance: {
            default: null,
            type: Object
        },
        submitErrors: {
            default: null,
            type: Object
        },
        // do we want to show a selection of Applications?
        applications: {
            default: () => [],
            type: Array
        },
        applicationSelection: {
            default: false,
            type: Boolean
        },
        // Todo: Move these to a separate component
        applicationFieldsLocked: {
            default: false,
            type: Boolean
        },
        applicationFieldsVisible: {
            default: false,
            type: Boolean
        },
        // allows setting predefined values when the component is created
        preDefinedInputs: {
            default: null,
            type: Object
        },
        hasHeader: {
            default: true,
            type: Boolean
        }
    },
    emits: ['on-submit', 'blueprint-updated'],
    data () {
        const instance = this.instance || this.sourceInstance

        // Dropdown is locked, default to first if only one option
        let applicationName = ''
        let applicationId = ''
        if (this.applicationFieldsLocked && this.applications.length === 1) {
            applicationName = this.applications[0].label
            applicationId = this.applications[0].value
        }

        return {
            stacks: [],
            templates: [],
            projectTypes: [],
            activeProjectTypeCount: 0,
            subscription: null,
            input: {
                applicationName,
                applicationDescription: '',
                applicationId,

                createInstance: true,

                // Only read name from existing project, never source
                name: this.instance?.name || NameGenerator(),

                // Handle both full instance objects and short-form instance details
                projectType: instance?.projectType?.id || instance?.projectType || '',
                stack: instance?.stack?.id || instance?.stack || '',
                template: instance?.template?.id || instance?.template || '',

                flowBlueprintId: '' // always defaults to blank, not currently available on edit
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
            selectedProjectType: null,
            blueprintDialogVisible: false
        }
    },
    computed: {
        ...mapState('account', ['settings']),
        ...mapGetters('account', ['blueprints', 'defaultBlueprint', 'featuresCheck']),
        creatingApplication () {
            return (this.applicationSelection && !this.applications.length) || (this.creatingNew && this.applicationFieldsVisible)
        },
        selectedApplication () {
            if (this.applications?.length) {
                return this.applications.find((a) => {
                    return a.value === this.input.applicationId
                })
            }
            return {}
        },
        creatingNew () {
            return !this.instance?.id
        },
        isCopyProject () {
            return !!this.sourceInstance && this.creatingNew
        },
        projectTypeChanged () {
            return this.instance?.projectType?.id !== this.input.projectType
        },
        projectStackChanged () {
            return ((this.stacks?.[0]?.id || this.instance?.stack?.id) !== this.input.stack)
        },
        formDirty () {
            return this.creatingNew || this.projectTypeChanged || this.projectStackChanged
        },
        showBilling () {
            return this.billingEnabled && (this.creatingNew || this.projectTypeChanged)
        },
        applicationFormValid () {
            return ((this.creatingNew && this.applicationFieldsVisible) ? this.input.applicationName : true) &&
              (this.applicationSelection && (!this.hasApplicationsToChooseFrom && !this.input.applicationName) ? this.input.applicationId : true)
        },
        instanceFormValid () {
            return this.input.name && !this.errors.name &&
              this.input.projectType && !this.errors.projectType &&
              this.input.stack && !this.errors.stack &&
              (this.creatingNew ? (this.input.template && !this.errors.template) : true)
        },
        formValid () {
            return this.applicationFormValid && ((this.creatingApplication && !this.input.createInstance) || this.instanceFormValid)
        },
        submitEnabled () {
            return this.formValid && this.formDirty
        },
        isTrialProjectSelected () {
            //  - Team is in trial mode, and
            //  - Team billing is not configured, or
            //  - team billing is configured, but they still have an available
            //     trial instance to create, and they have selected the trial
            //     instance type
            return this.team.billing?.trial && (
                !this.team.billing?.active || (
                    this.team.billing.trialProjectAllowed &&
                    this.selectedProjectType?.id === this.settings['user:team:trial-mode:projectType']
                )
            )
        },
        teamRuntimeLimitReached () {
            let teamTypeRuntimeLimit = this.team.type.properties?.runtimes?.limit
            const currentRuntimeCount = this.team.deviceCount + this.team.instanceCount
            if (this.team.billing?.trial && !this.team.billing?.active && this.team.type.properties?.trial?.runtimesLimit) {
                teamTypeRuntimeLimit = this.team.type.properties?.trial?.runtimesLimit
            }
            return (teamTypeRuntimeLimit > 0 && currentRuntimeCount >= teamTypeRuntimeLimit)
        },
        teamInstanceLimitReached () {
            // this.projectTypes.length > 0 : There are Instance Types defined
            // this.activeProjectTypeCount : How instance types are available for the user to select
            //                               taking into account their limits
            // Hence, if activeProjectTypeCount === 0, then they are at their limit of usage
            return this.projectTypes.length > 0 && this.activeProjectTypeCount === 0
        },
        instancesAvailable () {
            return this.featuresCheck?.isHostedInstancesEnabledForTeam
        },
        atLeastOneFlowBlueprint () {
            return this.blueprints.length > 0
        },
        showFlowBlueprintSelection () {
            return this.blueprints.length > 1 && this.flowBlueprintsEnabled
        },
        selectedBlueprint () {
            return this.blueprints.find((blueprint) => `${blueprint.id}` === `${this.input.flowBlueprintId}`) || this.defaultBlueprint
        },
        heroTitle () {
            return this.creatingNew ? (this.creatingApplication ? 'Create a new Application' : 'Create Instance') : 'Update Instance'
        },
        filteredProjectTypes () {
            return this.projectTypes.filter(pt => !pt.disabled)
        },
        instanceName () {
            return this.input.name.trim().replace(/\s/g, '-')
        },
        hasValidName () {
            return this.validateName(this.input.name)
        },
        emptyStacks () {
            return this.stacks.length === 0
        },
        hasApplicationsToChooseFrom () {
            return this.applications.length > 0
        }
    },
    watch: {
        'input.name': function (value) {
            if (this.validateName(value)) {
                this.errors.name = ''
            } else {
                this.errors.name = 'Names must only include a→z, A→Z, -, 0→9 and can not start with 0→9'
            }
        },
        'input.projectType': async function (value) {
            if (value) {
                await this.updateInstanceType(value)
            } else {
                this.selectedProjectType = null
            }
        },
        'input.flowBlueprintId': function (newValue, oldValue) {
            if (newValue !== oldValue) {
                // use computed blueprint id, as it may sometimes receive invalid pre-defined blueprint id's
                this.input.flowBlueprintId = this.selectedBlueprint.id
            }
            this.$emit('blueprint-updated', newValue, oldValue)
        }
    },
    async created () {
        const projectTypesPromise = instanceTypesApi.getInstanceTypes()
        const templateListPromise = templatesApi.getTemplates()
        const blueprintsPromise = this.loadBlueprints()

        const projectTypes = (await projectTypesPromise).types
        this.templates = (await templateListPromise).templates.filter(template => template.active)

        this.activeProjectTypeCount = projectTypes.length

        // Do a first pass of the instance types to disable any not allowed for this team
        projectTypes.forEach(pt => {
            // Need to combine the projectType billing info with any overrides
            // from the current teamType
            const teamTypeInstanceProperties = this.team.type.properties.instances[pt.id]
            const existingInstanceCount = this.team.instanceCountByType?.[pt.id] || 0
            if (this.teamRuntimeLimitReached) {
                // The overall limit has been reached
                pt.disabled = true
            } else if (teamTypeInstanceProperties) {
                if (!teamTypeInstanceProperties.active) {
                    // This instanceType is disabled for this teamType
                    pt.disabled = true
                } else if (teamTypeInstanceProperties.creatable === false) {
                    // Type is active (it can exist), but not creatable (not allowed to create more) for this team type.
                    // This can happen follow a change of TeamType where different instance types are available.
                    // This check treats undefined as true for backwards compatibility
                    pt.disabled = true
                } else if (teamTypeInstanceProperties.limit !== null && teamTypeInstanceProperties.limit <= existingInstanceCount) {
                    // This team has reached the limit of this instance type
                    pt.disabled = true
                }
            }
            if (pt.disabled) {
                this.activeProjectTypeCount--
            }
        })

        if (this.billingEnabled) {
            if (!this.team.billing?.unmanaged && !this.team.type.properties?.billing?.disabled) {
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
            }
            // With billing enabled, do a second pass through the instance types
            // to populate their billing info
            projectTypes.forEach(pt => {
                // Need to combine the projectType billing info with any overrides
                // from the current teamType
                const teamTypeInstanceProperties = this.team.type.properties.instances[pt.id]
                let existingInstanceCount = this.team.instanceCountByType?.[pt.id] || 0
                if (this.team.type.properties.devices?.combinedFreeType === pt.id) {
                    // Need to include device count as they use a combined free allocation
                    existingInstanceCount += this.team.deviceCount
                }
                pt.price = ''
                pt.priceInterval = ''
                pt.currency = ''
                pt.cost = 0
                if (!pt.disabled && !this.team.billing?.unmanaged) {
                    let billingDescription
                    if (teamTypeInstanceProperties) {
                        // TeamType provides meta data to use - do not fall back to instanceType
                        if (existingInstanceCount >= (teamTypeInstanceProperties.free || 0)) {
                            billingDescription = teamTypeInstanceProperties.description
                        } else {
                            // This team is still within its free allowance so clear
                            // the billingDescription
                        }
                    } else {
                        billingDescription = pt.properties?.billingDescription
                    }
                    if (billingDescription) {
                        [pt.price, pt.priceInterval] = billingDescription.split('/')
                        pt.currency = pt.price.replace(/[\d.]+/, '')
                        pt.cost = (Number(pt.price.replace(/[^\d.]+/, '')) || 0) * 100
                    } else {
                        pt.price = ''
                        pt.priceInterval = ''
                        pt.currency = ''
                        pt.cost = 0
                    }
                    if (this.team.billing?.trial) {
                        if (this.team.type.properties?.trial?.instanceType) {
                            const isTrialProjectType = pt.id === this.team.type.properties?.trial?.instanceType
                            if (!this.team.billing?.active) {
                                // No active billing - only allow the trial instance type
                                pt.disabled = !isTrialProjectType
                                if (pt.disabled) {
                                    this.activeProjectTypeCount--
                                }
                            }
                            if (isTrialProjectType && this.team.billing?.trialProjectAllowed) {
                                pt.price = 'Free Trial'
                                pt.priceInterval = pt.properties?.billingDescription
                            }
                        }
                    }
                }
            })
        }

        this.projectTypes = projectTypes

        if (this.projectTypes.length === 0) {
            this.errors.projectType = 'No instance types available. Ask an Administrator to create a new instance type'
        } else if (this.activeProjectTypeCount === 1) {
            // Only one active type - pre-select it for convenience
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
            this.updateInstanceType(this.input.projectType)
        }

        await blueprintsPromise
        if (this.blueprints.length === 0) {
            // Falls back to the default blueprint server side no error needed
            console.warn('Flow Blueprints enabled but none available')
        }

        if (this.preDefinedInputs) {
            this.input = {
                ...this.input,
                ...this.preDefinedInputs
            }
        }
        if (this.teamInstanceLimitReached || this.teamRuntimeLimitReached || !this.instancesAvailable) {
            this.input.createInstance = false
        }
    },
    async beforeMount () {
        // Billing feature must be enabled
        if (!this.billingEnabled) {
            return
        }

        // Team must not have billing set up
        if ((this.team.billing?.active || this.team.billing?.unmanaged) ?? true) {
            return
        }

        // Redirect to billing if:
        //   - subscription is not unmanaged
        //   - team has cancelled their subscription
        //   - team is not a trial team, or:
        //   - team is a trial team and:
        //     - has expired, or:
        //     - is an instanceType-limited trial and already has a instance created
        if (this.team.billing?.canceled ||
            !this.team.billing?.trial ||
            this.team.billing?.trialEnded ||
            (this.team.type.properties?.trial?.instanceType && this.team.instanceCount > 0)
        ) {
            this.$router.push({
                path: `/team/${this.team.slug}/billing`
            })
        }
    },
    methods: {
        ...mapActions('account', ['getTeamBlueprints']),
        refreshName () {
            this.input.name = NameGenerator()
        },
        validateName (value) {
            return /^[a-zA-Z][a-zA-Z0-9-\s]*$/.test(value)
        },
        findStackById (stackId) {
            return this.stacks.find(stack => stack.id === stackId)
        },
        async updateInstanceType (projectTypeId) {
            const projectType = this.projectTypes.find(pt => pt.id === projectTypeId)
            this.selectedProjectType = projectType
            await this.updateStacks(projectType)
        },
        async updateStacks (projectType) {
            this.errors.stack = ''

            const stackList = await stacksApi.getStacks(null, null, null, projectType.id)
            this.stacks = stackList.stacks
                .filter(stack => stack.active)
                .map(stack => { return { ...stack, value: stack.id, label: stack.label || stack.name } })

            if (this.stacks.length === 0) {
                this.input.stack = null
                this.errors.stack = 'No Node-RED Versions available for this instance type. Ask an Administrator to create a Node-RED Version stack definition'
                return
            }

            // Read stack from source instance
            if (this.sourceInstance?.stack && this.findStackById(this.sourceInstance.stack.id)) {
                this.input.stack = this.sourceInstance.stack.id
                return
            }

            // Read from currently edited instance
            if (this.instance?.stack && this.findStackById(this.instance.stack.id)) {
                this.input.stack = this.instance.stack.id
                return
            }

            // Read from instance type
            if (projectType.defaultStack && this.findStackById(projectType.defaultStack)) {
                this.input.stack = projectType.defaultStack
                return
            }

            // Fallback to first
            this.input.stack = this.stacks[0]?.id
        },
        async loadBlueprints () {
            if (!this.flowBlueprintsEnabled || this.isCopyProject) {
                return []
            }
            await this.getTeamBlueprints(this.team.id)

            this.input.flowBlueprintId = this.defaultBlueprint?.id
        },
        previewBlueprint (blueprint) {
            this.$refs.flowRendererDialog.show(blueprint)
        },
        onSubmit () {
            this.$emit(
                'on-submit',
                {
                    ...this.input,
                    name: this.instanceName
                },
                this.copyParts
            )
        }
    }
}
</script>

<style scoped lang="scss">
.instance-name-confirmation {
  margin: 5px 0;
  display: flex;
  gap: 5px;
  color: $ff-green-600;
}
</style>
