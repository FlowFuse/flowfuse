module.exports = function (app) {
    // TODO: add schema for TagSummary
    // app.addSchema({
    //     $id: 'TagSummary',
    //     type: 'object',
    //     properties: {
    //         id: { type: 'string' },
    //         name: { type: 'string' },
    //         description: { type: 'string' },
    //         color: { type: 'string' },
    //         icon: { type: 'string' }
    //     }
    // })
    function tagSummary (tag) {
        if (Object.hasOwn(tag, 'get')) {
            tag = tag.get({ plain: true })
        }
        const result = {
            id: tag.hashid,
            name: tag.name,
            description: tag.description,
            color: tag.color,
            icon: tag.icon
        }
        return result
    }

    // TODO: add schema for Tag when it is ready
    // app.addSchema({
    //     $id: 'Tag',
    //     type: 'object',
    //     allOf: [{ $ref: 'TagSummary' }],
    //     properties: {
    //         createdAt: { type: 'string' },
    //         updatedAt: { type: 'string' },
    //         TagType: { type: 'object', additionalProperties: true },
    //         Team: { type: 'object', additionalProperties: true },
    //         Application: { type: 'object', additionalProperties: true }
    //     },
    //     additionalProperties: true
    // })
    function tag (tag) {
        if (tag) {
            let item = tag
            if (item.toJSON) {
                item = item.toJSON()
            }
            const filtered = {
                id: item.hashid,
                name: item.name,
                description: item.description,
                TagType: item.TagType ? app.db.views.TagType.tagType(tag.TagType) : null,
                Team: item.Team ? app.db.views.Team.teamSummary(item.Team) : null,
                Application: item.Application ? app.db.views.Application.applicationSummary(item.Application) : null,
                color: item.color,
                icon: item.icon
            }
            filtered.color = filtered.color || filtered.TagType?.color || null
            filtered.icon = filtered.icon || filtered.TagType?.icon || null
            return filtered
        } else {
            return null
        }
    }

    // TODO: add schema for TeamTagsList
    // app.addSchema({
    //     $id: 'TeamTagsList',
    //     type: 'array',
    //     items: {
    //     }
    // })

    function teamTagsList (tagList) {
        return tagList.map(tag)
    }

    // TODO: add schema for ApplicationTagsList
    // app.addSchema({
    //     $id: 'ApplicationTagsList',
    //     type: 'array',
    //     items: {
    //     }
    // })

    function applicationTagsList (tagList) {
        return tagList.map(tag)
    }

    // TODO: add schema for DeviceTagsList
    // app.addSchema({
    //     $id: 'DeviceTagsList',
    //     type: 'array',
    //     items: {
    //     }
    // })

    function deviceTagsList (tagList) {
        return tagList.map(tag)
    }

    return {
        tag,
        tagSummary,
        teamTagsList,
        applicationTagsList,
        deviceTagsList
    }
}
