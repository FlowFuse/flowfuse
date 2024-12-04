export default {
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
        },
        hasInstances () {
            return !(!this.payload || this.payload.children.length === 0)
        }
    }
}
