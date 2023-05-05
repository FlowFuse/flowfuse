<template>
    <SectionTopMenu hero="DevOps Pipelines" help-header="FlowForge - DevOps Pipelines" info="Configure automated deployments between your Instances">
        <template #helptext>
            <p>This is a raw feed from the running instance of Node-RED on this domain.</p>
            <p>Use this to debug issues if your application will not start correctly.</p>
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
        <Pipeline v-for="p in pipelines" :key="p.id" :pipeline="p" :status-map="instanceStatusMap" @deploy-complete="loadPipelines" @pipeline-deleted="loadPipelines" />
    </div>
    <div v-else class="ff-no-data ff-no-data-large">
        Empty State for Pipelines
    </div>
</template>

<script>
import { PlusSmIcon } from '@heroicons/vue/outline'

import ApplicationAPI from '../../api/application.js'
import SectionTopMenu from '../../components/SectionTopMenu.vue'

import Pipeline from '../../components/pipelines/Pipeline.vue'

export default {
    name: 'ApplicationPipelines',
    components: {
        SectionTopMenu,
        PlusSmIcon,
        Pipeline
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
            instanceStatusMap: null
        }
    },
    computed: {

    },
    mounted () {
        this.loadPipelines()
        this.loadInstanceStatus()
    },
    methods: {
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
