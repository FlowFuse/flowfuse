<template>
    <div class="dependencies-wrapper" data-el="application-dependencies">
        <SectionTopMenu :hero="$t('ui.dependencies')" :help-header="$t('ui.nodeRedDependenciesRunningInFlowfuse')" :info="$t('ui.dependenciesOfNodeRedInstancesBelongingToThisApp')">
            <template #pictogram>
                <img src="../../../images/pictograms/instance_red.png">
            </template>
            <template #helptext>
                <p>{{ $t('ui.thisIsAListOfNodeRedDependenciesInThisApplicatio') }}</p>
            </template>
        </SectionTopMenu>

        <div class="space-y-6">
            <div class="banner-wrapper mt-5">
                <FeatureUnavailable v-if="!featuresCheck.isBOMFeatureEnabledForPlatform" />
                <FeatureUnavailableToTeam v-else-if="!featuresCheck.isBOMFeatureEnabledForTeam" />
            </div>

            <ff-loading v-if="loading" :message="$t('ui.loadingSnapshots')" />

            <div v-else-if="hasInstances">
                <ff-text-input
                    v-model="searchTerm"
                    class="ff-data-table--search mb-5 mt-5"
                    data-form="search"
                    :placeholder="$t('ui.searchPackageDependencyInstanceOrDevice')"
                >
                    <template #icon><MagnifyingGlassIcon /></template>
                </ff-text-input>

                <BomDependencies :payload="payload" :search-term="searchTerm" />
            </div>
            <EmptyState v-else>
                <template #img>
                    <img src="../../../images/empty-states/application-instances.png">
                </template>
                <template #header>{{ $t('ui.yourApplicationDoesnTContainAnyInstancesOrDevice') }}</template>
                <template #message>
                    <p>
                        {{ $t('ui.applicationsInFlowfuseAreUsedToManageGroupsOfNod2') }}
                    </p>
                    <p v-if="!featuresCheck.isBOMFeatureEnabled">
                        {{ $t('ui.onceYouAssignAnInstanceOrDeviceToThisApplication') }}
                    </p>
                </template>
            </EmptyState>
        </div>
    </div>
</template>

<script>
import { MagnifyingGlassIcon } from '@heroicons/vue/24/outline'
import { mapState } from 'pinia'

import ApplicationsApi from '../../../api/application.js'
import EmptyState from '../../../components/EmptyState.vue'
import SectionTopMenu from '../../../components/SectionTopMenu.vue'
import FeatureUnavailable from '../../../components/banners/FeatureUnavailable.vue'
import FeatureUnavailableToTeam from '../../../components/banners/FeatureUnavailableToTeam.vue'
import BomDependencies from '../../../components/bill-of-materials/BomDependencies.vue'
import usePermissions from '../../../composables/Permissions.js'

import { useAccountSettingsStore } from '@/stores/account-settings.js'

export default {
    name: 'ApplicationDependencies',
    components: {
        BomDependencies,
        FeatureUnavailable,
        FeatureUnavailableToTeam,
        EmptyState,
        SectionTopMenu,
        MagnifyingGlassIcon
    },
    inheritAttrs: false,
    props: {
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
            payload: null,
            loading: false,
            searchTerm: ''
        }
    },
    computed: {
        ...mapState(useAccountSettingsStore, ['featuresCheck']),
        hasTeamPermission () {
            return this.hasPermission('application:bom', { application: this.application })
        },
        hasInstances () {
            return !(!this.payload || this.payload.children.length === 0)
        }
    },
    mounted () {
        if (!this.hasTeamPermission) {
            return this.$router.push({ name: 'application', params: { id: this.application.id } })
        }
        this.getDependencies()
    },
    methods: {
        getDependencies () {
            if (this.featuresCheck.isBOMFeatureEnabled) {
                this.loading = true
                ApplicationsApi.getDependencies(this.application.id)
                    .then(res => {
                        this.payload = res
                    })
                    .catch(err => {
                        this.payload = []
                        console.warn(err)
                    })
                    .finally(() => {
                        this.loading = false
                    })
            }
        }
    }
}
</script>

<style scoped lang="scss">

</style>
