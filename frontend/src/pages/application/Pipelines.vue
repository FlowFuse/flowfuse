<template>
    <SectionTopMenu hero="DevOps Pipelines" help-header="FlowForge - DevOps Pipelines" info="Configure automated deployments between your Instances">
        <template #helptext>
            <p>
                DevOps Pipelines are used to link multiple Node-RED instances together in a deployment pipeline.
            </p>
            <p>
                This is normally used to define "Development" instances, where you can test your new flows without fear or breaking "Production" environments.
            </p>
            <p>
                Then, when you're ready, you could run a given stage of the pipeline to promote your instance to "Staging" or "Production".
            </p>
        </template>
        <template #tools>
            <ff-button :to="{name: 'CreatePipeline', params: {applicationId: $route.params.id}}">
                <template #icon-left>
                    <PlusSmIcon />
                </template>
                Add Pipeline
            </ff-button>
        </template>
    </SectionTopMenu>

    <div v-if="pipelines?.length > 0" class="pt-4 space-y-6">
        <Pipeline v-for="p in pipelines" :key="p.id" :pipeline="p" :status-map="instanceStatusMap" @deploy-started="beginPolling" @deploy-complete="loadPipelines" @pipeline-deleted="loadPipelines" />
    </div>
    <EmptyState v-else>
        <template #header>Add your Application's First DevOps Pipeline</template>
        <template #message>
            <p>
                DevOps Pipelines are used to link multiple Node-RED instances together in a deployment pipeline.
            </p>
            <p>
                This is normally used to define "Development" instances, where you can test your new flows without fear or breaking "Production" environments.
            </p>
            <p>
                Then, when you're ready, you could run a given stage of the pipeline to promote your instance to "Staging" or "Production".
            </p>
        </template>
        <template #actions>
            <ff-button
                :to="{name: 'CreatePipeline', params: {applicationId: $route.params.id}}"
            >
                <template #icon-left><PlusSmIcon /></template>
                Add Pipeline
            </ff-button>
        </template>
    </EmptyState>
</template>

<script>
import { PlusSmIcon } from '@heroicons/vue/outline'

import ApplicationAPI from '../../api/application.js'
import EmptyState from '../../components/EmptyState.vue'
import SectionTopMenu from '../../components/SectionTopMenu.vue'

import Pipeline from '../../components/pipelines/Pipeline.vue'
import Alerts from '../../services/alerts.js'

export default {
    name: 'ApplicationPipelines',
    components: {
        SectionTopMenu,
        PlusSmIcon,
        Pipeline,
        EmptyState
    },
    beforeRouteLeave () {
        clearInterval(this.polling)
    },
    props: {
        instances: {
            type: Array,
            required: true
        }
    },
    data () {
        return {
            pipelines: [],
            instanceStatusMap: null,
            polling: null
        }
    },
    mounted () {
        this.loadPipelines()
        this.loadInstanceStatus()
    },
    methods: {
        beginPolling () {
            this.polling = setInterval(this.loadInstanceStatus, 5000)
        },
        async loadPipelines () {
            this.loadInstanceStatus()
            ApplicationAPI.getPipelines(this.$route.params.id)
                .then((pipelines) => {
                    this.pipelines = pipelines
                })
                .catch((err) => {
                    console.error(err)
                })
        },
        async loadInstanceStatus () {
            ApplicationAPI.getApplicationInstancesStatuses(this.$route.params.id)
                .then((instances) => {
                    if (this.polling) {
                        let allRunning = true
                        for (const instance of instances) {
                            if (instance.meta.state !== 'running') {
                                allRunning = false
                            }
                        }
                        // we were polling for status (triggered by deploy) but now everything is "running"
                        if (this.polling && allRunning) {
                            clearInterval(this.polling)
                            Alerts.emit('Deployment of stage successful.', 'confirmation')
                        }
                    }
                    this.instanceStatusMap = new Map(instances.map((obj) => [obj.id, obj.meta]))
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
