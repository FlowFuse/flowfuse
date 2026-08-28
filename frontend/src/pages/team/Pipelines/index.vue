<template>
    <ff-page>
        <template #header>
            <ff-page-header :title="$t('ui.pipelines')">
                <template #context>
                    {{ $t('ui.manageYourProductionAndEdgeDeploymentsUsingTheDe') }}
                </template>
                <template #pictogram>
                    <img alt="info" src="../../../images/pictograms/pipeline_red.png">
                </template>
                <template #helptext>
                    <p>
                        {{ $t('ui.devopsPipelinesAreUsedToLinkMultipleNodeRedInsta') }}
                    </p>
                    <p>
                        {{ $t('ui.thisIsNormallyUsedToDefineDevelopmentInstancesWh2') }}
                    </p>
                    <p>
                        {{ $t('ui.getStartedByChoosingAn') }}
                        <router-link :to="{name: 'team'}">{{ $t('ui.application') }}</router-link>
                        {{ $t('ui.toBuildYourFirstDevopsPipelineIn') }}
                    </p>
                </template>
            </ff-page-header>
        </template>
        <EmptyState
            v-if="!featuresCheck.isDevOpsPipelinesFeatureEnabled"
            :featureUnavailable="!featuresCheck.isDevOpsPipelinesFeatureEnabled"
        >
            <template #img>
                <img src="../../../images/empty-states/application-pipelines.png" alt="logo">
            </template>
            <template #header>
                <span>{{ $t('ui.devopsPipelinesNotAvailable') }}</span>
            </template>
            <template #message>
                <p>{{ $t('ui.devopsPipelinesAreUsedToLinkMultipleNodeRedInsta') }}</p>
                <p>{{ $t('ui.thisIsNormallyUsedToDefineDevelopmentInstancesWh') }}</p>
            </template>
        </EmptyState>

        <template v-else>
            <div id="team-pipelines" class="space-y-6" data-page="team-pipelines">
                <ff-loading v-if="loading" :message="$t('ui.loadingPipelines')" />

                <template v-else>
                    <ff-text-input
                        v-model="filterTerm"
                        class="ff-data-table--search"
                        data-form="search"
                        :placeholder="$t('ui.searchPipelines')"
                    >
                        <template #icon>
                            <MagnifyingGlassIcon />
                        </template>
                    </ff-text-input>

                    <section v-if="pipelines.length > 0" class="pipelines">
                        <ul class="pipelines-list">
                            <li v-for="pipeline in filteredPipelines" :key="pipeline.id">
                                <TeamPipeline :pipeline="pipeline" />
                            </li>
                        </ul>
                        <p v-if="filteredPipelines.length === 0" class="no-results">
                            {{ $t('ui.noDataFoundTryAnotherSearch') }}
                        </p>
                    </section>

                    <EmptyState v-else>
                        <template #img>
                            <img src="../../../images/empty-states/application-pipelines.png" alt="logo">
                        </template>
                        <template #header>{{ $t('ui.startBuildingYourDevopsPipelines') }}</template>
                        <template #message>
                            <p>{{ $t('ui.devopsPipelinesAreUsedToLinkMultipleNodeRedInsta') }}</p>
                            <p>{{ $t('ui.thisIsNormallyUsedToDefineDevelopmentInstancesWh') }}</p>
                            <p>{{ $t('ui.getStartedByChoosingAn') }} <router-link :to="{name: 'team'}" class="text-blue-600 hover:text-blue-800 hover:underline">{{ $t('ui.application') }}</router-link> {{ $t('ui.toBuildYourFirstDevopsPipelineIn') }}</p>
                        </template>
                    </EmptyState>
                </template>
            </div>
        </template>
    </ff-page>
</template>

<script>
import { MagnifyingGlassIcon } from '@heroicons/vue/24/outline'
import { mapState } from 'pinia'

import pipelineAPI from '../../../api/pipeline.js'
import EmptyState from '../../../components/EmptyState.vue'
import usePermissions from '../../../composables/Permissions.js'

import TeamPipeline from './components/TeamPipeline.vue'

import { useAccountSettingsStore } from '@/stores/account-settings.js'
import { useContextStore } from '@/stores/context.js'

export default {
    name: 'TeamPipelines',
    components: {
        MagnifyingGlassIcon,
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
        ...mapState(useContextStore, ['team']),
        ...mapState(useAccountSettingsStore, ['featuresCheck']),
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
                name: 'team-applications',
                params: this.$route.params
            })
        }

        if (this.featuresCheck.isDevOpsPipelinesFeatureEnabled) {
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
