<template>
    <Teleport v-if="mounted" to="#platform-sidenav">
        <SideNavigation>
            <template v-slot:options>
                <a @click="$router.back()">
                    <nav-item :icon="icons.chevronLeft" label="Back"></nav-item>
                </a>
            </template>
            <!-- <template v-slot:back>
                <ff-team-selection></ff-team-selection>
            </template> -->
        </SideNavigation>
    </Teleport>
    <main>
        <div class="max-w-2xl m-auto">
            <ff-loading v-if="loading" message="Creating Project..."/>
            <form v-else class="space-y-6">
                <SectionTopMenu hero="Create a new project"></SectionTopMenu>
                <div class="mb-8 text-sm text-gray-500">
                    <template v-if="!isCopyProject">Let's get your new Node-RED project setup in no time.</template>
                </div>
                <div>
                    <FormRow v-model="input.name" :error="errors.name">
                        <template #default>Project Name</template>
                        <template #description>
                            Please note, currently, project names cannot be changed once a project is created
                        </template>
                        <template #append>
                            <ff-button kind="secondary" @click="refreshName"><template #icon><RefreshIcon /></template></ff-button>
                        </template>
                    </FormRow>
                </div>
                <div v-if="this.errors.projectTypes" class="text-red-400 text-xs">{{errors.projectTypes}}</div>
                <!-- Project Type -->
                <div v-else class="flex flex-wrap items-stretch">
                    <label class="w-full block text-sm font-medium text-gray-700">Choose your Project Type</label>
                    <div v-if="subscription?.customer?.balance" class="text-sm text-blue-600 italic" data-el="credit-balance-banner">
                        You have a credit balance of {{ formatCurrency(Math.abs(subscription.customer.balance)) }} that will be applied to this project
                    </div>
                    <ff-tile-selection v-model="input.projectType" class="mt-5">
                        <ff-tile-selection-option
                            v-for="(projType, index) in projectTypes" :key="index"
                            :label="projType.name" :description="projType.description"
                            :price="projType.properties?.billingDescription?.split('/')[0]"
                            :price-interval="projType.properties?.billingDescription?.split('/')[1]"
                            :value="projType.id"
                        />
                    </ff-tile-selection>
                </div>
                <!-- Stack -->
                <!-- <FormRow :options="stacks" :error="errors.stack" v-model="input.stack" id="stack">Stack</FormRow> -->
                <div class="flex flex-wrap gap-1 items-stretch">
                    <label class="w-full block text-sm font-medium text-gray-700 mb-4">Choose your Stack</label>
                    <label v-if="!input.projectType" class="text-sm text-gray-400">Please select a Project Type first.</label>
                    <label v-if="errors.stack" class="text-sm text-gray-400">{{ errors.stack }}</label>
                    <ff-tile-selection v-if="input.projectType" v-model="input.stack" >
                        <ff-tile-selection-option v-for="(stack, index) in stacks" :key="index"
                                                  :value="stack.id" :label="stack.label || stack.name"/>
                    </ff-tile-selection>
                </div>
                <!-- Template -->
                <div v-if="templates.length !== 1" class="flex flex-wrap gap-1 items-stretch">
                    <label class="w-full block text-sm font-medium text-gray-700 mb-1">Template</label>
                    <label v-if="!input.projectType && !input.stack" class="text-sm text-gray-400">Please select a Project Type &amp; Stack first.</label>
                    <label v-if="errors.template" class="text-sm text-gray-400">{{ errors.template }}</label>
                    <ff-tile-selection v-if="input.projectType" v-model="input.template" >
                        <ff-tile-selection-option v-for="(t, index) in templates" :key="index"
                                                  :value="t.id" :disabled="isCopyProject"
                                                  :label="t.name" :description="t.description"/>
                    </ff-tile-selection>
                </div>
                <!-- <FormRow :options="templates" :disabled="isCopyProject" :error="errors.template" v-model="input.template" id="template">Template</FormRow> -->
                <!-- Is Copy Project -->
                <template v-if="isCopyProject">
                    <p class="text-gray-500">
                        Select the components to copy from '{{this.sourceProject?.name}}'
                    </p>
                    <ExportProjectComponents id="exportSettings" v-model="copyParts" />
                </template>

                <div v-if="features.billing && input.projectType">
                    <div v-if="selectedProjectType?.cost > 0 || subscription?.customer?.balance > 0" class="pb-4 mb-4 border-b border-gray-300" data-el="charges-table">
                        <h1 class="text-lg font-medium mb-2 border-b border-gray-700">Charges</h1>
                        <div class="grid grid gap-x-1 gap-y-4 text-sm text-sm mt-4 ml-4" style="grid-template-columns: 1fr 75px auto">
                            <template v-if="selectedProjectType?.cost">
                                <div data-el="selected-project-type-name">1 x {{ selectedProjectType.name }}</div>
                                <div data-el="selected-project-type-cost" class="text-right">{{ formatCurrency(selectedProjectType.cost) }} </div>
                                <div v-if="selectedProjectType?.interval" data-el="selected-project-type-interval" class="text-left">/{{ selectedProjectType.interval }} </div>
                                <div v-else />
                            </template>
                            <template v-if="subscription?.customer?.balance">
                                <div data-el="credit-balance-row">Credit Balance</div>
                                <div data-el="credit-balance-amount" class="text-right">{{ formatCurrency(subscription?.customer?.balance) }}</div>
                                <div />
                            </template>
                        </div>
                    </div>
                    <FormRow id="billing-confirmation" v-model="input.billingConfirmation" type="checkbox">
                        Confirm additional charges
                        <template v-if="selectedProjectTypeCostAfterCredit >= 0" #description>
                            {{ formatCurrency(selectedProjectTypeCostAfterCredit) }} now
                            <span v-if="selectedProjectType?.interval">
                                then {{ formatCurrency(selectedProjectType.cost) }}/{{ selectedProjectType.interval }}
                            </span>
                        </template>
                    </FormRow>
                </div>

                <ff-button :disabled="!createEnabled" data-action="create-project" @click="createProject">Create Project</ff-button>
            </form>
        </div>
    </main>
