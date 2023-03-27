<template>
    <Teleport
        v-if="mounted"
        to="#platform-sidenav"
    >
        <SideNavigation>
            <template #options>
                <a @click="$router.back()">
                    <nav-item
                        :icon="icons.chevronLeft"
                        label="Back"
                    />
                </a>
            </template>
        </SideNavigation>
    </Teleport>
    <Teleport v-if="mounted" to="#platform-banner">
        <TeamTrialBanner v-if="team.billing?.trial" :team="team" />
    </Teleport>
    <main>
        <div class="max-w-2xl m-auto">
            <ff-loading
                v-if="loading"
                message="Creating Application..."
            />
            <ff-loading
                v-else-if="sourceProjectId && !sourceProject"
                message="Loading Instance to Copy From..."
            />
            <InstanceForm
                v-else
                :instance="projectDetails"
                :source-instance="sourceProject"
                :team="team"
                :applicationFieldsLocked="!!application?.id"
                :billing-enabled="!!features.billing"
                :submit-errors="errors"
                @on-submit="handleFormSubmit"
            />
        </div>
    </main>
</template>

<script>
import { ChevronLeftIcon } from '@heroicons/vue/solid'
import { mapState } from 'vuex'

import applicationApi from '../../api/application'
import InstanceForm from '../instance/components/InstanceForm'

import projectApi from '@/api/project'
import NavItem from '@/components/NavItem'
import SideNavigation from '@/components/SideNavigation'
import TeamTrialBanner from '@/components/banners/TeamTrial.vue'
import Alerts from '@/services/alerts'

export default {
    name: 'CreateApplication',
    components: {
        InstanceForm,
        NavItem,
        SideNavigation,
        TeamTrialBanner
    },
    props: {
        sourceProjectId: {
            default: null,
            type: String
        }
    },
    data () {
        return {
            icons: {
                chevronLeft: ChevronLeftIcon
            },
            loading: false,
            sourceProject: null,
            mounted: false,
            errors: {
                name: ''
            },
            projectDetails: null,
            application: {}
        }
    },
    computed: {
        ...mapState('account', ['features', 'team'])
    },
    created () {
        if (this.sourceProjectId) {
            projectApi.getProject(this.sourceProjectId).then(project => {
                this.sourceProject = project
            }).catch(err => {
                console.log('Failed to load source instance', err)
            })
        }
    },
    async mounted () {
        this.mounted = true
    },
    methods: {
        async handleFormSubmit (formData, copyParts) {
            this.loading = true

            const { applicationName, ...projectFields } = formData
            const applicationFields = { name: applicationName }

            try {
                if (!this.application?.id) {
                    this.application = await this.createApplication(applicationFields)
                }
            } catch (err) {
                if (err.response.data?.error) {
                    Alerts.emit('Failed to create application: ' + err.response.data.error, 'warning', 7500)
                } else {
                    Alerts.emit('Failed to create application', 'warning', 7500)
                    console.error(err)
                }

                this.loading = false
                return
            }

            console.log(this.application)

            try {
                await this.createProject(projectFields, copyParts)

                await this.$store.dispatch('account/refreshTeam')
            } catch (err) {
                this.projectDetails = projectFields
                if (err.response?.status === 409) {
                    this.errors.name = err.response.data.error
                } else if (err.response?.status === 400) {
                    Alerts.emit('Failed to create instance: ' + err.response.data.error, 'warning', 7500)
                } else {
                    Alerts.emit('Failed to create instance')
                    console.error(err)
                }

                this.loading = false
                return
            }

            this.loading = false
            this.$router.push({ name: 'Application', params: { id: this.application.id } })
        },
        createApplication (applicationDetails) {
            const createPayload = { ...applicationDetails, teamId: this.team.id }
            return applicationApi.createApplication(createPayload)
        },
        createProject (projectDetails, copyParts) {
            const createPayload = { ...projectDetails, applicationId: this.application.id }
            if (this.isCopyProject) {
                createPayload.sourceProject = {
                    id: this.sourceProjectId,
                    options: { ...copyParts }
                }
            }

            return projectApi.create(createPayload)
        }
    }
}
</script>
