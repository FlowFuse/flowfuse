<template>
    <div class="dependencies">
        <dependency-item
            v-for="(versions, dependencyTitle) in dependencies" :key="dependencyTitle"
            :title="dependencyTitle"
            :versions="versions"
        />
    </div>
</template>

<script>
import ApplicationsApi from '../../../api/application.js'

import DependencyItem from './components/DependencyItem.vue'

export default {
    name: 'ApplicationDependencies',
    components: { DependencyItem },
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
            payload: []
        }
    },
    computed: {
        dependencies () {
            return this.payload.children
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
        ApplicationsApi.getDependencies(this.application.id)
            .then(res => {
                this.payload = res
            })
            .catch(err => console.warn(err))
    }
}
</script>

<style scoped lang="scss">
.dependencies {
  border: 1px solid $ff-grey-300;
}
</style>