</template>

<script>
import { RefreshIcon } from '@heroicons/vue/outline'
import { ChevronLeftIcon } from '@heroicons/vue/solid'
import { mapState } from 'vuex'

import ExportProjectComponents from '../project/components/ExportProjectComponents'

import billingApi from '@/api/billing.js'
import projectApi from '@/api/project'
import projectTypesApi from '@/api/projectTypes'
import stacksApi from '@/api/stacks'
import templatesApi from '@/api/templates'

import FormRow from '@/components/FormRow'
import NavItem from '@/components/NavItem'
import SectionTopMenu from '@/components/SectionTopMenu'
import SideNavigation from '@/components/SideNavigation'

import formatCurrency from '@/mixins/Currency.js'
import Alerts from '@/services/alerts'
import NameGenerator from '@/utils/name-generator'

export default {
    name: 'CreateProject',
    components: {
        FormRow,
        RefreshIcon,
        ExportProjectComponents,
        SectionTopMenu,
        NavItem,
        SideNavigation
    },
    mixins: [formatCurrency],
    props: ['sourceProjectId'],
    data () {
        return {
            loading: false,
            sourceProject: null,
            subscription: null,
            mounted: false,
            icons: {
                chevronLeft: ChevronLeftIcon
            },
            init: false,
            stacks: [],
            templates: [],
            projectTypes: [],
            input: {
                name: NameGenerator(),
                stack: '',
                template: '',
                billingConfirmation: false,
                projectType: ''
            },
            errors: {
                stack: '',
                name: '',
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
        ...mapState('account', ['features', 'team']),
        isCopyProject () {
            return !!this.sourceProjectId
        },
        createEnabled () {
            return this.input.stack && this.input.name && !this.errors.name && this.input.template && (this.features.billing ? this.input.billingConfirmation : true)
        },
        selectedProjectTypeCostAfterCredit () {
            return (this.selectedProjectType?.cost ?? 0) + (this.subscription?.customer?.balance ?? 0)
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
                const projectType = this.projectTypes.find(pt => pt.id === value)

                this.selectedProjectType = {
                    name: projectType.name,
                    currency: projectType.properties?.billingDescription?.split('/')[0].replace(/[\d.]+/, ''),
                    cost: (Number(projectType.properties?.billingDescription?.split('/')[0].replace(/[^\d.]+/, '')) || 0) * 100,
                    interval: projectType.properties?.billingDescription?.split('/')[1]
                }

                const stackList = await stacksApi.getStacks(null, null, null, value)
                this.stacks = stackList.stacks.filter(stack => stack.active)
                this.input.stack = null
                if (this.stacks.length === 0) {
                    this.errors.stack = 'No stacks available. Ask an Administrator to create a new stack definition'
                } else {
                    this.errors.stack = ''
                    this.$nextTick(() => {
                        if (this.sourceProject) {
                            if (this.stacks.find(st => st.id === this.sourceProject.stack.id)) {
                                this.input.stack = this.sourceProject.stack.id
                            } else {
                                this.input.stack = this.stacks[0].id
                            }
                        } else {
                            if (projectType.defaultStack) {
                                this.input.stack = projectType.defaultStack
                                const defaultStack = this.stacks.find(st => st.id === this.input.stack)
                                if (!defaultStack) {
                                    this.input.stack = this.stacks[0].id
                                }
                            } else {
                                this.input.stack = this.stacks[0].id
                            }
                        }
                    })
                }
            }
        }
    },
    async created () {
        const projectTypesPromise = projectTypesApi.getProjectTypes()
        const templateListPromise = templatesApi.getTemplates()
        const billingSubscriptionPromise = billingApi.getSubscriptionInfo(this.team.id)

        this.projectTypes = (await projectTypesPromise).types
        this.templates = (await templateListPromise).templates.filter(template => template.active)
        this.subscription = await billingSubscriptionPromise

        this.init = true

        this.$nextTick(() => {
            if (this.projectTypes.length === 0) {
                this.errors.projectTypes = 'No project types available. Ask an Administrator to create a new project type'
            }

            if (!this.sourceProjectId) {
                this.input.stack = this.stacks.length > 0 ? this.stacks[0].id : ''
                this.input.template = this.templates.length > 0 ? this.templates[0].id : ''
            }

            if (this.templates.length === 0) {
                this.errors.template = 'No templates available. Ask an Administrator to create a new template definition'
            }
        })
    },
    async beforeMount () {
        if (this.features.billing && !this.team.billingSetup) {
            this.$router.push({
                path: `/team/${this.team.slug}/billing`
            })
        }
    },
    mounted () {
        this.mounted = true
        if (this.sourceProjectId) {
            projectApi.getProject(this.sourceProjectId).then(project => {
                this.sourceProject = project
                this.input.projectType = this.sourceProject.projectType?.id || ''
                this.input.stack = this.sourceProject.stack?.id || this.stacks?.[0]?.id || ''
                this.input.template = this.sourceProject.template?.id || this.templates?.[0]?.id || ''
            }).catch(err => {
                console.log('Failed to load project', err)
            })
        }
    },
    methods: {
        createProject () {
            this.loading = true
            const createPayload = { ...this.input, team: this.team.id }
            if (this.isCopyProject) {
                createPayload.sourceProject = {
                    id: this.sourceProjectId,
                    options: { ...this.copyParts }
                }
            }
            projectApi.create(createPayload).then(result => {
                this.$router.push({ name: 'Project', params: { id: result.id } })
            }).catch(err => {
                this.loading = false
                if (err.response?.status === 409) {
                    this.errors.name = err.response.data.error
                } else if (err.response?.status === 400) {
                    Alerts.emit('Failed to create project: ' + err.response.data.error, 'warning', 7500)
                } else {
                    console.log(err)
                }
            })
        },
        refreshName () {
            this.input.name = NameGenerator()
        }
    }
}
</script>
