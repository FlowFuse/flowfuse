<template>
    <Teleport v-if="mounted" to="#platform-sidenav">
        <SideNavigation>
            <template v-slot:options>
                <a @click="$router.back()">
                    <nav-item :icon="icons.chevronLeft" label="Back"></nav-item>
                </a>
            </template>
        </SideNavigation>
    </Teleport>
    <main>
        <div class="max-w-2xl m-auto">
            <ff-loading v-if="loading" message="Updating Project..."/>
            <form v-else class="space-y-6">
                <SectionTopMenu hero="Change Project Type"></SectionTopMenu>
                <div class="mb-8 text-sm text-gray-500">
                    <template>Here you can change the project type of this Node-RED project. Note: Running project</template>
                </div>
                <div>
                    <FormRow v-model="input.name" disabled>
                        <template #default>Project Name</template>
                    </FormRow>
                </div>
                <div v-if="this.errors.projectTypes" class="text-red-400 text-xs">{{errors.projectTypes}}</div>
                <!-- Project Type -->
                <div v-else class="flex flex-wrap items-stretch">
                    <label class="w-full block text-sm font-medium text-gray-700">Choose your Project Type</label>
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
                <div class="flex flex-wrap gap-1 items-stretch">
                    <label class="w-full block text-sm font-medium text-gray-700 mb-4">Choose your Stack</label>
                    <label v-if="!input.projectType" class="text-sm text-gray-400">Please select a Project Type first.</label>
                    <label v-if="errors.stack" class="text-sm text-gray-400">{{ errors.stack }}</label>
                    <ff-tile-selection v-if="input.projectType" v-model="input.stack" >
                        <ff-tile-selection-option v-for="(stack, index) in stacks" :key="index"
                                                  :value="stack.id" :label="stack.label || stack.name"/>
                    </ff-tile-selection>
                </div>
                <!-- Template // Allow template change? -->
                <!-- <div v-if="templates.length !== 1" class="flex flex-wrap gap-1 items-stretch">
                    <label class="w-full block text-sm font-medium text-gray-700 mb-1">Template</label>
                    <label v-if="!input.projectType || !input.stack" class="text-sm text-gray-400">Please select a Project Type &amp; Stack first.</label>
                    <label v-if="errors.template" class="text-sm text-gray-400">{{ errors.template }}</label>
                    <ff-tile-selection v-if="input.projectType && input.stack" v-model="input.template" >
                        <ff-tile-selection-option v-for="(t, index) in templates" :key="index"
                                                  :value="t.id" :disabled="isCopyProject"
                                                  :label="t.name" :description="t.description"/>
                    </ff-tile-selection>
                </div> -->

                <div v-if="features.billing && input.projectType && projectTypeChanged">
                    <div v-if="selectedProjectType?.cost > 0 || subscription?.customer?.balance > 0" class="pb-4 mb-4 border-b border-gray-300" data-el="charges-table">
                        <h1 class="text-lg font-medium mb-2 border-b border-gray-700">Charges</h1>
                        <div v-if="subscription?.customer?.balance" class="text-sm text-blue-600 italic" data-el="credit-balance-banner">
                            You have a credit balance of {{ formatCurrency(Math.abs(subscription.customer.balance)) }} that will be applied to this project
                        </div>
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
                <div class="flex flex-wrap gap-1">
                    <ff-button @click="$router.back()" class="ff-btn--secondary">Cancel</ff-button>
                    <ff-button :disabled="!confirmEnabled" data-action="change-project-type" @click="changeProjectType">Confirm Changes</ff-button>
                </div>
                <label v-if="errors.confirmEnabled" class="text-sm text-gray-400">{{ errors.confirmEnabled }}</label>
            </form>
        </div>
    </main>
</template>

<script>
import { ChevronLeftIcon } from '@heroicons/vue/solid'
import { mapState } from 'vuex'

import billingApi from '@/api/billing.js'
import projectApi from '../../../api/project'
import projectTypesApi from '@/api/projectTypes'
import stacksApi from '@/api/stacks'
// import templatesApi from '@/api/templates' // Allow template change?

import FormRow from '@/components/FormRow'
import NavItem from '@/components/NavItem'
import SectionTopMenu from '@/components/SectionTopMenu'
import SideNavigation from '@/components/SideNavigation'

import formatCurrency from '@/mixins/Currency.js'
import Alerts from '@/services/alerts'

