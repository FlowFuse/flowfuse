<template>
    <div v-if="Object.keys(dependencies).length > 0" class="dependencies" data-el="dependencies">
        <dependency-item
            v-for="(versions, dependencyTitle) in dependencies"
            :key="dependencyTitle"
            :title="dependencyTitle"
            :versions="versions"
            :start-closed="startClosed"
        />
    </div>
    <div v-else class="empty text-center opacity-60">
        <p>Oops! We couldn't find any matching results.</p>
    </div>
</template>

<script>
import DependencyItem from './DependencyItem.vue'

export default {
    name: 'BomDependencies',
    components: { DependencyItem },
    props: {
        payload: {
            required: true,
            type: Object
        },
        searchTerm: {
            required: false,
            type: String,
            default: ''
        },
        startClosed: {
            required: false,
            type: Boolean,
            default: false
        }
    },
    computed: {
        dependencies () {
            return this.payload.children
                .reduce((acc, currentInstance) => {
                    currentInstance.dependencies.forEach(dep => {
                        const searchTerm = this.searchTerm.trim()
                        const installedDependencyVersion = dep.version?.current ?? dep.version?.wanted ?? 'N/A'
                        const dependencyNameMatchesSearch = dep.name.toLowerCase().includes(searchTerm.toLowerCase())
                        const dependencyVersionMatchesSearch = installedDependencyVersion.toLowerCase().includes(searchTerm.toLowerCase())
                        const matchesInstanceName = currentInstance.name.toLowerCase().includes(searchTerm.toLowerCase())
                        const includeDependency = () => {
                            if (!Object.prototype.hasOwnProperty.call(acc, dep.name)) {
                                acc[dep.name] = {}
                            }
                            if (!Object.prototype.hasOwnProperty.call(acc[dep.name], installedDependencyVersion)) {
                                acc[dep.name][installedDependencyVersion] = []
                            }
                            acc[dep.name][installedDependencyVersion].push(currentInstance)
                        }

                        switch (true) {
                        case !searchTerm.length:
                            includeDependency()
                            break
                        case matchesInstanceName:
                            includeDependency()
                            break
                        case dependencyVersionMatchesSearch || dependencyNameMatchesSearch:
                            includeDependency()
                            break
                        default:
                            break
                        }
                    })
                    return acc
                }, {})
        }
    }
}
</script>

<style scoped lang="scss">

</style>
