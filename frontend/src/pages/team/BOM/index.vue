<template>
    <ff-page>
        <template #header>
            <ff-page-header title="Bill Of Materials">
                <template #context>
                    Todo Context
                </template>
                <template #pictogram>
                    <img alt="logo" src="../../../images/pictograms/instance_red.png">
                </template>
                <template #helptext>
                    <p>Todo helptext</p>
                </template>
            </ff-page-header>
        </template>
        <div id="team-bom">
            <div class="banner-wrapper">
                <FeatureUnavailable v-if="!featuresCheck.isBOMFeatureEnabledForPlatform" />
                <FeatureUnavailableToTeam v-else-if="!featuresCheck.isBOMFeatureEnabledForTeam" />
            </div>

            <ff-loading v-if="loading" message="Loading Dependencies..." />

            <div v-else-if="hasInstances">
                <ff-text-input
                    v-model="searchTerm"
                    class="ff-data-table--search mb-5"
                    data-form="search"
                    placeholder="Search Package Dependency, Instance or Device"
                >
                    <template #icon><SearchIcon /></template>
                </ff-text-input>
                <div v-if="Object.keys(dependencies).length > 0" class="dependencies" data-el="dependencies">
                    <dependency-item
                        v-for="(versions, dependencyTitle) in dependencies"
                        :key="dependencyTitle"
                        :title="dependencyTitle"
                        :versions="versions"
                    />
                </div>
                <div v-else class="empty text-center opacity-60">
                    <p>Oops! We couldn't find any matching results.</p>
                </div>
            </div>
            <EmptyState v-else>
                <template #img>
                    <img src="../../../images/empty-states/application-instances.png">
                </template>
                <template #header>Your team doesn't contain any Instances or Devices</template>
                <template #message>
                    <p>
                        todo better empty message
                    </p>
                    <p v-if="!featuresCheck.isBOMFeatureEnabled">
                        Once you assign an Instance or Device to an application belonging to this team, you'll be able to view a complete list of their dependencies.
                    </p>
                </template>
            </EmptyState>
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
import DependencyItem from '../../../components/bill-of-materials/DependencyItem.vue'
import BomMixin from '../../../mixins/BOM.js'

export default {
    name: 'TeamBOM',
    components: {
        DependencyItem,
        FeatureUnavailableToTeam,
        FeatureUnavailable,
        SearchIcon,
        EmptyState
    },
    mixins: [BomMixin],
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
                payload.children.push(...app.children.map(child => ({
                    ...child,
                    app
                })))
            })

            return payload
        }
    },
    mounted () {
        teamApi.getDependencies(this.team.id)
            .then(res => {
                this.intermediaryPayload = res
            })
            .catch(e => e)
    }
}
</script>

<style scoped lang="scss">

</style>
