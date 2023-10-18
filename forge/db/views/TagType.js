module.exports = function (app) {
    // TODO: add schema for TagTypeSummary
    // app.addSchema({
    //     $id: 'TagTypeSummary',
    //     type: 'object',
    //     properties: {
    //         id: { type: 'string' },
    //         name: { type: 'string' },
    //         description: { type: 'string' },
    //         model: { type: 'string' }
    //     }
    // })
    function tagTypeSummary (tag) {
        if (Object.hasOwn(tag, 'get')) {
            tag = tag.get({ plain: true })
        }
        const result = {
            id: tag.hashid,
            name: tag.name,
            description: tag.description,
            model: tag.model,
            icon: tag.icon,
            color: tag.color
        }
        return result
    }

    // TODO: add schema for TagType when it is ready
    // app.addSchema({
    //     $id: 'Tag',
    //     type: 'object',
    //     allOf: [{ $ref: 'TagTypeSummary' }],
    //     properties: {
    //         createdAt: { type: 'string' },
    //         updatedAt: { type: 'string' },
    //         TagType: { type: 'object', additionalProperties: true }
    //     },
    //     additionalProperties: true
    // })
    function tagType (tag) {
        if (tag) {
            let item = tag
            if (item.toJSON) {
                item = item.toJSON()
            }
            const filtered = {
                id: item.hashid,
                name: item.name,
                description: item.description,
                model: item.model,
                icon: item.icon,
                color: item.model
            }
            return filtered
        } else {
            return null
        }
    }

    return {
        tagType,
        tagTypeSummary
    }
}
