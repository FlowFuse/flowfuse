<template>
    <section class="ff-instance-step text-center flex flex-col gap-4 pt-6">
        <h2>Setup Your Instance</h2>
        <form class="max-w-2xl m-auto text-left flex flex-col gap-7">
            <FeatureUnavailableToTeam v-if="teamRuntimeLimitReached" fullMessage="You have reached the runtime limit for this team." />

            <FeatureUnavailableToTeam v-else-if="teamInstanceLimitReached" fullMessage="You have reached the instance limit for this team." />

            <div class="ff-instance-name ff-input-wrapper flex flex-col gap-1">
                <label class="mb-1">Name</label>
                <div class="ff-input-wrapper flex gap-3 items-center">
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
                    <p v-if="hasValidName" class="flex gap-2 text-green-600 items-center">
                        <CheckCircleIcon class=" ff-icon-sm" />
                        <span>Your instance hostname will be "<i>{{ instanceName }}</i>".</span>
                    </p>
                    <p v-else class="text-sm text-red-600">
                        {{ errors.name }}
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
                            <ff-tile-selection v-model="input.template" data-form="project-type">
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
        </form>
    </section>
</template>

<script>
import { CheckCircleIcon, RefreshIcon } from '@heroicons/vue/outline'
import { mapState } from 'vuex'

import billingApi from '../../../../api/billing.js'
import instanceTypesApi from '../../../../api/instanceTypes.js'
import stacksApi from '../../../../api/stacks.js'
import templatesApi from '../../../../api/templates.js'
import InstanceCreditBanner from '../../../../pages/instance/components/InstanceCreditBanner.vue'
import FfListbox from '../../../../ui-components/components/form/ListBox.vue'
import FfTextInput from '../../../../ui-components/components/form/TextInput.vue'
import NameGenerator from '../../../../utils/name-generator/index.js'
import Loading from '../../../Loading.vue'
import FeatureUnavailableToTeam from '../../../banners/FeatureUnavailableToTeam.vue'

