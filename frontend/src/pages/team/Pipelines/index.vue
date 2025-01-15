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
                    <p>This is normally used to define "Development" instances, where you can test your new flows without fear or breaking "Production" environments, and then, when you're ready, deploy your changes with a single click</p>
                    <p>Get started by choosing an <router-link :to="{name: 'Team'}">Application</router-link> to build your first DevOps Pipeline in.</p>
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
                <span>DevOps Pipelines Not Available</span>
            </template>
            <template #message>
                <p>DevOps Pipelines are used to link multiple Node-RED instances together in a deployment pipeline.</p>
                <p>This is normally used to define "Development" instances, where you can test your new flows without fear or breaking "Production" environments, and then, when you're ready, deploy your changes with a single click</p>
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
                            <li v-for="pipeline in filteredPipelines" :key="pipeline.id">
                                <section-block
                                    :application="pipeline.application"
                                    :link-to="{name: 'ApplicationPipelines', params: {id: pipeline.application.id}}"
                                >
                                    <template #title>{{ pipeline.name }}</template>
                                    <template #default>
                                        <ul v-if=" pipeline.stages.length > 0" class="ff-pipeline-stages-list">
                                            <li v-for="stage in pipeline.stages" :key="stage.id">
                                                <TeamPipelineStage :stage="stage" :application="pipeline.application" />
                                                <ChevronRightIcon class="ff-icon" />
                                            </li>
                                        </ul>
                                        <p v-else class="ff-empty-stages-message">No stages in sight just yet!</p>
                                    </template>
                                </section-block>
                            </li>
                        </ul>
                        <p v-if="filteredPipelines.length === 0" class="no-results">
                            No Data Found. Try Another Search.
                        </p>
                    </section>

                    <EmptyState v-else>
                        <template #img>
                            <img src="../../../images/empty-states/application-pipelines.png" alt="logo">
                        </template>
                        <template #header>Start building your DevOps pipelines</template>
                        <template #message>
                            <p>DevOps Pipelines are used to link multiple Node-RED instances together in a deployment pipeline.</p>
                            <p>This is normally used to define "Development" instances, where you can test your new flows without fear or breaking "Production" environments, and then, when you're ready, deploy your changes with a single click</p>
                            <p>Get started by choosing an <router-link :to="{name: 'Team'}" class="text-blue-600 hover:text-blue-800 hover:underline">Application</router-link> to build your first DevOps Pipeline in.</p>
                        </template>
                    </EmptyState>
                </template>
            </div>
        </template>
    </ff-page>
</template>

<script>
import { ChevronRightIcon, SearchIcon } from '@heroicons/vue/outline'
import { mapGetters } from 'vuex'

import pipelineAPI from '../../../api/pipeline.js'
import EmptyState from '../../../components/EmptyState.vue'
import SectionBlock from '../../../components/sections/section-block.vue'

import TeamPipelineStage from './components/TeamPipelineStage.vue'

export default {
    name: 'TeamPipelines',
    components: {
        ChevronRightIcon,
        TeamPipelineStage,
        SectionBlock,
        SearchIcon,
        EmptyState
    },
    data () {
        return {
            loading: false,
            pipelines: [],
            filterTerm: ''
        }
    },
    computed: {
        ...mapGetters('account', ['featuresCheck', 'team']),
        filteredPipelines () {
            if (this.filterTerm) {
                return this.pipelines
                    .filter(pipeline => {
                        return [
                            pipeline.name.toLowerCase().includes(this.filterTerm.toLowerCase()),
                            pipeline.id.toLowerCase().includes(this.filterTerm.toLowerCase()),
                            pipeline.application.name.toLowerCase().includes(this.filterTerm.toLowerCase()),
                            pipeline.application.id.toLowerCase().includes(this.filterTerm.toLowerCase())
                        ].includes(true)
                    })
            } return this.pipelines
        }
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

<style lang="scss">
#team-pipelines {
    .pipelines {
        .pipelines-list {
            display: flex;
            flex-direction: column;
            gap: 15px;

            .ff-section-block-content {
                padding: 15px;
                overflow: auto;

                .ff-pipeline-stages-list {
                    display: flex;
                    flex-direction: row;
                    gap: 15px;

                    li {
                        display: flex;
                        gap: 15px;
                        align-items: center;

                        &:last-child {
                            padding-right: 15px;

                            & > .ff-icon {
                                display: none;
                            }
                        }
                    }
                }

                .ff-empty-stages-message {
                    text-align: center;
                    color: $ff-grey-500;
                }
            }
        }
    }
}
</style>
