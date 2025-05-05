<template>
    <section class="ff-duplication-step text-center flex flex-col gap-4 pt-6" data-step="duplication">
        <h2>Duplication Overview</h2>

        <div class="max-w-2xl m-auto text-left">
            <transition name="fade" mode="out-in">
                <ff-loading v-if="loading" message="Loading data..." />
                <div v-else class="flex flex-col gap-7" data-el="duplicate-wrapper">
                    <div class="form-group">
                        <div class="title">
                            <label>Application</label>
                            <div class="actions">
                                <ff-button v-ff-tooltip="'Edit'" size="small" kind="tertiary" @click="goToStep(0)">
                                    <PencilIcon class="ff-icon ff-icon-sm" />
                                </ff-button>
                            </div>
                        </div>
                        <p data-el="application-name">{{ selectedApplication.label }}</p>
                        <p v-if="selectedApplication.description" data-el="application-description">{{ selectedApplication.description }}</p>
                    </div>

                    <div class="form-group">
                        <div class="title">
                            <label>Instance Name</label>
                            <div class="actions">
                                <ff-button v-ff-tooltip="'Generate a new name'" size="small" kind="tertiary" @click="generateName">
                                    <RefreshIcon class="ff-icon ff-icon-sm" />
                                </ff-button>
                                <ff-button v-ff-tooltip="'Edit'" size="small" kind="tertiary" @click="goToStep(1)">
                                    <PencilIcon class="ff-icon ff-icon-sm" />
                                </ff-button>
                            </div>
                        </div>
                        <p data-el="instance-name">{{ instanceSelection.name }}</p>
                    </div>

                    <div class="form-group">
                        <div class="title">
                            <label>Instance Type</label>
                            <div class="actions">
                                <ff-button v-ff-tooltip="'Edit'" size="small" kind="tertiary" @click="goToStep(1)">
                                    <PencilIcon class="ff-icon ff-icon-sm" />
                                </ff-button>
                            </div>
                        </div>
                        <p data-el="instance-type-name">{{ selectedInstanceType.name }}</p>
                        <p data-el="instance-type-description">{{ selectedInstanceType.description }}</p>
                    </div>

                    <div class="form-group">
                        <div class="title">
                            <label>Node RED Version</label>
                            <div class="actions">
                                <ff-button v-ff-tooltip="'Edit'" size="small" kind="tertiary" @click="goToStep(1)">
                                    <PencilIcon class="ff-icon ff-icon-sm" />
                                </ff-button>
                            </div>
                        </div>
                        <p data-el="node-red-version">{{ selectedNodeRedVersion?.label }}</p>
                    </div>

                    <div v-if="instanceTemplates.length > 1" class="form-group">
                        <div class="title">
                            <label>Template</label>
                            <div class="actions">
                                <ff-button v-ff-tooltip="'Edit'" size="small" kind="tertiary" @click="goToStep(1)">
                                    <PencilIcon class="ff-icon ff-icon-sm" />
                                </ff-button>
                            </div>
                        </div>
                        <p data-el="template-name">{{ selectedTemplate.name }}</p>
                    </div>

                    <div class="form-group">
                        <div class="title">
                            <label>Select the components to copy from '{{ instance?.name }}'</label>
                        </div>
                        <ExportInstanceComponents id="exportSettings" v-model="copyParts" class="mt-2" />
                    </div>

                    <div v-if="features.billing" class="my-5 text-left" style="padding: 0 60px;">
                        <InstanceChargesTable
                            :project-type="selectedInstanceType"
                            :subscription="subscription"
                            :trialMode="isTrialProjectSelected"
                            :prorationMode="team?.type?.properties?.billing?.proration"
                        />
                    </div>
                </div>
            </transition>
        </div>
    </section>
</template>

<script>
import { PencilIcon, RefreshIcon } from '@heroicons/vue/outline'
import { mapState } from 'vuex'

import billingApi from '../../../../api/billing.js'
import instanceTypesApi from '../../../../api/instanceTypes.js'
import stacksApi from '../../../../api/stacks.js'
import templatesApi from '../../../../api/templates.js'

import ExportInstanceComponents from '../../../../pages/instance/components/ExportImportComponents.vue'
import InstanceChargesTable from '../../../../pages/instance/components/InstanceChargesTable.vue'
import FfButton from '../../../../ui-components/components/Button.vue'
import NameGenerator from '../../../../utils/name-generator/index.js'