export default {
    name: 'InstanceStep',
    components: { FeatureUnavailableToTeam, RefreshIcon, CheckCircleIcon, Loading, InstanceCreditBanner, FfListbox, FfTextInput },
    props: {
        slug: {
            required: true,
            type: String
        },
        state: {
            required: false,
            type: Object,
            default: () => ({})
        }
    },
    emits: ['step-updated'],
    setup (props) {
        return {
            initialState: props.state
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
                name: null,
                instanceType: null,
                nodeREDVersion: null,
                template: null
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
            return /^[a-zA-Z][a-zA-Z0-9-\s]*$/.test(this.input.name)
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
        teamRuntimeLimitReached () {
            let teamTypeRuntimeLimit = this.team.type.properties?.runtimes?.limit
            const currentRuntimeCount = this.team.deviceCount + this.team.instanceCount
            if (this.team.billing?.trial && !this.team.billing?.active && this.team.type.properties?.trial?.runtimesLimit) {
                teamTypeRuntimeLimit = this.team.type.properties?.trial?.runtimesLimit
            }
            return (teamTypeRuntimeLimit > 0 && currentRuntimeCount >= teamTypeRuntimeLimit)
        }
    },
    watch: {
        input: {
            handler (input) {
                let hasErrors = false
                let template = null

                if (!this.hasValidName) {
                    this.errors.name = 'Invalid instance name.'
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
                    template = input.template ?? null
                } else {
                    template = input.template ?? this.instanceTemplates[0]?.id ?? null
                }

                this.$emit('step-updated', {
                    [this.slug]: {
                        input: {
                            ...(input ?? {}),
                            template,
                            name: this.instanceName
                        },
                        hasErrors,
                        errors: this.errors
                    }
                })
            },
            deep: true,
            immediate: true
        },
        'input.instanceType' () {
            this.input.nodeREDVersion = null
            this.getNodeRedVersions()
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
        },
        async getInstanceTypes () {
            const instanceTypes = await instanceTypesApi.getInstanceTypes()

            this.instanceTypes = instanceTypes.types ?? []
            this.decoratedInstanceTypes = this.decorateInstanceTypes(instanceTypes.types ?? [])
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
        decorateInstanceTypes (instanceTypes) {
            // TODO this needs to be a computed prop but it's causing too many side effects to be used as is

            // Do a first pass of the instance types to disable any not allowed for this team
            instanceTypes = instanceTypes.map(instanceType => {
                // Need to combine the projectType billing info with any overrides
                // from the current teamType
                const teamTypeInstanceProperties = this.team.type.properties.instances[instanceType.id]
                const existingInstanceCount = this.team.instanceCountByType?.[instanceType.id] || 0
                if (this.teamRuntimeLimitReached) {
                    // The overall limit has been reached
                    instanceType.disabled = true
                } else if (teamTypeInstanceProperties) {
                    if (!teamTypeInstanceProperties.active) {
                        // This instanceType is disabled for this teamType
                        instanceType.disabled = true
                    } else if (teamTypeInstanceProperties.creatable === false) {
                        // Type is active (it can exist), but not creatable (not allowed to create more) for this team type.
                        // This can happen follow a change of TeamType where different instance types are available.
                        // This check treats undefined as true for backwards compatibility
                        instanceType.disabled = true
                    } else if (teamTypeInstanceProperties.limit !== null && teamTypeInstanceProperties.limit <= existingInstanceCount) {
                        // This team has reached the limit of this instance type
                        instanceType.disabled = true
                    }
                }

                return instanceType
            })

            if (this.features.billing) {
                // With billing enabled, do a second pass through the instance types
                // to populate their billing info
                instanceTypes = instanceTypes.map(instanceType => {
                    // Need to combine the projectType billing info with any overrides
                    // from the current teamType
                    const teamTypeInstanceProperties = this.team.type.properties.instances[instanceType.id]
                    let existingInstanceCount = this.team.instanceCountByType?.[instanceType.id] || 0
                    if (this.team.type.properties.devices?.combinedFreeType === instanceType.id) {
                        // Need to include device count as they use a combined free allocation
                        existingInstanceCount += this.team.deviceCount
                    }
                    instanceType.price = ''
                    instanceType.priceInterval = ''
                    instanceType.currency = ''
                    instanceType.cost = 0
                    if (!instanceType.disabled && !this.team.billing?.unmanaged) {
                        let billingDescription
                        if (teamTypeInstanceProperties) {
                            // TeamType provides metadata to use - do not fall back to instanceType
                            if (existingInstanceCount >= (teamTypeInstanceProperties.free || 0)) {
                                billingDescription = teamTypeInstanceProperties.description
                            } else {
                                // This team is still within its free allowance so clear
                                // the billingDescription
                            }
                        } else {
                            billingDescription = instanceType.properties?.billingDescription
                        }
                        if (billingDescription) {
                            [instanceType.price, instanceType.priceInterval] = billingDescription.split('/')
                            instanceType.currency = instanceType.price.replace(/[\d.]+/, '')
                            instanceType.cost = (Number(instanceType.price.replace(/[^\d.]+/, '')) || 0) * 100
                        } else {
                            instanceType.price = ''
                            instanceType.priceInterval = ''
                            instanceType.currency = ''
                            instanceType.cost = 0
                        }
                        if (this.team.billing?.trial) {
                            if (this.team.type.properties?.trial?.instanceType) {
                                const isTrialProjectType = instanceType.id === this.team.type.properties?.trial?.instanceType
                                if (!this.team.billing?.active) {
                                    // No active billing - only allow the trial instance type
                                    instanceType.disabled = !isTrialProjectType
                                }
                                if (isTrialProjectType && this.team.billing?.trialProjectAllowed) {
                                    instanceType.price = 'Free Trial'
                                    // instanceType.priceInterval = instanceType.properties?.billingDescription
                                }
                            }
                        }
                    }

                    return instanceType
                })
            }

            return instanceTypes
        },
        getTemplates () {
            return templatesApi.getTemplates()
                .then((response) => {
                    const templates = response.templates
                    if (templates.length === 1) {
                        this.input.template = templates[0].id
                    }

                    this.instanceTemplates = templates
                })
        },
        refreshName () {
            this.input.name = NameGenerator()
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
