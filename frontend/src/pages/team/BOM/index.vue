<template>
    <ff-page>
        <template #header>
            <ff-page-header :title="$t('ui.billOfMaterials')">
                <template #context>
                    {{ $t('ui.singleViewOfAllLibrariesAndDependenciesRunningWi') }}
                </template>
                <template #pictogram>
                    <img alt="logo" src="../../../images/pictograms/instance_red.png">
                </template>
                <template #helptext>
                    <p>{{ $t('ui.billOfDependenciesProvidesAComprehensiveOverview') }}</p>
                    <p>{{ $t('ui.thisAllowsYouToEasilyTrackThePackagesYourFlowsRe') }}</p>
                </template>
            </ff-page-header>
        </template>

        <div id="team-bom">
            <template v-if="!featuresCheck.isBOMFeatureEnabled">
                <div class="banner-wrapper">
                    <FeatureUnavailable v-if="!featuresCheck.isBOMFeatureEnabledForPlatform" />
                    <FeatureUnavailableToTeam v-else-if="!featuresCheck.isBOMFeatureEnabledForTeam" />
                </div>

                <EmptyState>
                    <template #img>
                        <img alt="empty-state-logo" src="../../../images/empty-states/application-instances.png">
                    </template>
                    <template #header>{{ $t('ui.billOfMaterialsNotAvailable') }}</template>
                    <template #message>
                        <p>
                            {{ $t('ui.thisFeatureIsnTSupportedForYourTeamTierOrPlatfor') }}
                        </p>
                    </template>
                </EmptyState>
            </template>

            <template v-else>
                <ff-loading v-if="loading" :message="$t('ui.loadingDependencies')" />

                <div v-else-if="hasInstances">
                    <ff-text-input
                        v-model="searchTerm"
                        class="ff-data-table--search mb-5"
                        data-form="search"
                        :placeholder="$t('ui.searchPackageDependencyHostedInstanceOrRemoteIns')"
                    >
                        <template #icon><MagnifyingGlassIcon /></template>
                    </ff-text-input>

                    <BomDependencies :payload="payload" :search-term="searchTerm" :start-closed="true" />
                </div>

                <EmptyState v-else>
                    <template #img>
                        <img alt="empty-state-logo" src="../../../images/empty-states/application-instances.png">
                    </template>
                    <template #header>{{ $t('ui.noDependenciesHereYet') }}</template>
                    <template #message>
                        <p>
                            {{ $t('ui.itLooksLikeThereAreNoHostedOrRemoteInstancesAssi') }}
                        </p>
                        <p>
                            {{ $t('ui.onceYouAssignAnHostedOrRemoteInstanceToAnApplica') }}
                        </p>
                    </template>
                </EmptyState>
            </template>
        </div>
    </ff-page>
</template>

<script>
import { MagnifyingGlassIcon } from '@heroicons/vue/24/outline'
import { mapState } from 'pinia'

import teamApi from '../../../api/team.js'

import EmptyState from '../../../components/EmptyState.vue'
import FeatureUnavailable from '../../../components/banners/FeatureUnavailable.vue'
import FeatureUnavailableToTeam from '../../../components/banners/FeatureUnavailableToTeam.vue'
import BomDependencies from '../../../components/bill-of-materials/BomDependencies.vue'
import usePermissions from '../../../composables/Permissions.js'

import { useAccountSettingsStore } from '@/stores/account-settings.js'
import { useContextStore } from '@/stores/context.js'

export default {
    name: 'TeamBOM',
    components: {
        BomDependencies,
        FeatureUnavailableToTeam,
        FeatureUnavailable,
        MagnifyingGlassIcon,
        EmptyState
    },
    setup () {
        const { hasPermission } = usePermissions()
        return {
            hasPermission
        }
    },
    data () {
        return {
            intermediaryPayload: [],
            loading: false,
            searchTerm: ''
        }
    },
    computed: {
        ...mapState(useContextStore, ['team']),
        ...mapState(useAccountSettingsStore, ['featuresCheck']),
        payload () {
            const payload = { children: [] }
            this.intermediaryPayload.forEach(app => {
                const { id, name } = app
                payload.children.push(...app.children.map(child => ({
                    ...child,
                    app: { id, name }
                })))
            })

            return payload
        },
        hasInstances () {
            return !(!this.payload || this.payload.children.length === 0)
        }
    },
    mounted () {
        if (!this.hasPermission('team:bom')) {
            this.$router.push({ name: 'home' })
        }
        if (this.featuresCheck.isBOMFeatureEnabled) {
            this.getTeamDependencies()
        }
    },
    methods: {
        getTeamDependencies () {
            this.loading = true
            teamApi.getDependencies(this.team.id)
                .then(res => {
                    this.intermediaryPayload = res
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

</style>
