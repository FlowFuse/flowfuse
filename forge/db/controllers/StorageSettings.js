module.exports = {
    getProjectModules: async function (app, project) {
        const result = []
        try {
            const storageSettings = await app.db.models.StorageSettings.byProject(project.id)
            if (storageSettings?.settings) {
                const runtimeSettings = JSON.parse(storageSettings.settings)
                if (runtimeSettings.nodes) {
                    for (const [key, value] of Object.entries(runtimeSettings.nodes)) {
                        // Only return the 'local' modules - those are the ones loaded
                        // from the project's own package.json, rather than elsewhere
                        // on the node path.
                        if (value.local) {
                            result.push({
                                name: key,
                                version: value.version,
                                local: value.local
                            })
                            result.sort((A, B) => {
                                if (A.local && !B.local) { return 1 }
                                if (!A.local && B.local) { return -1 }
                                return A.name.localeCompare(B.name)
                            })
                        }
                    }
                }
            }
        } catch (err) {
        }
        return result
    }
}
