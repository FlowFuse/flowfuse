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
                            <div><InstanceStatusBadge :status="instance.meta?.state" :optimisticStateChange="instance.optimisticStateChange" :pendingStateChange="instance.pendingStateChange" /></div>
                            <div class="text-sm">
                                <span v-if="instance.flowLastUpdatedSince" class="flex flex-col">
                                    <label class="text-xs text-gray-400">Last Updated: </label>
                                    {{ instance.flowLastUpdatedSince || 'never' }}
                                </span>
                                <span v-else class="text-gray-400 italic">
                                    flows never deployed
                                </span>
                            </div>
                            <div class="flex justify-end">
                                <InstanceEditorLink
                                    :url="instance.url"
                                    :editorDisabled="instance.settings.disableEditor"
                                    :disabled="instance.meta?.state !== 'running'"
                                />
                            </div>

                            <InstanceStatusPolling :instance="instance" @instance-updated="instanceUpdated" />
                        </li>
                    </ul>
                    <div v-else class="ff-no-data">
                        This Application currently has no attached Node-RED Instances.
                    </div>
                </li>
            </ul>
        </template>
        <div v-else-if="justSetupBilling">
            <div class=" mt-8 text-center text-lg">
                <strong class="mb-2 block">Thank you for signing up to FlowForge!</strong>
                You are now able to create applications, instances & devices.
            </div>
        </div>
        <div v-else class="ff-no-data">
            No Applications Created
        </div>
        <div v-else>
            <EmptyState>
                <template #header>Get Started with your First Application</template>
                <template #message>
                    <p>Applications in FlowForge are used to manage groups of Node-RED Instances</p>
                    <p>
                        Instances within Applications can share settings like <a class="ff-link"
                        href="https://flowforge.com/docs/user/envvar/">Environment Variables</a>,
                        and be connected as <a class="ff-link" href="https://flowforge.com/docs/user/staged-deployments"
                        target="_blank">Staged Deployments.</a>
                    </p>
                </template>
                <template #actions>
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
            </EmptyState>
        </div>
    </div>
    <router-view />
</template>

<script>
import { PlusSmIcon, TemplateIcon } from '@heroicons/vue/outline'

import teamApi from '../../api/team.js'
import EmptyState from '../../components/EmptyState.vue'
import InstanceStatusPolling from '../../components/InstanceStatusPolling.vue'
import SectionTopMenu from '../../components/SectionTopMenu.vue'
import ProjectIcon from '../../components/icons/Projects.js'
import permissionsMixin from '../../mixins/Permissions.js'
import InstanceEditorLink from '../instance/components/InstanceEditorLink.vue'
import InstanceStatusBadge from '../instance/components/InstanceStatusBadge.vue'

export default {
    name: 'TeamApplications',
    components: {
        EmptyState,
        InstanceEditorLink,
        InstanceStatusBadge,
        InstanceStatusPolling,
        PlusSmIcon,
        ProjectIcon,
        SectionTopMenu,
        TemplateIcon
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
    computed: {
        justSetupBilling () {
            return 'billing_session' in this.$route.query
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
        instanceUpdated (instanceData) {
            const application = this.applications.get(instanceData.application.id)
            application.instances.set(instanceData.id, {
                ...application.instances.get(instanceData.id),
                ...instanceData
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
        }
    }
}
</script>

<style lang="scss">
@import "../../stylesheets/components/applications-list.scss";
</style>