export default {
    name: 'CreateProject',
    components: {
        FormRow,
        SectionTopMenu,
        NavItem,
        SideNavigation
    },
    mixins: [formatCurrency],
    data () {
        return {
            projectId: '',
            loading: false,
            subscription: null,
            mounted: false,
            icons: {
                chevronLeft: ChevronLeftIcon
            },
            init: false,
            project: null,
            projectTypes: [],
            stacks: [],
            // templates: [], // Allow template change?
            input: {
                projectType: '',
                stack: '',
                // template: '', // Allow template change?
                billingConfirmation: false
            },
            errors: {
                confirmEnabled: '',
                projectTypes: '',
                stack: ''
                // template: '' // Allow template change?
            },
            selectedProjectType: null
        }
    },
    computed: {
        ...mapState('account', ['features', 'team']),
        projectTypeChanged () {
            return this.project?.projectType?.id !== this.input.projectType
        },
        confirmEnabled () {
            // Allow template change?
            // const hasValues = this.input.projectType && this.input.stack && this.input.template && (this.features.billing ? this.input.billingConfirmation : true)
            // const hasChanged = this.project?.projectType?.id !== this.input.projectType ||
            //     ((this.project?.stack?.id || this.stacks?.[0]?.id) !== this.input.stack) ||
            //     ((this.project?.template?.id || this.templates?.[0]?.id) !== this.input.template)

            const billingConfirmed = (this.features.billing ? this.input.billingConfirmation : true) || !this.projectTypeChanged
            const hasValues = this.input.projectType && this.input.stack
            const hasChanged = this.projectTypeChanged || ((this.project?.stack?.id || this.stacks?.[0]?.id) !== this.input.stack)

            // eslint-disable-next-line vue/no-side-effects-in-computed-properties
            this.errors.confirmEnabled = billingConfirmed && hasValues && !hasChanged ? 'No changes have been made' : ''

            return billingConfirmed && hasValues && hasChanged
        },
        selectedProjectTypeCostAfterCredit () {
            return (this.selectedProjectType?.cost ?? 0) + (this.subscription?.customer?.balance ?? 0)
        }
    },
    watch: {
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
                        if (this.input.projectType === this.project?.projectType?.id) {
                            this.input.stack = this.project?.stack?.id
                        } else if (projectType.defaultStack) {
                            this.input.stack = projectType.defaultStack
                            const defaultStack = this.stacks.find(st => st.id === this.input.stack)
                            if (!defaultStack) {
                                this.input.stack = this.stacks[0].id
                            }
                        } else {
                            this.input.stack = this.stacks[0].id
                        }
                    })
                }
            }
        }
    },
    async created () {
        this.project = null
        const projectTypesPromise = projectTypesApi.getProjectTypes()
        // const templateListPromise = templatesApi.getTemplates() // Allow template change?
        const billingSubscriptionPromise = billingApi.getSubscriptionInfo(this.team.id)

        this.projectTypes = (await projectTypesPromise).types
        // this.templates = (await templateListPromise).templates.filter(template => template.active)
        this.subscription = await billingSubscriptionPromise

        this.init = true

        this.$nextTick(() => {
            if (this.projectTypes.length === 0) {
                this.errors.projectTypes = 'No project types available. Ask an Administrator to create a new project type'
            }

            // Allow template change?
            // if (this.templates.length === 0) {
            //     this.errors.template = 'No templates available. Ask an Administrator to create a new template definition'
            // }
        })
    },
    async beforeMount () {
        if (this.features.billing && !this.team.billingSetup) {
            this.$router.push({
                path: `/team/${this.team.slug}/billing`
            })
        }
    },
    async mounted () {
        this.mounted = true
        this.project = null
        this.projectId = this.$route.query.projectId
        await this.loadProject()
    },
    methods: {
        async loadProject () {
            console.log('loadProject')
            this.$nextTick(async () => {
                this.project = await this.getProject(this.projectId)
                this.input.name = this.project?.name || ''
                this.input.projectType = this.project?.projectType?.id || ''
                this.input.stack = this.project?.stack?.id || this.stacks?.[0]?.id || ''
                // Allow template change?
                // this.input.template = this.project?.template?.id || this.templates?.[0]?.id || ''
            })
        },
        async getProject (id) {
            if (!id) {
                return Promise.resolve(null)
            }
            return await projectApi.getProject(id)
        },
        changeProjectType () {
            if (typeof this.project?.projectType?.id !== 'string' || this.project?.projectType?.id === '') {
                Alerts.emit('No project is selected. Try refreshing your browser and try again', 'warning', 3500)
                return
            }
            const changePayload = { ...this.input, team: this.team.id, changeProjectType: true }
            this.loading = true
            projectApi.updateProject(this.project.id, changePayload
            ).then(() => {
                this.$emit('projectUpdated')
                Alerts.emit('Project Type successfully updated.', 'confirmation')
                this.$router.push({
                    name: 'Project'
                })
            }).catch(err => {
                console.warn(err)
                Alerts.emit('Project Type update failed.', 'warning')
            }).finally(() => {
                this.loading = false
            })
        }
    }
}
</script>
