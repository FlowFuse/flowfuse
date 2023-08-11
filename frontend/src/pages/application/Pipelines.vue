<template>
    <SectionTopMenu
        hero="DevOps Pipelines"
        help-header="FlowForge - DevOps Pipelines"
        info="Configure automated deployments between your Instances"
    >
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

    <div v-if="pipelines?.length > 0" class="pt-4 space-y-6" data-el="pipelines-list">
        <PipelineRow
            v-for="pipeline in pipelines"
            :key="pipeline.id"
            :application="application"
            :pipeline="pipeline"
            :instance-status-map="instanceStatusMap"
            @stage-deploy-starting="stageDeployStarting"
            @stage-deploy-started="startPollingForDeployStatus"
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
    data () {
        return {
            pipelines: [],
            instanceStatusMap: new Map(),
            polling: null
        }
    },
    computed: {
        ...mapState('account', ['features']),
        featureEnabled () {
            return this.features['devops-pipelines']
        }
    },
    mounted () {
        if (this.featureEnabled) {
            this.loadPipelines()
        }
    },
    methods: {
        stageDeployStarting (stage, nextStage) {
            if (!nextStage.instance?.id) {
                return console.warn('Deployment starting to stage without an instance.')
            }

            // Optimistic flagging of deployment in progress for the single instance inside the target stage
            this.instanceStatusMap.get(nextStage.instance.id).isDeploying = true
        },
        startPollingForDeployStatus (stage) {
            clearInterval(this.polling)
            this.polling = setInterval(this.loadInstanceStatus, 5000)
        },
        stageDeployCompleted () {
            clearInterval(this.polling)
            this.polling = null

            Alerts.emit('Deployment of stage successful.', 'confirmation')
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
            this.loadInstanceStatus()
            ApplicationAPI.getPipelines(this.application.id)
                .then((pipelines) => {
                    this.pipelines = pipelines
                })
                .catch((err) => {
                    console.error(err)
                })
        },
        async loadInstanceStatus () {
            ApplicationAPI.getApplicationInstancesStatuses(this.application.id)
                .then((instances) => {
                    const deployingInstances = instances.some((instance) => {
                        return instance.meta.isDeploying
                    })

                    if (this.polling) {
                        // We were polling for status (triggered by deploy start) and all instances have finished deploying
                        if (!deployingInstances) {
                            this.stageDeployCompleted()
                        }
                    } else {
                        // Some instances are deploying, so we need to start polling for status
                        if (deployingInstances) {
                            this.startPollingForDeployStatus()
                        }
                    }

                    this.instanceStatusMap = new Map(
                        instances.map((obj) => {
                            const previousStatus = this.instanceStatusMap.get(obj.id)
                            return [obj.id, { ...previousStatus, ...obj.meta, flowLastUpdatedSince: obj.flowLastUpdatedSince }]
                        })
                    )
                })
                .catch((err) => {
                    console.error(err)
                })
        }
    }
}
</script>

<style lang="scss">
@import "../../stylesheets/components/pipelines.scss";
</style>
