<template>
    <ff-page>
        <template #header>
            <ff-page-header title="Bill Of Materials">
                <template #context>
                    Single view of all libraries and dependencies running within your Node-RED flows.
                </template>
                <template #pictogram>
                    <img alt="logo" src="../../../images/pictograms/instance_red.png">
                </template>
                <template #helptext>
                    <p>Bill of Dependencies provides a comprehensive overview of all libraries and dependencies used within your Node-RED flows.</p>
                    <p>This allows you to easily track the packages your flows rely on, identify outdated or vulnerable dependencies, and ensure compatibility across your flows.</p>
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
                    <template #header>Bill Of Materials not available!</template>
                    <template #message>
                        <p>
                            This feature isn’t supported for your team tier or platform settings. Explore upgrade options to enable it.
                        </p>
                    </template>
                </EmptyState>
            </template>

            <template v-else>
                <ff-loading v-if="loading" message="Loading Dependencies..." />

                <div v-else-if="hasInstances">
                    <ff-text-input
                        v-model="searchTerm"
                        class="ff-data-table--search mb-5"
                        data-form="search"
                        placeholder="Search Package Dependency, Hosted Instance or Remote Instance"
                    >
                        <template #icon><SearchIcon /></template>
                    </ff-text-input>

                    <BomDependencies :payload="payload" :search-term="searchTerm" :start-closed="true" />
                </div>

                <EmptyState v-else>
                    <template #img>
                        <img alt="empty-state-logo" src="../../../images/empty-states/application-instances.png">
                    </template>
                    <template #header>No Dependencies Here... Yet!</template>
                    <template #message>
                        <p>
                            It looks like there are no Hosted or Remote Instances assigned to this team yet.
                        </p>
                        <p>
                            Once you assign an Hosted or Remote Instance to an application belonging to this team, you'll be able to view a complete list of their dependencies.
                        </p>
                    </template>
                </EmptyState>
            </template>
        </div>
    </ff-page>
</template>

<script>
import { SearchIcon } from '@heroicons/vue/outline'
import { mapGetters } from 'vuex'

import teamApi from '../../../api/team.js'

import EmptyState from '../../../components/EmptyState.vue'
import FeatureUnavailable from '../../../components/banners/FeatureUnavailable.vue'
import FeatureUnavailableToTeam from '../../../components/banners/FeatureUnavailableToTeam.vue'
import BomDependencies from '../../../components/bill-of-materials/BomDependencies.vue'
import usePermissions from '../../../composables/Permissions.js'

export default {
    name: 'TeamBOM',
    components: {
        BomDependencies,
        FeatureUnavailableToTeam,
        FeatureUnavailable,
        SearchIcon,
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
        ...mapGetters('account', ['featuresCheck', 'team']),
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
            this.$router.push({ name: 'Applications' })
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
