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
                    <FormRow :error="errors.name" v-model="input.name">
                        <template v-slot:default>Project Name</template>
                        <template v-slot:append>
                            <ff-button kind="secondary" @click="refreshName"><template v-slot:icon><RefreshIcon /></template></ff-button>
                        </template>
                    </FormRow>
                    <span class="block text-xs ml-4 italic text-gray-500 m-0 max-w-sm">Please note, currently, project names cannot be changed once a project is created</span>
                </div>
                <div v-if="this.errors.projectTypes" class="text-red-400 text-xs">{{errors.projectTypes}}</div>
                <!-- Project Type -->
                <div v-else class="flex flex-wrap gap-1 items-stretch">
                    <label class="w-full block text-sm font-medium text-gray-700 mb-1">Project Type</label>
                    <ff-tile-selection v-model="input.projectType" >
                        <ff-tile-selection-option v-for="(projType, index) in projectTypes" :key="index"
                                                  :label="projType.name" :description="projType.description"
                                                  :price="projType.properties?.billingDescription?.split('/')[0]"
                                                  :price-interval="projType.properties?.billingDescription?.split('/')[1]"
                                                  :value="projType.id"/>
                    </ff-tile-selection>
                </div>
                <!-- Stack -->
                <!-- <FormRow :options="stacks" :error="errors.stack" v-model="input.stack" id="stack">Stack</FormRow> -->
                <div class="flex flex-wrap gap-1 items-stretch">
                    <label class="w-full block text-sm font-medium text-gray-700 mb-1">Stack</label>
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

                <FormRow v-if="this.features.billing" type="checkbox" v-model="input.billingConfirmation" id="billing-confirmation">
                    Confirm additional charges
                    <template v-slot:description>
                        {{ billingDescription }}
                    </template>
                </FormRow>

                <ff-button :disabled="!createEnabled" @click="createProject" data-action="create-project">Create Project</ff-button>
            </form>
        </div>
    </main>
</template>

<script>
import { mapState } from 'vuex'

import projectApi from '@/api/project'
import projectTypesApi from '@/api/projectTypes'
import stacksApi from '@/api/stacks'
import templatesApi from '@/api/templates'

import Alerts from '@/services/alerts'

import NavItem from '@/components/NavItem'
import SectionTopMenu from '@/components/SectionTopMenu'

import SideNavigation from '@/components/SideNavigation'

import FormRow from '@/components/FormRow'
import NameGenerator from '@/utils/name-generator'
import { RefreshIcon } from '@heroicons/vue/outline'

import ExportProjectComponents from '../project/components/ExportProjectComponents'

import { ChevronLeftIcon } from '@heroicons/vue/solid'

export default {
    name: 'CreateProject',
    props: ['sourceProjectId'],
    data () {
        return {
            loading: false,
            sourceProject: null,
            mounted: false,
            icons: {
                chevronLeft: ChevronLeftIcon
            },
            init: false,
            stacks: [],
            templates: [],
            projectTypes: [],
            billingDescription: '',
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
            }
        }
    },
    computed: {
        ...mapState('account', ['features', 'team']),
        isCopyProject () {
            return !!this.sourceProjectId
        },
        createEnabled () {
            return this.input.stack && this.input.name && !this.errors.name && this.input.template && (this.features.billing ? this.input.billingConfirmation : true)
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
                this.billingDescription = projectType.properties?.billingDescription || ''
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
        const projectTypes = await projectTypesApi.getProjectTypes()
        this.projectTypes = projectTypes.types

        const templateList = await templatesApi.getTemplates()
        this.templates = templateList.templates.filter(template => template.active)
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
    },
    components: {
        FormRow,
        RefreshIcon,
        ExportProjectComponents,
        SectionTopMenu,
        NavItem,
        SideNavigation
    }
}
</script>
