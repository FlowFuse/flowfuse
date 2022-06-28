<template>
    <Teleport v-if="mounted" to="#platform-sidenav">
        <SideNavigation>
            <template v-slot:options>
                <a @click="$router.back()">
                    <nav-item :icon="icons.chevronLeft" label="Back"></nav-item>
                </a>
            </template>
            <template v-slot:back>
                <ff-team-selection></ff-team-selection>
            </template>
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
                <ul class="flex flex-wrap gap-1 items-stretch">
                    <li v-for="(projType, index) in projectTypes" :key="index">
                        <ProjectTypeSummary :projectType="projType">
                            <template v-slot:header>
                                <div class="absolute">
                                    <input type="radio" name="project-type" :value="projType.id" v-model="input.projectType">
                                </div>
                            </template>
                        </ProjectTypeSummary>
                    </li>
                </ul>
                <FormRow :options="stacks" :error="errors.stack" v-model="input.stack" id="stack">Stack</FormRow>
                <FormRow :options="templates" :disabled="isCopyProject" :error="errors.template" v-model="input.template" id="template">Template</FormRow>
                <template v-if="isCopyProject">
                    <p class="text-gray-500">
                        Select the components to copy from '{{this.sourceProject?.name}}'
                    </p>
                    <ExportProjectComponents id="exportSettings" v-model="copyParts" />
                </template>

                <FormRow v-if="this.features.billing" type="checkbox" v-model="input.billingConfirmation" id="billing-confirmation">
                    Confirm additional charges
                    <template v-slot:description>
                        You will be charged US$15/month for this project.
                    </template>
                </FormRow>

                <ff-button :disabled="!createEnabled" @click="createProject">Create Project</ff-button>
            </form>
        </div>
    </main>
</template>

<script>
import { mapState } from 'vuex'

import teamApi from '@/api/team'
import projectApi from '@/api/project'
import projectTypesApi from '@/api/projectTypes'
import stacksApi from '@/api/stacks'
import templatesApi from '@/api/templates'

import SideTeamSelection from '@/components/SideTeamSelection'
import NavItem from '@/components/NavItem'
import SectionTopMenu from '@/components/SectionTopMenu'

import SideNavigation from '@/components/SideNavigation'

import FormRow from '@/components/FormRow'
import NameGenerator from '@/utils/name-generator'
import { RefreshIcon } from '@heroicons/vue/outline'
import { Roles } from '@core/lib/roles'

import ExportProjectComponents from '../project/components/ExportProjectComponents'
import ProjectTypeSummary from './components/ProjectTypeSummary'

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
            currentTeam: null,
            teams: [],
            stacks: [],
            templates: [],
            projectTypes: [],
            input: {
                name: NameGenerator(),
                team: '',
                stack: '',
                template: '',
                billingConfirmation: false
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
            return this.input.stack && this.input.team && this.input.name && !this.errors.name && this.input.template && (this.features.billing ? this.input.billingConfirmation : true)
        }
    },
    watch: {
        'input.name': function (value, oldValue) {
            if (/^[a-z0-9-]+$/.test(value)) {
                this.errors.name = ''
            } else {
                this.errors.name = 'Names can include a-z, 0-9 & - with no spaces'
            }
        },
        'input.projectType': async function (value, oldValue) {
            if (value) {
                const projectType = this.projectTypes.find(pt => pt.id === value)
                const stackList = await stacksApi.getStacks(null, null, null, value)
                this.stacks = stackList.stacks.filter(stack => stack.active).map(stack => { return { value: stack.id, label: stack.name } })
                if (this.stacks.length === 0) {
                    this.errors.stack = 'No stacks available. Ask an Administator to create a new stack definition'
                } else {
                    this.errors.stack = ''
                    if (projectType.defaultStack) {
                        this.input.stack = projectType.defaultStack
                    } else {
                        this.input.stack = this.stacks[0].value
                    }
                }
            }
        }
    },
    async created () {
        const data = await teamApi.getTeams()
        const filteredTeams = []

        data.teams.forEach((t) => {
            if (t.role !== Roles.Owner) {
                return
            }
            if (t.slug === this.$route.params.team_slug) {
                this.currentTeam = t.id
            }
            filteredTeams.push({ value: t.id, label: t.name })
        })

        if (this.currentTeam == null && filteredTeams.length > 0) {
            this.currentTeam = filteredTeams[0].value
        }
        this.teams = filteredTeams

        const projectTypes = await projectTypesApi.getProjectTypes()
        this.projectTypes = projectTypes.types

        const templateList = await templatesApi.getTemplates()
        this.templates = templateList.templates.filter(template => template.active).map(template => { return { value: template.id, label: template.name } })

        this.init = true

        setTimeout(() => {
            // There must be a better Vue way of doing this, but I can't find it.
            // Without the setTimeout, the select box doesn't update
            this.input.team = this.currentTeam
            if (!this.sourceProjectId) {
                this.input.stack = this.stacks.length > 0 ? this.stacks[0].value : ''
                this.input.template = this.templates.length > 0 ? this.templates[0].value : ''
            }

            if (this.templates.length === 0) {
                this.errors.template = 'No templates available. Ask an Administator to create a new template definition'
            }
        }, 100)
    },
    mounted () {
        this.mounted = true
        if (this.sourceProjectId) {
            projectApi.getProject(this.sourceProjectId).then(project => {
                this.sourceProject = project
                this.input.stack = this.sourceProject.stack?.id || ''
                this.input.template = this.sourceProject.template?.id || ''
            }).catch(err => {
                console.log('Failed to load project', err)
            })
        }
    },
    methods: {
        createProject () {
            this.loading = true
            const createPayload = { ...this.input }
            if (this.isCopyProject) {
                createPayload.sourceProject = {
                    id: this.sourceProjectId,
                    options: { ...this.copyParts }
                }
            }
            projectApi.create(createPayload).then(result => {
                this.$router.push({ name: 'Project', params: { id: result.id } })
            }).catch(err => {
                console.log(err)
                this.loading = false
                if (err.response?.status === 409) {
                    this.errors.name = err.response.data.error
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
        ProjectTypeSummary,
        SectionTopMenu,
        NavItem,
        SideNavigation,
        'ff-team-selection': SideTeamSelection
    }
}
</script>
