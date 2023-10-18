module.exports = {

    /**
     * Create a tag for a device
     * @param {import("../../forge").ForgeApplication} app The application object
     * @param {Object} tagType The tagType (model) to associate this tag with
     * @param {Object} team The team this tag will be scoped to
     * @param {string} name The name of the tag
     * @param {Object} options
     * @param {Object} [options.application] The application this tag will be scoped to
     * @param {string} [options.description] The description of the tag
     * @param {string} [options.color] The color of the tag
     * @returns {Promise<Object>} The created tag
     */
    createDeviceTag: async function (app, tagType, team, name, { application = null, description, color, icon } = {}) {
        // Create a tag that can be assigned to devices
        // * tagType is required. This must be a tagType with its `model` field set to 'device'
        // * team is required
        // * name is required
        // * application, description, color, and icon are optional
        //
        // The scope of a tag can be 'team' or 'application'
        // > If the scope is 'team' then the application will be null
        // > If the scope is 'application' then the application model object must be provided

        if (tagType.model !== 'device') {
            throw new Error('Tag is not a device tag')
        }
        if (typeof name !== 'string' || name.length === 0) {
            throw new Error('Tag name is required')
        }
        return await app.db.models.Tag.create({
            TagTypeId: tagType.id,
            TeamId: team.id,
            ApplicationId: application?.id,
            name,
            description,
            color: color || tagType.color, // apply the default tagType color if no color is provided
            icon: icon || tagType.icon // apply the default tagType icon if no icon is provided
        })
    },

    updateDeviceTag: async function (app, tag, { name, description, color, icon } = {}) {
        // Update a tag that can be assigned to devices
        // * tag is required. This must be a tag with its `model` field set to 'device'
        // * name, description, color, and icon are optional
        if (tag.TagType.model !== 'device') {
            throw new Error('Tag is not a device tag')
        }
        let changed = false
        if (typeof name !== 'undefined') {
            if (typeof name !== 'string' || name.length === 0) {
                throw new Error('Tag name is required')
            }
            tag.name = name
            changed = true
        }
        if (typeof description !== 'undefined') {
            tag.description = description
            changed = true
        }
        if (typeof color !== 'undefined') {
            tag.color = color
            changed = true
        }
        if (typeof icon !== 'undefined') {
            tag.icon = icon
            changed = true
        }
        if (changed) {
            await tag.save()
            await tag.reload()
        }
        return tag
    },

    assignTagsToDevices: async function (app, tagList, deviceList) {
        // Assign 1 or more tags to 1 or more devices
        // start a transaction - this will be automatically rolled back if an error occurs
        await app.db.sequelize.transaction(async (transaction) => {
            // for each device
            for (const device of deviceList) {
                // for each tag
                for (const tag of tagList) {
                    // ensure the device and tag are in the same team
                    if (tag.TeamId !== device.TeamId) {
                        throw new Error(`Tag ${tag.name} is not in the same team as device ${device.name}`)
                    }
                    // if the tag is scoped to an application, ensure the device is in the same application
                    if (tag.ApplicationId && tag.ApplicationId !== device.ApplicationId) {
                        throw new Error(`Tag ${tag.name} is scoped to application ${tag.ApplicationId} but device ${device.name} is a different application`)
                    }
                    // assign the tag to the device
                    await device.addTag(tag)
                }
            }
        })
    },

    removeTagsFromDevices: async function (app, tagList, deviceList) {
        // Remove 1 or more tags from 1 or more devices
        for (const device of deviceList) {
            for (const tag of tagList) {
                await device.removeTag(tag)
            }
        }
    }
}
