<template>
    <ff-page>
        <template #header>
            <ff-page-header title="Applications">
                <template #context>
                    A list of applications belonging to this Team.
                </template>
                <template #help-header>
                    Applications
                </template>
                <template #helptext>
                    <p>This is a list of all Applications hosted on the same domain as FlowFuse.</p>
                    <p>Each Application can host multiple Node-RED instances.</p>
                    <p>Click an application header to go to the overview of that application.</p>
                    <p>Click an instance within an application to go to the Instances overview.</p>
                </template>
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
            </ff-page-header>
        </template>
        <div class="space-y-6">
            <ff-loading v-if="loading" message="Loading Applications..." />
            <template v-else-if="!loading && applications.size > 0">
                <ul class="ff-applications-list">
                    <li v-for="application in Array.from(applications.values())" :key="application.id">
                        <div class="ff-application-list--app gap-x-4 flex items-center !justify-start" data-action="view-application" @click="openApplication(application)">
                            <span class="flex flex-shrink-0 flex-grow-0 whitespace-nowrap"><TemplateIcon class="ff-icon text-gray-600" />{{ application.name }}</span>
                            <span class="!inline-block !flex-shrink !flex-grow italic text-gray-500 dark:text-gray-400 truncate"> {{ application.description }} </span>
                            <label class="!inline-block italic text-gray-400 text-sm whitespace-nowrap flex-shrink-0 flex-grow-0">
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
                                <InstanceEditorLinkCell
                                    :id="instance.id"
                                    :url="instance.url"
                                    :editorDisabled="!!(instance.settings?.disableEditor)"
                                    :disabled="instance.meta?.state !== 'running'"
                                    :isHA="instance.ha?.replicas !== undefined"
                                />
                                <InstanceStatusPolling :instance="instance" @instance-updated="instanceUpdated" />
                            </li>
                        </ul>
                        <div v-else class="ff-no-data">
                            This Application currently has no attached Node-RED Instances.
                        </div>
                    </li>
                </ul>
            </template>
            <div v-else>
                <EmptyState>
                    <template #img>
                        <img src="../../images/empty-states/team-applications.png">
                    </template>
                    <template #header>Get Started with your First Application</template>
                    <template #message>
                        <p>Applications in FlowFuse are used to manage groups of Node-RED Instances</p>
                        <p>
                            Instances within Applications can be connected as
                            <a class="ff-link" href="https://flowfuse.com/docs/user/staged-deployments" target="_blank">Staged Deployments.</a>
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
                    <template #note>
                        <p>
                            The FlowFuse team also have more planned for Applications, including
                            <a class="ff-link" href="https://github.com/flowforge/flowforge/issues/1734" target="_blank">
                                shared settings across Instances</a>.
                        </p>
                    </template>
                </EmptyState>
            </div>
        </div>
        <router-view />
    </ff-page>
</template>

<script>
import { PlusSmIcon, TemplateIcon } from '@heroicons/vue/outline'

import teamApi from '../../api/team.js'
import EmptyState from '../../components/EmptyState.vue'
import InstanceStatusPolling from '../../components/InstanceStatusPolling.vue'
import ProjectIcon from '../../components/icons/Projects.js'
import permissionsMixin from '../../mixins/Permissions.js'
import Alerts from '../../services/alerts.js'
import InstanceStatusBadge from '../instance/components/InstanceStatusBadge.vue'
import InstanceEditorLinkCell from '../instance/components/cells/InstanceEditorLink.vue'
export default {
    name: 'TeamApplications',
    components: {
        EmptyState,
        InstanceEditorLinkCell,
        InstanceStatusBadge,
        InstanceStatusPolling,
        PlusSmIcon,
        ProjectIcon,
        TemplateIcon
    },
    mixins: [permissionsMixin],
    props: {
        team: {
            type: Object,
            required: true
        },
        teamMembership: {
            type: Object,
            required: true
        }
    },
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
        if ('billing_session' in this.$route.query) {
            this.$nextTick(() => {
                // allow the Alerts servcie to have subscription by wrapping in nextTick
                Alerts.emit('Thanks for signing up to FlowFuse!', 'confirmation')
            })
        }
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
