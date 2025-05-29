<template>
    <SectionTopMenu
        hero="DevOps Pipelines"
        help-header="FlowFuse - DevOps Pipelines"
        info="Configure automated deployments between your Instances"
    >
        <template #pictogram>
            <img src="../../images/pictograms/pipeline_red.png">
        </template>
        <template #helptext>
            <p>
                DevOps Pipelines are used to link multiple Node-RED instances together
                in a deployment pipeline.
            </p>
            <p>
                This is normally used to define "Development" instances, where you can
                test your new flows without fear or breaking "Production" environments.
            </p>
            <p>
                Then, when you're ready, you could run a given stage of the pipeline to
                promote your instance to "Staging" or "Production".
            </p>
        </template>
        <template #tools>
            <ff-button

                v-if="hasPermission('pipeline:create')"
                data-action="pipeline-add"
                :to="{
                    name: 'CreatePipeline',
                    params: { applicationId: application.id },
                }"
                :disabled="!featureEnabled"
            >
                <template #icon-left>
                    <PlusSmIcon />
                </template>
                Add Pipeline
            </ff-button>
        </template>
    </SectionTopMenu>
    <ff-loading
        v-if="loading"
        message="Loading Pipelines..."
    />
    <div v-else-if="pipelines?.length > 0" class="pt-4 space-y-6" data-el="pipelines-list">
        <PipelineRow
            v-for="pipeline in pipelines"
            :key="pipeline.id"
            :application="application"
            :pipeline="pipeline"
            :instance-status-map="instanceStatusMap"
            :device-status-map="deviceStatusMap"
            :device-group-status-map="deviceGroupStatusMap"
            :git-repo-status-map="gitRepoStatusMap"
            @stage-deploy-starting="stageDeployStarting"
            @stage-deploy-started="startPollingForDeployStatus"
            @stage-deploy-failed="stageDeployFailed"
            @pipeline-deleted="loadPipelines"
            @stage-deleted="(stageIndex) => stageDeleted(pipeline, stageIndex)"
        />
    </div>
    <EmptyState v-else :featureUnavailable="!featureEnabled">
        <template #header>Add your Application's First DevOps Pipeline</template>
        <template #img>
            <img src="../../images/empty-states/application-pipelines.png">
        </template>
        <template #message>
            <p>
                DevOps Pipelines are used to link multiple Node-RED instances together
                in a deployment pipeline.
            </p>
            <p>
                This is normally used to define "Development" instances, where you can
                test your new flows without fear or breaking "Production" environments.
            </p>
            <p>
                Then, when you're ready, you could run a given stage of the pipeline to
                promote your instance to "Staging" or "Production".
            </p>
        </template>
        <template #actions>
            <ff-button
                :to="{
                    name: 'CreatePipeline',
                    params: { applicationId: application.id },
                }"
                :disabled="!featureEnabled"
                data-action="pipeline-add"
            >
                <template #icon-left><PlusSmIcon /></template>
                Add Pipeline
            </ff-button>
        </template>
    </EmptyState>
</template>

<script>
import { PlusSmIcon } from '@heroicons/vue/outline'
import { mapState } from 'vuex'

import ApplicationAPI from '../../api/application.js'
import PipelineAPI from '../../api/pipeline.js'

import EmptyState from '../../components/EmptyState.vue'
import SectionTopMenu from '../../components/SectionTopMenu.vue'
import PipelineRow from '../../components/pipelines/PipelineRow.vue'
import usePermissions from '../../composables/Permissions.js'

import Alerts from '../../services/alerts.js'