import FfLoading from '../../../Loading.vue'

export default {
    name: 'DuplicationStep',
    components: { FfButton, InstanceChargesTable, ExportInstanceComponents, FfLoading, PencilIcon, RefreshIcon },
    props: {
        applications: {
            required: true,
            type: Array
        },
        slug: {
            required: true,
            type: String
        },
        state: {
            required: false,
            type: Object,
            default: () => ({})
        },
        instance: {
            required: true,
            type: [Object, null]
        },
        instanceSelection: {
            required: true,
            type: Object
        },
        applicationSelection: {
            required: true,
            type: Object
        }
    },
    emits: ['step-updated', 'go-to-step'],
    setup (props) {
        const initialState = props.state
        return { initialState }
    },
    data () {
        return {
            copyParts: {
                flows: true,
                credentials: true,
                nodes: true,
                envVars: 'all'
            },
            instanceTemplates: [],
            loading: true,
            nodeRedVersions: [],
            subscription: null
        }
    },
    computed: {
        ...mapState('account', ['team', 'features']),
        isTrialProjectSelected () {
            //  - Team is in trial mode, and
            //  - Team billing is not configured, or
            //  - team billing is configured, but they still have an available
            //     trial instance to create, and they have selected the trial
            //     instance type
            return this.team?.billing?.trial && (
                !this.team.billing?.active || (
                    this.team.billing.trialProjectAllowed &&
                    this.selectedProjectType?.id === this.settings['user:team:trial-mode:projectType']
                )
            )
        },
        selectedInstanceType () {
            if (this.instanceSelection.instanceType) {
                return this.instanceTypes.find(type => type.id === this.instanceSelection.instanceType)
            }
            return null
        },
        selectedNodeRedVersion () {
            if (this.instanceSelection.nodeREDVersion) {
                return this.nodeRedVersions.find(version => version.id === this.instanceSelection.nodeREDVersion)
            }
            return null
        },
        selectedTemplate () {
            if (this.instanceSelection.template) {
                return this.instanceTemplates.find(template => template.id === this.instanceSelection.template)
            }
            return null
        },
        selectedApplication () {
            if (this.applicationSelection?.selection?.id) {
                return this.applications.find(app => app.id === this.applicationSelection.selection.id)
            }
            return null
        }
    },
    watch: {
        copyParts: {
            immediate: true,
            handler (value) {
                this.$emit('step-updated', {
                    [this.slug]: {
                        copyParts: value
                    }
                })
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
        async getInstanceTypes () {
            const instanceTypes = await instanceTypesApi.getInstanceTypes()

            this.instanceTypes = instanceTypes.types ?? []
        },
        async getSubscription () {
            if (this.features?.billing && !this.team?.billing?.unmanaged && !this.team?.type.properties?.billing?.disabled) {
                try {
                    this.subscription = await billingApi.getSubscriptionInfo(this.team?.id)
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
        async getNodeRedVersions () {
            const versions = await stacksApi.getStacks(null, null, null, this.instanceSelection.instanceType)

            this.nodeRedVersions = versions.stacks
                .filter(version => version.active)
                .map(version => { return { ...version, value: version.id, label: version.label || version.name } })
        },
        getTemplates () {
            return templatesApi.getTemplates()
                .then((response) => {
                    this.instanceTemplates = response.templates.filter(template => template.active)
                })
        },
        goToStep (stepKey) {
            this.$emit('go-to-step', stepKey)
        },
        generateName () {
            // intended prop mutation to allow easy instance name generation without leaving the page
            // eslint-disable-next-line vue/no-mutating-props
            this.instanceSelection.name = NameGenerator()
        }
    }
}
</script>

<style lang="scss">
.ff-duplication-step {
    .form-group {
        .title {
            margin-bottom: 5px;
            padding-bottom: 5px;
            border-bottom: 1px solid $ff-grey-200;
            display: flex;
            justify-content: space-between;

            label {

                font-weight: 500;
            }

            .actions {
                display: flex;
                gap: 5px;
            }
        }
        p {
            margin-top: 5px;

            &:nth-of-type(2) {
                color: $ff-grey-500;
                font-style: italic;
            }
        }
    }
}
</style>
