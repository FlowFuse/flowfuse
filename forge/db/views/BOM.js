let app

module.exports = {
    init: (appInstance) => {
        app = appInstance
        app.addSchema({
            $id: 'dependency',
            type: 'object',
            properties: {
                name: { type: 'string' },
                version: {
                    type: 'object',
                    properties: {
                        semver: { type: 'string' },
                        installed: { type: 'string', nullable: true }
                    }
                }
            }
        })
        app.addSchema({
            $id: 'dependant',
            type: 'object',
            properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                type: {
                    type: 'string',
                    enum: ['instance', 'device']
                },
                ownerType: {
                    type: 'string',
                    enum: ['instance', 'application'],
                    nullable: true
                },
                ownerId: { type: 'string', nullable: true },
                dependencies: { type: 'array', items: { $ref: 'dependency' } }
            }
        })
    },

    dependency (name, semverVersion, installedVersion = null) {
        const result = {
            name,
            version: {
                semver: semverVersion,
                installed: installedVersion || null
            }
        }
        return result
    },

    dependant (model, dependencies) {
        const type = model instanceof app.db.models.Project ? 'instance' : model instanceof app.db.models.Device ? 'device' : null
        if (type !== null) {
            const dependenciesArray = Object.entries(dependencies || {}).map(([name, version]) => app.db.views.BOM.dependency(name, version?.semver, version?.installed))
            if (type === 'device') {
                const { hashid, name, ownerType } = model
                let ownerId = null
                if (ownerType === 'instance') {
                    ownerId = model.ProjectId
                } else if (ownerType === 'application') {
                    ownerId = model.Application ? model.Application.id : app.db.models.Application.encodeHashid(model.ApplicationId)
                }
                return { id: hashid, name, type, ownerType, ownerId, dependencies: dependenciesArray }
            } else if (type === 'instance') {
                const { id, name } = model
                return { id, name, type, dependencies: dependenciesArray }
            }
        }
        return null
    }
}
