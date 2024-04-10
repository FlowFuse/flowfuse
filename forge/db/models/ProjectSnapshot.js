/**
 * A Project Snapshot definition
 * @namespace forge.db.models.ProjectSnapshot
 */
const { DataTypes, Op } = require('sequelize')

module.exports = {
    name: 'ProjectSnapshot',
    schema: {
        name: { type: DataTypes.STRING, allowNull: false },
        description: { type: DataTypes.TEXT, allowNull: true, default: '' },
        credentialSecret: { type: DataTypes.STRING, allowNull: true, default: '' },
        settings: {
            type: DataTypes.TEXT,
            set (value) {
                this.setDataValue('settings', JSON.stringify(value))
            },
            get () {
                const rawValue = this.getDataValue('settings') || '{}'
                return JSON.parse(rawValue)
            }
        },
        flows: {
            type: DataTypes.TEXT,
            set (value) {
                this.setDataValue('flows', JSON.stringify(value))
            },
            get () {
                const rawValue = this.getDataValue('flows') || '{}'
                return JSON.parse(rawValue)
            }
        },
        /** @type {'instance'|'application'|null} a virtual column that signifies the owner of the snapshot e.g. `"instance"`, `"device"` */
        ownerType: {
            type: DataTypes.VIRTUAL,
            get () {
                return this.ProjectId ? 'instance' : (this.DeviceId ? 'device' : null)
            }
        }
    },
    meta: {
        links: false
    },
    associations: function (M) {
        this.belongsTo(M.Project)
        this.belongsTo(M.Device)
        this.belongsTo(M.User)
        this.hasMany(M.Device, { foreignKey: 'targetSnapshotId' })
        this.hasMany(M.Device, { foreignKey: 'activeSnapshotId' })
        this.hasMany(M.DeviceGroup, { foreignKey: 'targetSnapshotId' })
    },
    hooks: function (M) {
        return {
            beforeBulkDestroy: async (opts) => {
                // console.log('💣💣💣 ProjectSnapshot beforeBulkDestroy', opts)
                // replicate the behaviour of the `ON DELETE SET NULL` constraint
                if (opts.individualHooks) {
                    // we have a beforeDestroy hook that will handle the cascading
                    return
                }
                // if where clause is an empty object, we are deleting all rows
                if (Object.keys(opts.where).length === 0) {
                    await M.Device.update({ targetSnapshotId: null }, { where: { targetSnapshotId: { [Op.ne]: null } }, transaction: opts?.transaction })
                }
            },
            beforeDestroy: async (row, opts) => {
                // console.log('💣💣💣 ProjectSnapshot beforeDestroy', row?.id, opts)
                // replicate the behaviour of the `ON DELETE SET NULL` constraint
                await M.Device.update({ targetSnapshotId: null }, { where: { targetSnapshotId: row.id }, transaction: opts?.transaction })
                await M.Device.update({ activeSnapshotId: null }, { where: { activeSnapshotId: row.id }, transaction: opts?.transaction })
            }
        }
    },
    finders: function (M) {
        const self = this
        return {
            static: {
                byId: async function (id, { includeFlows = true, includeSettings = true } = {}) {
                    // By default, this returns the full snapshot - including settings and flows
                    // This should _only_ be used when getting all of that information.
                    // Otherwise use the options to disable retrieving flows/settings
                    if (typeof id === 'string') {
                        id = M.ProjectSnapshot.decodeHashid(id)
                    }
                    const toExclude = []
                    if (!includeFlows) {
                        toExclude.push('flows')
                    }
                    if (!includeSettings) {
                        toExclude.push('settings')
                    }
                    let attributes = null
                    if (toExclude.length > 0) {
                        attributes = {
                            exclude: toExclude
                        }
                    }
                    return self.findOne({
                        where: { id },
                        attributes
                    })
                },
                forProject: async (projectId, pagination = {}) => {
                    const limit = parseInt(pagination.limit) || 1000
                    const where = {
                        ProjectId: projectId
                    }
                    if (pagination.cursor) {
                        where.id = { [Op.lt]: M.ProjectSnapshot.decodeHashid(pagination.cursor) }
                    }
                    const { count, rows } = await this.findAndCountAll({
                        where,
                        order: [['id', 'DESC']],
                        limit,
                        attributes: ['hashid', 'id', 'name', 'description', 'createdAt', 'updatedAt'],
                        include: {
                            model: M.User,
                            attributes: ['hashid', 'id', 'username', 'avatar']
                        }
                    })
                    return {
                        meta: {
                            next_cursor: rows.length === limit ? rows[rows.length - 1].hashid : undefined
                        },
                        count,
                        snapshots: rows
                    }
                },
                forDevice: async (deviceId, pagination = {}) => {
                    const limit = parseInt(pagination.limit) || 1000
                    const where = {
                        DeviceId: deviceId
                    }
                    if (pagination.cursor) {
                        where.id = { [Op.lt]: M.ProjectSnapshot.decodeHashid(pagination.cursor) }
                    }
                    const { count, rows } = await this.findAndCountAll({
                        where,
                        order: [['id', 'DESC']],
                        limit,
                        attributes: ['hashid', 'id', 'name', 'description', 'createdAt', 'updatedAt'],
                        include: {
                            model: M.User,
                            attributes: ['hashid', 'id', 'username', 'avatar']
                        }
                    })
                    return {
                        meta: {
                            next_cursor: rows.length === limit ? rows[rows.length - 1].hashid : undefined
                        },
                        count,
                        snapshots: rows
                    }
                },
                forApplication: async (idOrHash, pagination = {}) => {
                    let id = idOrHash
                    if (typeof idOrHash === 'string') {
                        id = M.Application.decodeHashid(idOrHash)
                    }
                    const limit = parseInt(pagination.limit) || 1000
                    const where = {
                        [Op.or]: {
                            '$Project.ApplicationId$': id,
                            '$Device.ApplicationId$': id
                        }
                    }
                    if (pagination.cursor) {
                        where.id = { [Op.lt]: M.ProjectSnapshot.decodeHashid(pagination.cursor) }
                    }
                    if (pagination.deviceId) {
                        where.DeviceId = { [Op.eq]: M.Device.decodeHashid(pagination.deviceId) }
                    }
                    if (pagination.instanceId) {
                        where.InstanceId = { [Op.eq]: pagination.instanceId }
                    }
                    const { count, rows } = await this.findAndCountAll({
                        where,
                        order: [['id', 'DESC']],
                        limit,
                        attributes: ['hashid', 'id', 'name', 'description', 'createdAt', 'updatedAt', 'ProjectId', 'DeviceId', 'ownerType'],
                        include: [{
                            model: M.User,
                            attributes: ['hashid', 'id', 'username', 'avatar']
                        },
                        {
                            model: M.Project,
                            attributes: ['hashid', 'id', 'name', 'createdAt', 'updatedAt']
                        },
                        {
                            model: M.Device,
                            attributes: ['hashid', 'id', 'name', 'type', 'createdAt', 'updatedAt']
                        }]
                    })
                    return {
                        meta: {
                            next_cursor: rows.length === limit ? rows[rows.length - 1].hashid : undefined
                        },
                        count,
                        snapshots: rows
                    }
                }
            }
        }
    }
}
