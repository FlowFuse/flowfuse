<template>
    <section class="ff-instance-step text-center flex flex-col gap-4 pt-6" data-step="instance">
        <h2>Setup Your Instance</h2>
        <form class="max-w-2xl m-auto text-left flex flex-col gap-7">
            <FeatureUnavailableToTeam v-if="teamRuntimeLimitReached" fullMessage="You have reached the runtime limit for this team." />

            <FeatureUnavailableToTeam v-else-if="teamInstanceLimitReached" fullMessage="You have reached the instance limit for this team." />

            <div class="ff-instance-name ff-input-wrapper flex flex-col gap-1">
                <label class="mb-1">Name</label>
                <div class="ff-input-wrapper flex gap-3 items-center relative mb-4">
                    <ff-text-input
                        v-model="input.name"
                        label="instance-name"
                        :error="errors.name"
                        data-el="instance-name"
                    />
                    <ff-button kind="secondary" @click="refreshName">
                        <template #icon>
                            <RefreshIcon />
                        </template>
                    </ff-button>
                </div>
                <div class="details ml-3 flex flex-col gap-3">
                    <span v-if="errors.name && input.name.length > 0" class="left-4 top-9 text-red-600 text-sm" data-el="instance-name-error">{{ errors.name }}</span>
                    <p v-if="hasValidName" class="flex gap-2 text-green-600 items-center">
                        <CheckCircleIcon class=" ff-icon-sm" />
                        <span>Your instance hostname will be "<i>{{ instanceName }}</i>".</span>
                    </p>
                    <p class="opacity-50 text-sm">
                        The instance name is used to access the editor, so it must be suitable for use in a URL. It is not currently possible to rename the instance after it has been created.
                    </p>
                </div>
            </div>

            <transition name="fade" mode="out-in">
                <Loading v-if="loading" size="small" />

                <div v-else class="flex flex-col gap-4">
                    <div class="instance-types ff-input-wrapper flex flex-wrap items-stretch" data-group="instance-types">
                        <label class="w-full mb-2 block">Choose your Instance Type</label>
                        <template v-if="hasInstanceTypes && activeInstanceTypeCount > 0">
                            <InstanceCreditBanner :subscription="subscription" />
                            <ff-tile-selection v-model="input.instanceType" data-form="project-type">
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
                        </template>
                        <template v-else-if="hasInstanceTypesAndAllAreDisabled">
                            <p class="text-center center my-5 w-full text-gray-500">
                                No instance types available at this moment.
                            </p>
                        </template>
                        <template v-else>
                            <p class="text-center center my-5 w-full text-gray-500">
                                No instance types available. Ask an Administrator to create a new instance type
                            </p>
                        </template>
                    </div>

                    <div
                        v-if="hasMultipleTemplates"
                        class="instance-templates ff-input-wrapper flex flex-wrap items-stretch"
                        data-group="templates"
                    >
                        <label class="mb-2 block w-full">Choose your Template</label>
                        <template v-if="hasTemplates">
                            <ff-tile-selection v-model="input.template" data-form="project-template">
                                <ff-tile-selection-option
                                    v-for="(template, index) in instanceTemplates"
                                    :key="index"
                                    :label="template.name"
                                    :description="template.description"
                                    :value="template.id"
                                    :disabled="template.disabled"
                                />
                            </ff-tile-selection>
                        </template>
                        <template v-else>
                            <p class="text-center center my-5 w-full text-gray-500">
                                No templates available. Ask an Administrator to create a new template
                            </p>
                        </template>
                    </div>

                    <div class="node-red-version ff-input-wrapper flex flex-col gap-1">
                        <label class="mb-1">Node-RED Version</label>
                        <template v-if="hasNodeRedVersions">
                            <ff-listbox
                                v-model="input.nodeREDVersion"
                                data-el="node-red-listbox"
                                :options="nodeRedVersions"
                                :disabled="!input.instanceType || !input.template"
                                :placeholder="nodeRedVersionPlaceholder"
                            />
                        </template>
                        <template v-else>
                            <p class="text-center center my-5 w-full text-gray-500">
                                No Node-RED Versions available for this instance type. Ask an Administrator to create a Node-RED Version stack definition
                            </p>
                        </template>
                    </div>
                </div>
            </transition>
            <!-- Billing details -->
            <div v-if="features.billing" class="my-5 text-left">
                <InstanceChargesTable
                    :project-type="selectedInstanceType"
                    :subscription="subscription"
                    :trialMode="isTrialProjectSelected"
                    :prorationMode="team?.type?.properties?.billing?.proration"
                />
            </div>
        </form>
    </section>
