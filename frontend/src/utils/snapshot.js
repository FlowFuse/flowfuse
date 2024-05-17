function isSnapshot (snapshot) {
    // Ideally, we would use a JSON schema to validate the snapshot, but to minimise imports, we'll do it manually
    // const schema = {
    //     $schema: 'http://json-schema.org/draft-04/schema#',
    //     type: 'object',
    //     properties: {
    //         id: { type: 'string' },
    //         name: { type: 'string' },
    //         description: { type: 'string' },
    //         createdAt: { type: 'string' },
    //         updatedAt: { type: 'string' },
    //         user: { type: 'object' },
    //         exportedBy: { type: 'object' },
    //         flows: {
    //             type: 'object',
    //             properties: {
    //                 flows: { type: 'array', items: {} },
    //                 credentials: { type: 'object' }
    //             },
    //             required: ['flows']
    //         },
    //         settings: {
    //             type: 'object',
    //             properties: {
    //                 settings: { type: 'object' },
    //                 env: { type: 'object' },
    //                 modules: { type: 'object' }
    //             },
    //             required: ['settings', 'env', 'modules']
    //         }
    //     },
    //     required: ['id', 'name', 'description', 'flows', 'settings']
    // }

    const hasProperty = (object, key) => {
        return Object.prototype.hasOwnProperty.call(object, key)
    }
    const checkProperty = (object, key, propertyType, mustExist) => {
        if (!object) {
            throw new Error('Missing object')
        }
        if (!hasProperty(object, key)) {
            if (mustExist) {
                throw new Error(`Missing required property: ${key}`)
            }
        }
        if (!mustExist) {
            return true
        }
        if (propertyType) {
            switch (propertyType) {
            case 'array':
                if (!Array.isArray(object[key])) {
                    throw new Error(`Property ${key} must be an array`)
                }
                break
            case 'string':
                if (typeof object[key] !== 'string') {
                    throw new Error(`Property ${key} must be a string`)
                }
                break
            case 'object':
                if (typeof object[key] !== 'object') {
                    throw new Error(`Property ${key} must be an object`)
                }
                break
            case 'number':
                if (typeof object[key] !== 'number') {
                    throw new Error(`Property ${key} must be a number`)
                }
                break
            case 'boolean':
                if (typeof object[key] !== 'boolean') {
                    throw new Error(`Property ${key} must be a boolean`)
                }
                break
            default:
                throw new Error(`Unknown property type: ${propertyType}`)
            }
        }
        return true
    }

    // must haves
    checkProperty(snapshot, 'name', 'string', true)
    checkProperty(snapshot, 'flows', 'object', true)
    checkProperty(snapshot.flows, 'flows', 'array', true)
    checkProperty(snapshot, 'settings', 'object', true)

    // optional (but check if they exist and are the right type if they do)
    checkProperty(snapshot.settings, 'settings', 'object', false)
    checkProperty(snapshot.settings, 'env', 'object', false)
    checkProperty(snapshot.settings, 'modules', 'object', false)
    checkProperty(snapshot, 'id', 'string', false)
    checkProperty(snapshot, 'description', 'string', false)
    checkProperty(snapshot, 'createdAt', 'string', false)
    checkProperty(snapshot, 'updatedAt', 'string', false)
    checkProperty(snapshot, 'user', 'object', false)
    checkProperty(snapshot, 'exportedBy', 'object', false)
    checkProperty(snapshot.flows, 'credentials', 'object', false)
    return true
}

export {
    isSnapshot
}
