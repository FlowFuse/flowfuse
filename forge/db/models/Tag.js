/**
 * Tag
 * @namespace forge.db.models.Tag
 */

const { DataTypes, Op } = require('sequelize')

const { buildPaginationSearchClause } = require('../utils')

module.exports = {
    name: 'Tag',
    schema: {
        name: { type: DataTypes.STRING, allowNull: false },
        description: { type: DataTypes.TEXT, allowNull: true, defaultValue: null },
        color: { type: DataTypes.STRING, allowNull: true, defaultValue: null },
        icon: { type: DataTypes.STRING, allowNull: true, defaultValue: null }
        // settings: { // FUTURE
        //     type: DataTypes.TEXT,
        //     set (value) {
        //         this.setDataValue('settings', JSON.stringify(value))
        //     },
        //     get () {
        //         const rawValue = this.getDataValue('settings') || '{}'
        //         return JSON.parse(rawValue)
        //     }
        // }
    },
    associations: function (M) {
        // Add 'DeviceTags' junction table to permit many-to-many relationship between Devices and Tags
        // NOTE: Sequelize will automatically create the table for us.
        // SEE: forge/db/models/Tag.js for the other side of this relationship
        this.belongsToMany(M.Device, { through: 'DeviceTags' })
        // Add 'TagType' foreign key to permit one-to-many relationship between Tag and TagType
        // SEE: forge/db/models/TagType.js for the other side of this relationship
        this.belongsTo(M.TagType)
        // Add 'Team' foreign key. A tag MUST be associated with an Team.
        // SEE: forge/db/models/Team.js for the other side of this relationship
        this.belongsTo(M.Team, { foreignKey: { allowNull: false } })
        // Add 'Application' foreign key. A tag CAN be scoped to an application (if populated).
        // SEE: forge/db/models/Application.js for the other side of this relationship
        this.belongsTo(M.Application)
    },
    hooks: {
        beforeDestroy: async (Tag, opts) => {
            const usageCount = await Tag.countDevices()
            if (usageCount > 0) {
                throw new Error('Cannot delete Tag that is applied to a Device')
            }
        },
        // executed "after" `Model.sync(...)`
        afterSync: function (options) {
            // this = Model
            console.warn('afterSync', options)
        }
    },
    finders: function (M) {
        const self = this
        /**
         * Generate a where clause based on team and app id.
         * If an application ID is not provided, the where clause will match all tags in the team.
         * If a team ID is not provided, the where clause will match all tags in the application.
         * @private
         * @param {Number|String} teamIdOrHash
         * @param {Number|String} [applicationIdOrHash]
         */
        function computeWhereClause (teamIdOrHash, applicationIdOrHash) {
            let TeamId = teamIdOrHash
            if (teamIdOrHash && typeof teamIdOrHash === 'string') {
                TeamId = M.Team.decodeHashid(teamIdOrHash)
            }
            let ApplicationId = applicationIdOrHash
            if (applicationIdOrHash && typeof applicationIdOrHash === 'string') {
                ApplicationId = M.Application.decodeHashid(applicationIdOrHash)
            }
            const where = {}

            // when both team and application are provided, we want to match tags that are:
            // * match this team AND application
            // OR
            // * match this team AND the tag has no application scope specified
            // in other words, we want to match tags that are scoped to the team and application, or just the team
            if (TeamId && ApplicationId) {
                where[Op.or] = [
                    { TeamId, ApplicationId },
                    { TeamId, ApplicationId: null }
                ]
            } else {
                if (TeamId) {
                    // when only team is provided, we want to match any tags that are scoped to the team
                    where.TeamId = TeamId
                } else if (ApplicationId) {
                    // when only application is provided, we want to match any tags that are scoped to the application
                    where.ApplicationId = ApplicationId
                }
            }
            return where
        }
        return {
            static: {
                byId: async function (id) {
                    if (typeof id === 'string') {
                        id = M.Tag.decodeHashid(id)
                    }
                    return self.findOne({
                        where: { id },
                        include: [
                            { model: M.TagType }
                        ]
                    })
                },
                /**
                 * Get all tags available to a device.
                 * NOTE: All Tags in the same team regardless of application scope will be returned.
                 * @param {Number|String} teamIdOrHash The team ID
                 * @param {Object} pagination
                 */
                forDevice: async (teamIdOrHash, applicationIdOrHash, pagination = {}) => {
                    const where = computeWhereClause(teamIdOrHash, applicationIdOrHash)
                    return M.Tag.getAll(pagination, where, 'device', { includeTagType: true, includeTeam: true })
                },
                /**
                 * Get all tags available to an application.
                 * NOTE: Tags in the same team but not scoped to an application will also be returned.
                 * @param {Number|String} teamIdOrHash The team ID
                 * @param {Number|String} applicationIdOrHash The application ID
                 * @param {Object} pagination
                 */
                forApplication: async (teamIdOrHash, applicationIdOrHash, pagination = {}) => {
                    const where = computeWhereClause(teamIdOrHash, applicationIdOrHash)
                    return M.Tag.getAll(pagination, where, 'application', { includeTagType: true, includeTeam: true, includeApplication: true })
                },
                /**
                 * Get all tags available to an application.
                 * NOTE: Tags in the same team but not scoped to an application will also be returned.
                 * @param {Number|String} teamIdOrHash The team ID
                 * @param {Number|String} applicationIdOrHash The application ID
                 * @param {Object} pagination
                 */
                forTeam: async (teamIdOrHash, pagination = {}) => {
                    const where = computeWhereClause(teamIdOrHash)
                    return M.Tag.getAll(pagination, where, 'team', { includeTagType: true, includeTeam: true, includeApplication: true })
                },
                /**
                 * Get tags assigned to a given device.
                 * @param {Number|String} deviceIdOrHash The device ID
                 */
                assignedToDevice: async (deviceIdOrHash) => {
                    let DeviceId = deviceIdOrHash
                    if (typeof deviceIdOrHash === 'string') {
                        DeviceId = M.Device.decodeHashid(deviceIdOrHash)
                    }

                    // There is a junction table named DeviceTags that links Devices to Tags
                    // To get all tags for a given device, we need to query the junction table through the Tag model

                    return this.findAll({
                        include: [
                            { model: M.TagType },
                            {
                                model: M.Device,
                                through: { },
                                where: { id: DeviceId },
                                attributes: []
                            }
                        ]
                    })
                },
                getAll: async (pagination = {}, where = {}, modelName, { excludeTagType = false, includeTeam = false, includeApplication = false } = {}) => {
                    const limit = parseInt(pagination.limit) || 1000
                    if (pagination.cursor) {
                        pagination.cursor = M.Tag.decodeHashid(pagination.cursor)
                    }

                    // Sorting
                    const order = [['id', 'ASC']]
                    // TODO: Add support for sorting by name, description, color, icon, team / application etc.

                    // Extra models to include
                    const include = []
                    if (includeTeam) {
                        include.push({
                            model: M.Team,
                            attributes: ['hashid', 'id', 'name', 'slug', 'links', 'TeamTypeId']
                        })
                    }
                    if (includeApplication) {
                        include.push({
                            model: M.Application,
                            attributes: ['hashid', 'id', 'name', 'links']
                        })
                    }
                    if (modelName || !excludeTagType) {
                        include.push({
                            model: M.TagType,
                            where: modelName ? { model: modelName } : {},
                            attributes: excludeTagType ? [] : ['hashid', 'id', 'name', 'description', 'model']
                        })
                    }

                    const [rows, count] = await Promise.all([
                        this.findAll({
                            where: buildPaginationSearchClause(pagination, where, ['Tag.name', 'Tag.description'], {}, order),
                            include,
                            order,
                            limit: pagination.statusOnly ? null : limit
                        }),
                        this.count({ where })
                    ])
                    return {
                        meta: {
                            next_cursor: rows.length === limit ? rows[rows.length - 1].hashid : undefined
                        },
                        count,
                        tags: rows
                    }
                }
            }
        }
    }
}
