<template>
    <ff-loading v-if="loading" message="Loading Snapshots..." />
    <div v-else class="dependencies-wrapper">
        <ff-text-input
            v-model="searchTerm"
            class="ff-data-table--search mb-5"
            data-form="search"
            placeholder="Search Package Dependency, Instance or Device"
        >
            <template #icon><SearchIcon /></template>
        </ff-text-input>
        <div class="dependencies">
            <dependency-item
                v-for="(versions, dependencyTitle) in dependencies"
                :key="dependencyTitle"
                :title="dependencyTitle"
                :versions="versions"
            />
        </div>
    </div>
</template>

<script>
import { SearchIcon } from '@heroicons/vue/outline'

import ApplicationsApi from '../../../api/application.js'

import DependencyItem from './components/DependencyItem.vue'

export default {
    name: 'ApplicationDependencies',
    components: { SearchIcon, DependencyItem },
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
            payload: [],
            loading: false,
            searchTerm: ''
        }
    },
    computed: {
        dependencies () {
            if (!this.payload.children) {
                return {}
            }
            return this.payload.children
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
                .map(instance => {
                    const fullInstanceData = this.instances.find(ins => ins.id === instance.id)
                    if (fullInstanceData && Object.prototype.hasOwnProperty.call(fullInstanceData, 'meta')) {
                        instance.meta = fullInstanceData.meta
                    }
                    return instance
                })
                .reduce((acc, currentInstance) => {
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
        }
    },
    mounted () {
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
</script>

<style scoped lang="scss">
.dependencies-wrapper {
  .dependencies {
    border: 1px solid $ff-grey-300;
  }
}
</style>
