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
                message="Creating Instance..."
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
                :billing-enabled="!!features.billing"
                :submit-errors="errors"
                @on-submit="createProject"
            />
        </div>
    </main>
</template>

<script>
import { mapState } from 'vuex'

import { ChevronLeftIcon } from '@heroicons/vue/solid'

import InstanceForm from '../instance/components/InstanceForm'
import TeamTrialBanner from '@/components/banners/TeamTrial.vue'

import projectApi from '@/api/project'
import NavItem from '@/components/NavItem'
import SideNavigation from '@/components/SideNavigation'
import Alerts from '@/services/alerts'

export default {
    name: 'CreateProject',
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
            projectDetails: null
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
        createProject (projectDetails) {
            this.loading = true
            const createPayload = { ...projectDetails, team: this.team.id }
            if (this.isCopyProject) {
                createPayload.sourceProject = {
                    id: this.sourceProjectId,
                    options: { ...this.copyParts }
                }
            }
            projectApi.create(createPayload).then(async result => {
                await this.$store.dispatch('account/refreshTeam')
                this.$router.push({ name: 'Project', params: { id: result.id } })
            }).catch(err => {
                this.loading = false
                this.projectDetails = projectDetails
                if (err.response?.status === 409) {
                    this.errors.name = err.response.data.error
                } else if (err.response?.status === 400) {
                    Alerts.emit('Failed to create project: ' + err.response.data.error, 'warning', 7500)
                } else {
                    console.log(err)
                }
            })
        }
    }
}
</script>