</template>

<script>
import { CheckCircleIcon, RefreshIcon } from '@heroicons/vue/outline'
import { mapState } from 'vuex'

import billingApi from '../../../../api/billing.js'
import instanceTypesApi from '../../../../api/instanceTypes.js'
import instancesApi from '../../../../api/instances.js'
import stacksApi from '../../../../api/stacks.js'
import templatesApi from '../../../../api/templates.js'
import {
    useInstanceFormHelper
} from '../../../../composables/Components/multi-step-forms/instance/InstanceFormHelper.js'
import InstanceChargesTable from '../../../../pages/instance/components/InstanceChargesTable.vue'
import InstanceCreditBanner from '../../../../pages/instance/components/InstanceCreditBanner.vue'
import FfListbox from '../../../../ui-components/components/form/ListBox.vue'
import FfTextInput from '../../../../ui-components/components/form/TextInput.vue'
import { debounce } from '../../../../utils/eventHandling.js'
import NameGenerator from '../../../../utils/name-generator/index.js'
import Loading from '../../../Loading.vue'
import FeatureUnavailableToTeam from '../../../banners/FeatureUnavailableToTeam.vue'

export default {
    name: 'InstanceStep',
    components: {
        InstanceChargesTable,
        FeatureUnavailableToTeam,
        RefreshIcon,
        CheckCircleIcon,
        Loading,
        InstanceCreditBanner,
        FfListbox,
        FfTextInput
    },
    props: {
        slug: {
            required: true,
            type: String
        },
        state: {
            required: false,
            type: Object,
            default: () => ({})
        },
        initialErrors: {
            required: false,
            type: Object,
            default: () => ({})
        }
    },
    emits: ['step-updated'],
    setup (props) {
        const { decorateInstanceTypes, teamRuntimeLimitReached } = useInstanceFormHelper()

        return {
            initialState: props.state,
            decorateInstanceTypes,
            teamRuntimeLimitReached
        }
    },
    data () {
        return {
            input: {
                name: this.initialState.name ?? NameGenerator(),
                instanceType: this.initialState.instanceType ?? null,
                nodeREDVersion: this.initialState.nodeREDVersion ?? null,
                template: this.initialState.template ?? null
            },
            errors: {
                name: this.initialErrors.name ?? null,
                instanceType: this.initialErrors.instanceType ?? null,
                nodeREDVersion: this.initialErrors.nodeREDVersion ?? null,
                template: this.initialErrors.template ?? null
            },
            nodeRedVersions: [],
            instanceTypes: [],
            decoratedInstanceTypes: [],
            instanceTemplates: [],
            subscription: null,
            loading: true
        }
    },
    computed: {
        ...mapState('account', ['features', 'team']),
        activeInstanceTypeCount () {
            return this.decoratedInstanceTypes.filter(instance => !instance.disabled).length
        },
        filteredProjectTypes () {
            return this.decoratedInstanceTypes.filter(instanceType => !instanceType.disabled)
        },
        hasInstanceTypes () {
            return this.instanceTypes.length > 0
        },
        hasInstanceTypesAndAllAreDisabled () {
            return this.hasInstanceTypes && this.activeInstanceTypeCount === 0
        },
        hasMultipleTemplates () {
            return this.instanceTemplates.length > 1
        },
        hasNodeRedVersions () {
            return this.nodeRedVersions.length > 0
        },
        hasTemplates () {
            return this.instanceTemplates.length > 0
        },
        hasValidName () {
            return /^[a-zA-Z][a-zA-Z0-9-\s]*$/.test(this.input.name) && !this.errors.name
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
        instanceName () {
            return this.input.name.trim().replace(/\s/g, '-').toLowerCase()
        },
        nodeRedVersionPlaceholder () {
            if (!this.input.instanceType) {
                return 'Please select an Instance Type First'
            }

            if (!this.input.template) {
                return 'Please select a Template First'
            }

            return 'Please select'
        },
        teamInstanceLimitReached () {
            // this.projectTypes.length > 0 : There are Instance Types defined
            // this.activeInstanceTypeCount : How instance types are available for the user to select
            //                               taking into account their limits
            // Hence, if activeInstanceTypeCount === 0, then they are at their limit of usage
            return this.instanceTypes.length > 0 && this.activeInstanceTypeCount === 0
        },
        selectedInstanceType () {
            if (this.input.instanceType) {
                return this.instanceTypes.find(type => type.id === this.input.instanceType)
            }
            return null
        }
    },
    watch: {
        input: {
            deep: true,
            handler () {
                this.updateParent()
            }
        },
        'input.instanceType' () {
            this.input.nodeREDVersion = null
            this.getNodeRedVersions()
        },
        'input.name': {
            immediate: true,
            handler: debounce(function (value) {
                const allowedCharacters = /^([a-zA-Z0-9-]+)(:\d+)?(\/[^\s<>"'#]*)?$/

                if (allowedCharacters.test(value)) {
                    instancesApi.nameCheck(value)
                        .then(res => {
                            this.errors.name = null
                        })
                        .catch(e => {
                            this.errors.name = 'Instance name already in use.'
                        })
                } else {
                    this.errors.name = 'Invalid character in use.'
                }
            }, 500)
        },
        errors: {
            deep: true,
            handler: function () {
                this.updateParent()
            }
        }
    },
    async mounted () {
        this.getSubscription()
            .then(() => this.getInstanceTypes())
            .then(() => this.getNodeRedVersions())
            .then(() => this.getTemplates())
            .catch(e => e)
            .finally(() => {
                this.loading = false
            })
    },
    methods: {
        async getNodeRedVersions () {
            const versions = await stacksApi.getStacks(null, null, null, this.input.instanceType)

            this.nodeRedVersions = versions.stacks
                .filter(version => version.active)
                .map(version => { return { ...version, value: version.id, label: version.label || version.name } })
            if (this.input.instanceType) {
                const instanceType = this.getInstanceType(this.input.instanceType)
                if (instanceType?.defaultStack) {
                    const version = this.nodeRedVersions.find(version => version.id === instanceType.defaultStack)
                    if (version) {
                        this.input.nodeREDVersion = instanceType.defaultStack
                    } else if (this.nodeRedVersions.length > 0) {
                        // Default to first in the list; don't force a selection to be made
                        this.input.nodeREDVersion = this.nodeRedVersions[0]?.id
                    }
                }
            }
        },
        async getInstanceTypes () {
            const instanceTypes = await instanceTypesApi.getInstanceTypes()

            const { decorateInstanceTypes } = useInstanceFormHelper()

            this.instanceTypes = instanceTypes.types ?? []
            this.decoratedInstanceTypes = decorateInstanceTypes(instanceTypes.types ?? [])

            const enabledTypes = this.decoratedInstanceTypes.filter(type => !type.disabled)
            if (enabledTypes.length === 1) {
                // pre-select the instance type if only one available
                this.input.instanceType = enabledTypes[0].id
            }
        },
        async getSubscription () {
            if (this.features.billing && !this.team.billing?.unmanaged && !this.team.type.properties?.billing?.disabled) {
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
        },
        getTemplates () {
            return templatesApi.getTemplates()
                .then((response) => {
                    const templates = response.templates.filter(template => template.active)
                    if (templates.length === 1) {
                        this.input.template = templates[0].id
                    }

                    this.instanceTemplates = templates
                })
        },
        refreshName () {
            this.input.name = NameGenerator()
        },
        getInstanceType (id) {
            return this.instanceTypes.find(instanceType => instanceType.id === id)
        },
        updateParent () {
            let hasErrors = false
            let template = null

            if (!this.hasValidName) {
                // this.errors.name = 'Invalid instance name.'
            } else { this.errors.name = null }

            if (!this.input.instanceType) {
                this.errors.instanceType = 'Instance Type is mandatory'
            } else { this.errors.instanceType = null }

            if (!this.input.nodeREDVersion) {
                this.errors.nodeREDVersion = 'NodeRED Version is mandatory'
            } else { this.errors.nodeREDVersion = null }

            if (this.hasMultipleTemplates && !this.input.template) {
                this.errors.template = 'Template is mandatory'
            } else { this.errors.template = null }

            Object.keys(this.errors).forEach(key => {
                if (this.errors[key] !== null) {
                    hasErrors = true
                }
            })

            if (this.hasMultipleTemplates) {
                template = this.input.template ?? null
            } else {
                template = this.input.template ?? this.instanceTemplates[0]?.id ?? null
            }

            this.$emit('step-updated', {
                [this.slug]: {
                    input: {
                        ...(this.input ?? {}),
                        template,
                        name: this.instanceName
                    },
                    hasErrors,
                    errors: this.errors
                }
            })
        }
    }
}
</script>

<style scoped lang="scss">
.ff-instance-step {
    form {
        .ff-instance-name {
            .ff-input-wrapper {
                button {
                    padding: 5px 10px;
                }
            }
        }
    }
}
</style>
