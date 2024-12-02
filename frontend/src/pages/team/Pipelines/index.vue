<template>
    <ff-page>
        <template #header>
            <ff-page-header title="Pipelines">
                <template #context>
                    Manage your production and edge deployments using the DevOps Pipelines
                </template>
                <template #pictogram>
                    <img alt="info" src="../../../images/pictograms/pipeline_red.png">
                </template>
                <template #helptext>
                    <p>DevOps Pipelines are used to link multiple Node-RED instances together in a deployment pipeline.</p>
                    <p>This is normally used to define "Development" instances, where you can test your new flows without fear or breaking "Production" environments.</p>
                    <p>Then, when you're ready, you could run a given stage of the pipeline to promote your instance to "Staging" or "Production".</p>
                </template>
            </ff-page-header>
        </template>
        <EmptyState
            v-if="!featuresCheck.devOpsPipelinesFeatureEnabled"
            :featureUnavailable="!featuresCheck.devOpsPipelinesFeatureEnabled"
        >
            <template #img>
                <img src="../../../images/empty-states/application-pipelines.png" alt="logo">
            </template>
            <template #header>
                <span>DevOs Pipelines Not Available</span>
            </template>
            <template #message>
                <p>DevOps Pipelines are used to link multiple Node-RED instances together in a deployment pipeline.</p>
                <p>This is normally used to define "Development" instances, where you can test your new flows without fear or breaking "Production" environments.</p>
                <p>Then, when you're ready, you could run a given stage of the pipeline to promote your instance to "Staging" or "Production".</p>
            </template>
        </EmptyState>

        <template v-else>
            <div id="team-pipelines" class="space-y-6">
                <ff-loading v-if="loading" message="Loading Pipelines..." />

                <template v-else>
                    <ff-text-input
                        v-model="filterTerm"
                        class="ff-data-table--search"
                        data-form="search"
                        placeholder="Search Pipelines..."
                    >
                        <template #icon>
                            <SearchIcon />
                        </template>
                    </ff-text-input>

                    <section v-if="pipelines.length > 0" class="pipelines">
                        <ul class="pipelines-list">
                            <li v-for="pipeline in pipelines" :key="pipeline.id">
                                <TeamPipeline :pipeline="pipeline" />
                            </li>
                        </ul>
                    </section>

                    <EmptyState v-else>
                        <template #img>
                            <img src="../../../images/empty-states/application-pipelines.png" alt="logo">
                        </template>
                        <template #header>Start building your DevOs pipelines</template>
                        <template #message>
                            <p>DevOps Pipelines are used to link multiple Node-RED instances together in a deployment pipeline.</p>
                            <p>This is normally used to define "Development" instances, where you can test your new flows without fear or breaking "Production" environments.</p>
                            <p>Then, when you're ready, you could run a given stage of the pipeline to promote your instance to "Staging" or "Production".</p>
                        </template>
                    </EmptyState>
                </template>
            </div>
        </template>
    </ff-page>
</template>

<script>
import { SearchIcon } from '@heroicons/vue/outline'
import { mapGetters } from 'vuex'

import pipelineAPI from '../../../api/pipeline.js'
import EmptyState from '../../../components/EmptyState.vue'

import TeamPipeline from './components/TeamPipeline.vue'

export default {
    name: 'TeamPipelines',
    components: {
        SearchIcon,
        EmptyState,
        TeamPipeline
    },
    data () {
        return {
            loading: false,
            pipelines: [],
            filterTerm: ''
        }
    },
    computed: {
        ...mapGetters('account', ['featuresCheck', 'team'])
    },
    mounted () {
        if (this.featuresCheck.devOpsPipelinesFeatureEnabled) {
            this.getPipelines()
        }
    },
    methods: {
        async getPipelines () {
            this.loading = true
            return pipelineAPI.getTeamPipelines(this.team.id)
                .then(response => {
                    this.pipelines = response.pipelines
                })
                .catch(e => e)
                .finally(() => {
                    this.loading = false
                })
        }
    }
}
</script>

<style scoped lang="scss">
#team-pipelines {

    .pipelines {
        .pipelines-list {
            display: flex;
            flex-direction: column;
            gap: 15px;
        }
    }
}
</style>
