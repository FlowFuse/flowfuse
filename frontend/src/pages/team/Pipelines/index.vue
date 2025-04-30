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
                    <p>
                        DevOps Pipelines are used to link multiple Node-RED instances together in a deployment
                        pipeline.
                    </p>
                    <p>
                        This is normally used to define "Development" instances, where you can test your new flows
                        without fear or breaking "Production" environments, and then, when you're ready, deploy your
                        changes with a single click
                    </p>
                    <p>
                        Get started by choosing an
                        <router-link :to="{name: 'Team'}">Application</router-link>
                        to build your first DevOps Pipeline in.
                    </p>
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
                                <TeamPipeline :pipeline="pipeline" />
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
import { SearchIcon } from '@heroicons/vue/outline'
import { mapGetters } from 'vuex'

import pipelineAPI from '../../../api/pipeline.js'
import EmptyState from '../../../components/EmptyState.vue'
import usePermissions from '../../../composables/Permissions.js'

import TeamPipeline from './components/TeamPipeline.vue'

export default {
    name: 'TeamPipelines',
    components: {
        SearchIcon,
        EmptyState,
        TeamPipeline
    },
    setup () {
        const { hasPermission } = usePermissions()

        return { hasPermission }
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
        if (!this.hasPermission('application:pipeline:list')) {
            return this.$router.push({
                name: 'Applications',
                params: this.$route.params
            })
        }

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
