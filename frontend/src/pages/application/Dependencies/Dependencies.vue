<template>
    <div class="dependencies-wrapper">
        <SectionTopMenu hero="Dependencies" help-header="Node-RED Dependencies - Running in FlowFuse" info="Dependencies of Node-RED Instances belonging to this application.">
            <template #pictogram>
                <img src="../../../images/pictograms/edge_red.png">
            </template>
            <template #helptext>
                <p>This is a list of Node-RED Dependencies in this Application, hosted on the same domain as FlowFuse.</p>
            </template>
        </SectionTopMenu>

        <div class="space-y-6 mb-12">
            <div class="banner-wrapper mt-5">
                <FeatureUnavailable v-if="!isBOMFeatureEnabledForPlatform" />
                <FeatureUnavailableToTeam v-else-if="!isBOMFeatureEnabledForTeam" />
            </div>

            <ff-loading v-if="loading" message="Loading Snapshots..." />

            <div v-else-if="hasInstances">
                <ff-text-input
                    v-model="searchTerm"
                    class="ff-data-table--search mb-5 mt-5"
                    data-form="search"
                    placeholder="Search Package Dependency, Instance or Device"
                >
                    <template #icon><SearchIcon /></template>
                </ff-text-input>
                <div v-if="Object.keys(dependencies).length > 0" class="dependencies">
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
                <template #header>Your application doesn't contain any Instances or Devices</template>
                <template #message>
                    <p>
                        Applications in FlowFuse are used to manage groups of Node-RED Instances and Devices.
                    </p>
                    <p v-if="!isBOMFeatureEnabled">
                        Once you assign an Instance or Device to this application, you'll be able to view a complete list of their dependencies.
                    </p>
                </template>
            </EmptyState>
        </div>
    </div>
</template>

<script>
import { SearchIcon } from '@heroicons/vue/outline'

import ApplicationsApi from '../../../api/application.js'
import EmptyState from '../../../components/EmptyState.vue'
import SectionTopMenu from '../../../components/SectionTopMenu.vue'
import FeatureUnavailable from '../../../components/banners/FeatureUnavailable.vue'
import FeatureUnavailableToTeam from '../../../components/banners/FeatureUnavailableToTeam.vue'

import featuresMixin from '../../../mixins/Features.js'
import permissionsMixin from '../../../mixins/Permissions.js'

import DependencyItem from './components/DependencyItem.vue'

export default {
    name: 'ApplicationDependencies',
    components: {
        FeatureUnavailable,
        FeatureUnavailableToTeam,
        EmptyState,
        SectionTopMenu,
        SearchIcon,
        DependencyItem
    },
    mixins: [featuresMixin, permissionsMixin],
    inheritAttrs: false,
    props: {
        application: {
            type: Object,
            required: true
        },
        instances: {
            type: Array,
            required: true
        }
    },
    data () {
        return {
            payload: null,
            loading: false,
            searchTerm: ''
        }
    },
    computed: {
        extendedInstances () {
            if (!this.payload?.children) {
                return []
            }

            return this.payload.children.map(instance => {
                const fullInstanceData = this.instances.find(ins => ins.id === instance.id)
                if (fullInstanceData && Object.prototype.hasOwnProperty.call(fullInstanceData, 'meta')) {
                    instance.meta = fullInstanceData.meta
                }
                return instance
            })
        },
        filteredInstances () {
            return this.extendedInstances
                .filter(instance => {
                    if (this.searchTerm.length === 0) {
                        return true
                    }
                    return [
                        instance.name,
                        instance.type,
                        ...instance.dependencies.map(dependency => {
                            return dependency.name + ' ' + dependency.version.installed
                        })
                    ].map(term => term.toLowerCase().includes(this.searchTerm.trim().toLowerCase()))
                        .includes(true)
                })
        },
        dependencies () {
            return this.filteredInstances.reduce((acc, currentInstance) => {
                currentInstance.dependencies.forEach(dep => {
                    if (!Object.prototype.hasOwnProperty.call(acc, dep.name)) {
                        acc[dep.name] = { }
                    }
                    if (!Object.prototype.hasOwnProperty.call(acc[dep.name], dep.version.installed)) {
                        acc[dep.name][dep.version.installed] = []
                    }
                    acc[dep.name][dep.version.installed].push(currentInstance)
                })
                return acc
            }, {})
        },
        hasInstances () {
            return !(!this.payload || this.payload.children.length === 0)
        },
        hasTeamPermission () {
            return this.hasPermission('application:bom')
        }
    },
    mounted () {
        this.getDependencies()
    },
    methods: {
        getDependencies () {
            if (this.isBOMFeatureEnabled && this.hasTeamPermission) {
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
.dependencies-wrapper {
  .dependencies {
    border: 1px solid $ff-grey-300;
  }
}
</style>
