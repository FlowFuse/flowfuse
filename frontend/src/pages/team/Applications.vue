<template>
    <SectionTopMenu hero="Applications">
        <template #tools>
            <ff-button
                v-if="hasPermission('project:create')"
                data-action="create-application"
                kind="primary"
                :to="{name: 'CreateTeamApplication'}"
            >
                <template #icon-left>
                    <PlusSmIcon />
                </template>
                Create Application
            </ff-button>
        </template>
    </SectionTopMenu>
    <div class="space-y-6">
        <ff-loading v-if="loading" message="Loading Applications..." />
        <template v-else-if="!loading && applications.size > 0">
            <ul class="ff-applications-list">
                <li v-for="application in Array.from(applications.values())" :key="application.id">
                    <div class="ff-application-list--app" data-action="view-application" @click="openApplication(application)">
                        <span class="flex justify-center"><TemplateIcon class="ff-icon text-gray-600" />{{ application.name }}</span>
                        <label class="italic text-gray-400 text-sm">
                            {{ application.instances.size }} Instance{{ application.instances.size === 1 ? '' : 's' }}
                        </label>
                    </div>
                    <ul v-if="application.instances.size > 0" class="ff-applications-list-instances">
                        <label>Instances</label>
                        <li v-for="instance in Array.from(application.instances.values())" :key="instance.id" @click.stop="openInstance(instance)">
                            <span class="flex justify-center mr-3">
                                <ProjectIcon class="ff-icon text-gray-600" />
                            </span>
                            <div class="ff-applications-list--instance">
                                <label>{{ instance.name }}</label>
                                <span>{{ instance.url }}</span>
                            </div>
                            <div><InstanceStatusBadge :status="instance.meta?.state" /></div>
                            <div class="text-sm">
                                <span v-if="instance.flowLastUpdatedSince">
                                    {{ instance.flowLastUpdatedSince }}
                                </span>
                                <span v-else class="text-gray-400">
                                    never
                                </span>
                            </div>
                            <div class="flex justify-end">
                                <ff-button kind="secondary" :disabled="instance.settings?.disableEditor" @click.stop="openEditor(instance)">
                                    <template #icon-right><ExternalLinkIcon /></template>
                                    {{ instance.settings?.disableEditor ? 'Editor Disabled' : 'Open Editor' }}
                                </ff-button>
                            </div>
                        </li>
                    </ul>
                    <div v-else class="ff-no-data">
                        This Application currently has no attached Node-RED Instances.
                    </div>
                </li>
            </ul>
        </template>
        <div v-else class="ff-no-data">
            No Applications Created
        </div>
    </div>
    <router-view />
</template>

<script>
import { ExternalLinkIcon, PlusSmIcon, TemplateIcon } from '@heroicons/vue/outline'

import ProjectIcon from '../../components/icons/Projects'

import InstanceStatusBadge from '../instance/components/InstanceStatusBadge.vue'

import teamApi from '../../api/team'
import SectionTopMenu from '../../components/SectionTopMenu'
import permissionsMixin from '../../mixins/Permissions'

export default {
    name: 'TeamApplications',
    components: {
        TemplateIcon,
        ExternalLinkIcon,
        PlusSmIcon,
        ProjectIcon,
        SectionTopMenu,
        InstanceStatusBadge
    },
    mixins: [permissionsMixin],
    props: ['team', 'teamMembership'],
    data () {
        return {
            loading: false,
            applications: new Map(),
            columns: [
                { label: 'Name', class: ['flex-grow'], key: 'name', sortable: true }
            ]
        }
    },
    watch: {
        team: 'fetchData'
    },
    mounted () {
        this.fetchData()
    },
    methods: {
        async fetchData () {
            this.loading = true
            if (this.team.id) {
                this.applications = new Map()

                const applicationsPromise = teamApi.getTeamApplications(this.team.id)

                // Not waited for as it can resolve in any order
                this.updateInstanceStatuses()

                const applications = (await applicationsPromise).applications
                applications.forEach((applicationData) => {
                    const application = this.applications.get(applicationData.id) || {}
                    if (!application.instances) {
                        application.instances = new Map()
                    }

                    const { instances, ...applicationProps } = applicationData
                    instances.forEach((instanceData) => {
                        application.instances.set(instanceData.id, {
                            ...application.instances.get(instanceData.id),
                            ...instanceData
                        })
                    })

                    this.applications.set(applicationData.id, {
                        ...application,
                        ...applicationProps
                    })
                })
            }
            this.loading = false
        },
        async updateInstanceStatuses () {
            const instanceStatusesByApplication = (await teamApi.getTeamApplicationsInstanceStatuses(this.team.id)).applications

            instanceStatusesByApplication.forEach((applicationData) => {
                const application = this.applications.get(applicationData.id) || {}
                if (!application.instances) {
                    application.instances = new Map()
                }

                const { instances: instanceStatuses, ...applicationProps } = applicationData
                instanceStatuses.forEach((instanceStatusData) => {
                    application.instances.set(instanceStatusData.id, {
                        ...application.instances.get(instanceStatusData.id),
                        ...instanceStatusData
                    })
                })

                this.applications.set(applicationData.id, {
                    ...application,
                    ...applicationProps
                })
            })
        },
        openApplication (application) {
            this.$router.push({
                name: 'Application',
                params: {
                    id: application.id
                }
            })
        },
        openInstance (instance) {
            this.$router.push({
                name: 'Instance',
                params: {
                    id: instance.id
                }
            })
        },
        openEditor (instance) {
            window.open(instance.url, '_blank')
        }
    }
}
</script>

<style lang="scss">
@import "../../stylesheets/components/applications-list.scss";
</style>
