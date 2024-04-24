<template>
    <ff-page>
        <template #header>
            <ff-page-header title="Applications">
                <template #context>
                    View all of your Node-RED instances.
                </template>
                <template #help-header>
                    Applications
                </template>
                <template #pictogram>
                    <img src="../../images/pictograms/application_red.png">
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
                <ul class="ff-applications-list" data-el="applications-list">
                    <li v-for="application in Array.from(applications.values())" :key="application.id">
                        <div class="ff-application-list--app gap-x-4 flex flex-col gap-2 sm:gap-0 justify-between sm:flex-row sm:items-center" data-action="view-application" @click="openApplication(application)">
                            <div class="flex items-cente flex-wrap">
                                <span class="ff-application-list--icon flex flex-shrink-0 flex-grow-0 whitespace-nowrap gap-2 w-full"><TemplateIcon class="ff-icon text-gray-600" />{{ application.name }}</span>
                                <span class="!inline-block !flex-shrink !flex-grow italic text-gray-500 dark:text-gray-400 truncate"> {{ application.description }} </span>
                            </div>
                            <ApplicationSummaryLabel :application="application" />
                        </div>

                        <ul v-if="application.instances.size > 0" class="ff-applications-list-instances" data-el="application-instances">
                            <label>Instances</label>
                            <li v-for="instance in Array.from(application.instances.values())" :key="instance.id" @click.stop="openInstance(instance)">
                                <span class="flex justify-center mr-3">
                                    <IconNodeRedSolid class="ff-icon ff-icon-lg text-red-800" />
                                </span>
                                <div class="ff-applications-list--instance">
                                    <label>{{ instance.name }}</label>
                                    <span>{{ instance.url }}</span>
                                </div>
                                <div><InstanceStatusBadge :status="instance.meta?.state" :optimisticStateChange="instance.optimisticStateChange" :pendingStateChange="instance.pendingStateChange" /></div>
                                <div class="text-sm">
                                    <span v-if="!instance.mostRecentAuditLogCreatedAt || (instance.flowLastUpdatedAt > instance.mostRecentAuditLogCreatedAt)" class="flex flex-col">
                                        Flows last deployed
                                        <label class="text-xs text-gray-400">{{ instance.flowLastUpdatedSince || 'never' }}</label>
                                    </span>
                                    <span v-else-if="instance.mostRecentAuditLogCreatedAt" class="flex flex-col">
                                        {{ labelForAuditLogEntry(instance.mostRecentAuditLogEvent) }}
                                        <label class="text-xs text-gray-400"><DaysSince :date="instance.mostRecentAuditLogCreatedAt" /></label>
                                    </span>
                                    <span v-else class="text-gray-400 italic">
                                        Flows never deployed
                                    </span>
                                </div>
                                <div class="grid grid-flow-col">
                                    <DashboardLinkCell
                                        v-if="instance.settings?.dashboard2UI"
                                        :disabled="instance.meta?.state !== 'running'"
                                        :instance="instance"
                                    />
                                    <InstanceEditorLinkCell
                                        :id="instance.id"
                                        :editorDisabled="!!(instance.settings?.disableEditor)"
                                        :disabled="instance.meta?.state !== 'running'"
                                        :isHA="instance.ha?.replicas !== undefined"
                                        :instance="instance"
                                    />
                                </div>
                                <InstanceStatusPolling :instance="instance" @instance-updated="instanceUpdated" />
                            </li>
                        </ul>
                        <div v-else class="ff-no-data">
                            This Application currently has no <router-link :to="`/application/${application.id}/instances`" class="ff-link">attached Node-RED Instances</router-link>.
                        </div>
                        <div v-if="application.instanceCount > application.instances.size" class="ff-applications-list--details">
                            Only the {{ application.instances.size }} <router-link :to="`/application/${application.id}/instances`" class="ff-link">instances</router-link>  with the most recent activity are being displayed.
                        </div>

                        <ul v-if="application.devices.size > 0" class="ff-applications-list-instances" data-el="application-devices">
                            <label>Devices</label>
                            <li v-for="device in Array.from(application.devices.values())" :key="device.id" @click.stop="openDevice(device)">
                                <DeviceModeBadge :mode="device.mode" type="icon" class="flex justify-center mr-3" />
                                <div class="ff-applications-list--instance">
                                    <label>{{ device.name }}</label>
                                    <span>{{ device.editor?.url }}</span>
                                </div>
                                <div><StatusBadge :status="device.status" /></div>
                                <div class="text-sm">
                                    <span v-if="device.mostRecentAuditLogCreatedAt" class="flex flex-col">
                                        {{ labelForAuditLogEntry(device.mostRecentAuditLogEvent) }}
                                        <label class="text-xs text-gray-400"><DaysSince :date="device.mostRecentAuditLogCreatedAt" /></label>
                                    </span>
                                    <span v-else class="flex flex-col">
                                        Device last seen
                                        <label class="text-xs text-gray-400">
                                            <DaysSince v-if="device.lastSeenAt" :date="device.lastSeenAt" />
                                            <template v-else>never</template>
                                        </label>
                                    </span>
                                </div>

                                <div class="flex justify-end text-sm">
                                    <EditorLink
                                        :url="device.editor?.url"
                                        :editorDisabled="false"
                                        :disabled="!device.editor?.enabled || !device.editor?.connected || !device.editor?.local"
                                        disabledReason="Device must be running, in developer mode and have the editor enabled and connected"
                                    />
                                </div>
                            </li>
                        </ul>
                        <div v-else class="ff-no-data">
                            This Application currently has no <router-link :to="`/application/${application.id}/devices`" class="ff-link">attached devices</router-link>.
                        </div>

                        <div v-if="application.deviceCount > application.devices.size" class="ff-applications-list--details">
                            Only the {{ application.devices.size }} <router-link :to="`/application/${application.id}/devices`" class="ff-link">devices</router-link> with the most recent activity are being displayed.
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
                            <a class="ff-link" href="https://github.com/FlowFuse/flowfuse/issues/1734" target="_blank">
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
import StatusBadge from '../../components/StatusBadge.vue'
import IconNodeRedSolid from '../../components/icons/NodeRedSolid.js'
import permissionsMixin from '../../mixins/Permissions.js'
import Alerts from '../../services/alerts.js'
import AuditEventsService from '../../services/audit-events.js'
import DaysSince from '../application/Snapshots/components/cells/DaysSince.vue'
import DeviceModeBadge from '../device/components/DeviceModeBadge.vue'
import EditorLink from '../instance/components/EditorLink.vue'
import InstanceStatusBadge from '../instance/components/InstanceStatusBadge.vue'
import DashboardLinkCell from '../instance/components/cells/DashboardLink.vue'
import InstanceEditorLinkCell from '../instance/components/cells/InstanceEditorLink.vue'