export default {
    name: 'ApplicationPipelines',
    components: {
        SectionTopMenu,
        PlusSmIcon,
        PipelineRow,
        EmptyState
    },
    beforeRouteLeave () {
        clearInterval(this.polling)
    },
    inheritAttrs: false,
    props: {
        instances: {
            type: Array,
            required: true
        },
        application: {
            type: Object,
            required: true
        }
    },
    setup () {
        const { hasPermission } = usePermissions()
        return { hasPermission }
    },
    data () {
        return {
            loading: false,
            pipelines: [],
            instanceStatusMap: new Map(),
            deviceStatusMap: new Map(),
            deviceGroupStatusMap: new Map(),
            gitRepoStatusMap: new Map(),
            polling: {
                instances: null,
                devices: null,
                deviceGroups: null,
                gitRepos: null
            }
        }
    },
    computed: {
        ...mapState('account', ['features', 'teamMembership', 'team']),
        featureEnabled () {
            return this.features['devops-pipelines']
        }
    },
    watch: {
        teamMembership: {
            handler: function () {
                if (!this.hasPermission('application:pipeline:list')) {
                    return this.$router.push({ name: 'Application', params: this.$route.params })
                }
            },
            immediate: true
        }
    },
    mounted () {
        if (this.featureEnabled) {
            this.loadPipelines()
        }
    },
    methods: {
        stageDeployStarting (stage, nextStage, pipeline) {
            // Optimistic flagging of deployment in progress
            if (nextStage.instance?.id) {
                if (!this.instanceStatusMap.has(nextStage.instance.id)) {
                    this.instanceStatusMap.set(nextStage.instance.id, {})
                }
                this.instanceStatusMap.get(nextStage.instance.id).isDeploying = true
            } else if (nextStage.device?.id) {
                if (!this.deviceStatusMap.has(nextStage.device.id)) {
                    this.deviceStatusMap.set(nextStage.device.id, {})
                }
                this.deviceStatusMap.get(nextStage.device.id).isDeploying = true
            } else if (nextStage.deviceGroup?.id) {
                const nextStageDeviceGroupMapId = `${nextStage.id}:${nextStage.deviceGroup?.id}`
                if (!this.deviceGroupStatusMap.has(nextStageDeviceGroupMapId)) {
                    this.deviceGroupStatusMap.set(nextStageDeviceGroupMapId, {})
                }
                this.deviceGroupStatusMap.get(nextStageDeviceGroupMapId).isDeploying = true
            } else if (nextStage.gitRepo?.gitTokenId) {
                this.gitRepoStatusMap.set(nextStage.id, {
                    isDeploying: true,
                    pipeline,
                    status: 'pushing',
                    statusMessage: '',
                    lastPushAt: Date.now()
                })
            } else {
                return console.warn('Deployment starting to stage without an instance, device or device group.')
            }
            if (stage.gitRepo?.gitTokenId) {
                // This is a pull from the repo
                this.gitRepoStatusMap.set(stage.id, {
                    isDeploying: true,
                    pipeline,
                    status: 'pulling',
                    statusMessage: '',
                    lastPushAt: Date.now()
                })
            }
        },
        stageDeployFailed (stage, nextStage, pipeline) {
            if (nextStage.instance?.id) {
                if (this.instanceStatusMap.has(nextStage.instance.id)) {
                    clearInterval(this.polling.instances)
                    this.instanceStatusMap.get(nextStage.instance.id).isDeploying = false
                }
            } else if (nextStage.device?.id) {
                if (this.deviceStatusMap.has(nextStage.device.id)) {
                    clearInterval(this.polling.devices)
                    this.deviceStatusMap.get(nextStage.device.id).isDeploying = false
                }
            } else if (nextStage.deviceGroup?.id) {
                const nextStageDeviceGroupMapId = `${nextStage.id}:${nextStage.deviceGroup?.id}`
                if (this.deviceGroupStatusMap.has(nextStageDeviceGroupMapId)) {
                    clearInterval(this.polling.deviceGroups)
                    this.deviceGroupStatusMap.get(nextStageDeviceGroupMapId).isDeploying = false
                }
            } else if (nextStage.gitRepo?.gitTokenId) {
                clearInterval(this.polling.gitRepos)
                this.gitRepoStatusMap.get(nextStage.id).isDeploying = false
            }
            if (stage.gitRepo?.gitTokenId) {
                clearInterval(this.polling.gitRepos)
                this.gitRepoStatusMap.get(stage.id).isDeploying = false
            }
        },
        startPollingForDeployStatus (stage, nextStage, pipeline) {
            let pollingStarted = false
            if (nextStage.instance?.id) {
                this.startPollingForInstanceDeployStatus()
                pollingStarted = true
            } else if (nextStage.device?.id) {
                this.startPollingForDeviceDeployStatus()
                pollingStarted = true
            } else if (nextStage.deviceGroup?.id) {
                this.startPollingForDeviceGroupsDeployStatus()
                pollingStarted = true
            }
            if (nextStage.gitRepo?.gitTokenId || stage.gitRepo?.gitTokenId) {
                this.startPollingForGitRepoStatus()
                pollingStarted = true
            }
            if (!pollingStarted) {
                return console.warn('Polling started for stage without an instance, device or device group.')
            }
        },
        startPollingForInstanceDeployStatus () {
            clearInterval(this.polling.instances)
            this.polling.instances = setInterval(this.loadInstanceStatus, 5000)
        },
        startPollingForDeviceDeployStatus () {
            clearInterval(this.polling.devices)
            this.polling.devices = setInterval(this.loadDeviceStatus, 5000)
        },
        startPollingForDeviceGroupsDeployStatus () {
            clearInterval(this.polling.deviceGroups)
            this.polling.deviceGroups = setInterval(this.loadDeviceGroupStatus, 5000)
        },
        startPollingForGitRepoStatus () {
            clearInterval(this.polling.gitRepos)
            this.polling.gitRepos = setInterval(this.loadGitRepoStatus, 1000)
        },
        stageInstanceDeployCompleted () {
            clearInterval(this.polling.instances)
            this.polling.instances = null

            Alerts.emit('Deployment of stage successful.', 'confirmation')
        },
        stageDeviceDeployCompleted () {
            clearInterval(this.polling.devices)
            this.polling.devices = null

            Alerts.emit('Deployment of stage successful.', 'confirmation')
        },
        stageDeviceGroupDeployCompleted () {
            clearInterval(this.polling.deviceGroups)
            this.polling.deviceGroups = null

            Alerts.emit('Deployment of stage successful.', 'confirmation')
        },
        stageGitRepoDeployCompleted () {
            clearInterval(this.polling.gitRepos)
            this.polling.gitRepos = null
        },
        async stageDeleted (pipeline, stageIndex) {
            pipeline.stages.splice(stageIndex, 1)

            if (pipeline.stages[stageIndex - 1]) {
                const stage = pipeline.stages[stageIndex - 1]

                const reloadedStage = await PipelineAPI.getPipelineStage(pipeline.id, stage.id)

                Object.assign(stage, reloadedStage)
            }
        },
        async loadPipelines () {
            if (this.hasPermission('application:pipeline:list')) {
                this.loading = true

                // getPipelines doesn't include full instance status information, kick this off async
                // Not needed for devices as device status is returned as part of pipelines API
                this.loadInstanceStatus()

                ApplicationAPI.getPipelines(this.application.id)
                    .then((pipelines) => {
                        this.pipelines = pipelines
                        this.loadDeviceGroupStatus(this.pipelines)
                        this.loading = false
                    })
                    .catch((err) => {
                        console.error(err)
                        this.loading = false
                    })
            }
        },
        async loadInstanceStatus () {
            ApplicationAPI.getApplicationInstancesStatuses(this.application.id)
                .then((instances) => {
                    const deployingInstances = instances.some((instance) => {
                        return instance.meta.isDeploying
                    })

                    if (this.polling.instance) {
                        // We were polling for status (triggered by deploy start) and all instances have finished deploying
                        if (!deployingInstances) {
                            this.stageInstanceDeployCompleted()
                        }
                    } else {
                        // Some instances are deploying, so we need to start polling for status
                        if (deployingInstances) {
                            this.startPollingForInstanceDeployStatus()
                        }
                    }

                    this.instanceStatusMap = new Map(
                        instances.map((instance) => {
                            const previousStatus = this.instanceStatusMap.get(instance.id)
                            return [instance.id, { ...previousStatus, ...instance.meta, flowLastUpdatedSince: instance.flowLastUpdatedSince }]
                        })
                    )
                })
                .catch((err) => {
                    console.error(err)
                })
        },

        async loadDeviceStatus () {
            ApplicationAPI.getApplicationDevices(this.application.id, null, null, null, { statusOnly: true })
                .then((result) => {
                    const devices = result?.devices || []

                    const deployingDevices = devices.some((device) => {
                        return device.isDeploying
                    })

                    if (this.polling.devices) {
                        // We were polling for status (triggered by deploy start) and all devices have finished deploying
                        if (!deployingDevices) {
                            this.stageDeviceDeployCompleted()
                        }
                    } else {
                        // Some instances are deploying, so we need to start polling for status
                        if (deployingDevices) {
                            this.startPollingForDeviceDeployStatus()
                        }
                    }

                    this.deviceStatusMap = new Map(
                        devices.map((device) => {
                            const previousStatus = this.deviceStatusMap.get(device.id)
                            return [device.id, { ...previousStatus, ...device }]
                        })
                    )
                })
                .catch((err) => {
                    console.error(err)
                })
        },

        async loadDeviceGroupStatus (pipelines) {
            try {
                pipelines = pipelines || (await ApplicationAPI.getPipelines(this.application.id, null, null, null, { statusOnly: true }))
                // pipelines is an array of pipeline each with a `stages` array
                // each stage _might_ have a `deviceGroup` object
                // from this we need to build a map of device groups with their status
                let deployingDeviceGroups = false
                const deviceGroupsMap = new Map()
                pipelines.forEach(pipeline => {
                    pipeline.stages.forEach(stage => {
                        if (stage.deviceGroup) {
                            const stageDeviceGroupMapId = `${stage.id}:${stage.deviceGroup?.id}`
                            const previousStatus = this.deviceGroupStatusMap.get(stageDeviceGroupMapId)
                            deviceGroupsMap.set(stageDeviceGroupMapId, { ...previousStatus, ...stage.deviceGroup })
                        }
                        deployingDeviceGroups = deployingDeviceGroups || stage.deviceGroup?.isDeploying
                    })
                })
                if (this.polling.deviceGroups) {
                    // We were polling for status (triggered by deploy start) and all devices have finished deploying
                    if (!deployingDeviceGroups) {
                        this.stageDeviceGroupDeployCompleted()
                    }
                } else {
                    // Some instances are deploying, so we need to start polling for status
                    if (deployingDeviceGroups) {
                        this.startPollingForDeviceGroupsDeployStatus()
                    }
                }

                this.deviceGroupStatusMap = deviceGroupsMap
            } catch (err) {
                console.error(err)
            }
        },

        async loadGitRepoStatus () {
            const promises = []
            let someDeploying = false
            this.gitRepoStatusMap.forEach((status, stageId) => {
                promises.push(PipelineAPI.getPipelineStage(status.pipeline.id, stageId)
                    .then((stage) => {
                        const currentStatus = this.gitRepoStatusMap.get(stageId)
                        if (stage.gitRepo?.status === 'pushing' || stage.gitRepo?.status === 'pulling') {
                            someDeploying = true
                        } else {
                            currentStatus.isDeploying = false
                        }
                        currentStatus.status = stage.gitRepo?.status
                        currentStatus.statusMessage = stage.gitRepo?.statusMessage
                        currentStatus.lastPushAt = stage.gitRepo?.lastPushAt
                    })
                    .catch((err) => {
                        console.error(err)
                    }))
            })
            await Promise.all(promises)
            if (!someDeploying) {
                // All done - stopping the polling
                this.stageGitRepoDeployCompleted()
            }
        }
    }
}
</script>

<style lang="scss">
@import "../../stylesheets/components/pipelines.scss";
</style>
