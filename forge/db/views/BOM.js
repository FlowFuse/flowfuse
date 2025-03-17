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
                        wanted: { type: 'string' },
                        current: { type: 'string', nullable: true }
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
                dependencies: { type: 'array', items: { $ref: 'dependency' } },
                state: { type: 'string', nullable: true }
            }
        })
    },

    dependency (name, semverVersion, installedVersion = null) {
        const result = {
            name,
            version: {
                wanted: semverVersion,
                current: installedVersion || null
            }
        }
        return result
    },

    dependant (model, dependencies) {
        const type = model instanceof app.db.models.Project ? 'instance' : model instanceof app.db.models.Device ? 'device' : null
        if (type !== null) {
            const dependenciesArray = Object.entries(dependencies || {}).map(([name, version]) => app.db.views.BOM.dependency(name, version?.wanted, version?.current))
            if (type === 'device') {
                const { hashid, name, ownerType, state } = model
                let ownerId = null
                if (ownerType === 'instance') {
                    ownerId = model.ProjectId
                } else if (ownerType === 'application') {
                    ownerId = model.Application ? model.Application.id : app.db.models.Application.encodeHashid(model.ApplicationId)
                }
                return { id: hashid, name, type, ownerType, ownerId, dependencies: dependenciesArray, state }
            } else if (type === 'instance') {
                const { id, name, state } = model
                return { id, name, type, dependencies: dependenciesArray, state }
            }
        }
        return null
    }
}