import ApplicationSummaryLabel from './components/ApplicationSummaryLabel.vue'

const ASSOCIATIONS_LIMIT = 3

export default {
    name: 'TeamApplications',
    components: {
        ApplicationSummaryLabel,
        DashboardLinkCell,
        DaysSince,
        DeviceModeBadge,
        EditorLink,
        EmptyState,
        IconNodeRedSolid,
        InstanceEditorLinkCell,
        InstanceStatusBadge,
        InstanceStatusPolling,
        PlusSmIcon,
        StatusBadge,
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
    setup () {
        return {
            AuditEvents: AuditEventsService.get()
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
                // Clear the query param so a reload of the page does retrigger
                // the notification
                this.$router.replace({ query: '' })
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

                const applicationsPromise = teamApi.getTeamApplications(this.team.id, { associationsLimit: ASSOCIATIONS_LIMIT })

                // Not waited for as it can resolve in any order
                this.updateApplicationAssociationStatuses()

                const applications = (await applicationsPromise).applications
                applications.forEach((applicationData) => {
                    const application = this.applications.get(applicationData.id) || {}
                    if (!application.instances) {
                        application.instances = new Map()
                    }

                    const { instancesSummary, devicesSummary, ...applicationProps } = applicationData
                    instancesSummary.instances.forEach((instanceData) => {
                        application.instances.set(instanceData.id, {
                            ...application.instances.get(instanceData.id),
                            ...instanceData
                        })
                    })

                    if (!application.devices) {
                        application.devices = new Map()
                    }
                    devicesSummary.devices.forEach((deviceData) => {
                        application.devices.set(deviceData.id, {
                            ...application.devices.get(deviceData.id),
                            ...deviceData
                        })
                    })

                    application.instanceCount = instancesSummary.count
                    application.deviceCount = devicesSummary.count

                    this.applications.set(applicationData.id, {
                        ...application,
                        ...applicationProps
                    })
                })
            }
            this.loading = false
        },
        async updateApplicationAssociationStatuses () {
            const applicationsAssociationsStatuses = (await teamApi.getTeamApplicationsAssociationsStatuses(this.team.id, { associationsLimit: ASSOCIATIONS_LIMIT })).applications

            applicationsAssociationsStatuses.forEach((applicationData) => {
                const application = this.applications.get(applicationData.id) || {}

                if (!application.instances) {
                    application.instances = new Map()
                }

                if (!application.devices) {
                    application.devices = new Map()
                }

                const { instances: instanceStatuses, devices: deviceStatuses, ...applicationProps } = applicationData
                instanceStatuses.forEach((instanceStatusData) => {
                    application.instances.set(instanceStatusData.id, {
                        ...application.instances.get(instanceStatusData.id),
                        ...instanceStatusData
                    })
                })

                deviceStatuses.forEach((deviceStatusData) => {
                    application.devices.set(deviceStatusData.id, {
                        ...application.devices.get(deviceStatusData.id),
                        ...deviceStatusData
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
        },
        openDevice (device) {
            this.$router.push({
                name: 'Device',
                params: {
                    id: device.id
                }
            })
        },
        labelForAuditLogEntry (eventName) {
            if (!eventName) return 'Unknown Event'
            if (this.AuditEvents[eventName]) {
                return this.AuditEvents[eventName]
            }
            let labelText = eventName
            labelText = labelText.replace(/[-._:]/g, ' ')
            labelText = labelText.replace(/\b\w/g, l => l.toUpperCase())
            labelText = labelText.replace(/([a-z])([A-Z])/g, '$1 $2')
            return labelText
        }
    }
}
</script>

<style lang="scss">
@import "../../stylesheets/components/applications-list.scss";
</style>
