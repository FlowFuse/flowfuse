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
            <InstanceForm
                v-else
                :instance="projectDetails"
                :team="team"
                :applicationFieldsLocked="!!application?.id"
                :applicationFieldsVisible="true"
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

import ApplicationApi from '../../api/application'
import InstanceApi from '../../api/instances'

import InstanceForm from '../instance/components/InstanceForm'

import NavItem from '../../components/NavItem'
import SideNavigation from '../../components/SideNavigation'
import TeamTrialBanner from '../../components/banners/TeamTrial.vue'
import Alerts from '../../services/alerts'

export default {
    name: 'CreateApplication',
    components: {
        InstanceForm,
        NavItem,
        SideNavigation,
        TeamTrialBanner
    },
    data () {
        return {
            icons: {
                chevronLeft: ChevronLeftIcon
            },
            loading: false,
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
            return ApplicationApi.createApplication(createPayload)
        },
        createProject (projectDetails, copyParts) {
            const createPayload = { ...projectDetails, applicationId: this.application.id }
            return InstanceApi.create(createPayload)
        }
    }
}
</script>
