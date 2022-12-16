/**
 * A Device
 * @namespace forge.db.models.Device
 */
const { DataTypes } = require('sequelize')
const crypto = require('crypto')
const Controllers = require('../controllers')
const { buildPaginationSearchClause } = require('../utils')

const ALLOWED_SETTINGS = {
    env: 1
}

module.exports = {
    name: 'Device',
    schema: {
        name: { type: DataTypes.STRING, allowNull: false },
        type: { type: DataTypes.STRING, allowNull: false },
        credentialSecret: { type: DataTypes.STRING, allowNull: false },
        state: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
        lastSeenAt: { type: DataTypes.DATE, allowNull: true },
        settingsHash: { type: DataTypes.STRING, allowNull: true }
    },
    associations: function (M) {
        this.belongsTo(M.Team)
        this.belongsTo(M.Project)
        this.hasOne(M.AccessToken, {
            foreignKey: 'ownerId',
            constraints: false,
            scope: {
                ownerType: 'device'
            }
        })
        this.belongsTo(M.ProjectSnapshot, { as: 'targetSnapshot' })
        this.belongsTo(M.ProjectSnapshot, { as: 'activeSnapshot' })
        this.hasMany(M.DeviceSettings)
    },
    hooks: function (M, app) {
        return {
            beforeCreate: async (device, options) => {
                const deviceLimit = app.license.get('devices')
                const deviceCount = await M.Device.count()
                if (deviceCount >= deviceLimit) {
                    throw new Error('license limit reached')
                }
            },
            beforeSave: async (device, options) => {
                // since `id`, `name` and `type` are added as FF_DEVICE_xx env vars, we
                // should update the settings checksum if they are modified
                if (device.changed('name') || device.changed('type') || device.changed('id')) {
                    await device.updateSettingsHash()
                }
            },
            afterDestroy: async (device, opts) => {
                await M.AccessToken.destroy({
                    where: {
                        ownerType: 'device',
                        ownerId: '' + device.id
                    }
                })
                await M.DeviceSettings.destroy({
                    where: {
                        DeviceId: device.id
                    }
                })
                await M.BrokerClient.destroy({
                    where: {
                        ownerType: 'device',
                        ownerId: '' + device.id
                    }
                })
            }
        }
    },
    finders: function (M) {
        return {
            instance: {
                async refreshAuthTokens () {
                    const accessToken = await Controllers.AccessToken.createTokenForDevice(this)
                    const credentialSecret = crypto.randomBytes(32).toString('hex')
                    this.credentialSecret = credentialSecret
                    await this.save()
                    const result = {
                        token: accessToken.token,
                        credentialSecret
                    }
                    const broker = await Controllers.BrokerClient.createClientForDevice(this)
                    if (broker) {
                        result.broker = broker
                    }
                    return result
                },
                async getAccessToken () {
                    return M.AccessToken.findOne({
                        where: { ownerId: '' + this.id }
                    })
                },
                async updateSettingsHash (settings) {
                    const _settings = settings || await this.getAllSettings()
                    this.settingsHash = hashSettings(_settings)
                },
                async getAllSettings () {
                    const result = {}
                    const settings = await this.getDeviceSettings()
                    settings.forEach(setting => {
                        result[setting.key] = setting.value
                    })
                    result.env = Controllers.Device.insertPlatformSpecificEnvVars(this, result.env) // add platform specific device env vars
                    return result
                },
                async updateSettings (obj) {
                    const updates = []
                    for (let [key, value] of Object.entries(obj)) {
                        if (ALLOWED_SETTINGS[key]) {
                            if (key === 'env' && value && Array.isArray(value)) {
                                value = Controllers.Device.removePlatformSpecificEnvVars(value) // remove platform specific values
                            }
                            updates.push({ DeviceId: this.id, key, value })
                        }
                    }
                    await M.DeviceSettings.bulkCreate(updates, { updateOnDuplicate: ['value'] })
                    await this.updateSettingsHash()
                    await this.save()
                },
                async updateSetting (key, value) {
                    if (ALLOWED_SETTINGS[key]) {
                        if (key === 'env' && value && Array.isArray(value)) {
                            value = Controllers.Device.removePlatformSpecificEnvVars(value) // remove platform specific values
                        }
                        const result = await M.ProjectSettings.upsert({ DeviceId: this.id, key, value })
                        await this.updateSettingsHash()
                        await this.save()
                        return result
                    } else {
                        throw new Error(`Invalid device setting ${key}`)
                    }
                },
                async getSetting (key) {
                    const result = await M.DeviceSettings.findOne({ where: { DeviceId: this.id, key } })
                    if (result) {
                        if (key === 'env' && result.value && Array.isArray(result.value)) {
                            return Controllers.Device.insertPlatformSpecificEnvVars(this, result.value)
                        }
                        return result.value
                    }
                    return undefined
                }
            },
            static: {
                byId: async (id) => {
                    if (typeof id === 'string') {
                        id = M.Device.decodeHashid(id)
                    }
                    return this.findOne({
                        where: { id },
                        include: [
                            {
                                model: M.Team,
                                attributes: ['hashid', 'id', 'name', 'slug', 'links']
                            },
                            {
                                model: M.Project,
                                attributes: ['id', 'name', 'links']
                            },
                            { model: M.ProjectSnapshot, as: 'targetSnapshot', attributes: ['id', 'hashid', 'name'] },
                            { model: M.ProjectSnapshot, as: 'activeSnapshot', attributes: ['id', 'hashid', 'name'] }
                        ]
                    })
                },
                byTeam: async (teamHashId) => {
                    const teamId = M.Team.decodeHashid(teamHashId)
                    return this.findAll({
                        include: [
                            {
                                model: M.Team,
                                where: { id: teamId },
                                attributes: ['hashid', 'id', 'name', 'slug', 'links']
                            },
                            {
                                model: M.Project,
                                attributes: ['id', 'name', 'links']
                            },
                            { model: M.ProjectSnapshot, as: 'targetSnapshot', attributes: ['id', 'hashid', 'name'] },
                            { model: M.ProjectSnapshot, as: 'activeSnapshot', attributes: ['id', 'hashid', 'name'] }
                        ]
                    })
                },
                byProject: async (projectId) => {
                    return this.findAll({
                        include: [
                            {
                                model: M.Team,
                                attributes: ['hashid', 'id', 'name', 'slug', 'links']
                            },
                            {
                                model: M.Project,
                                where: {
                                    id: projectId
                                },
                                attributes: ['id', 'name', 'links']
                            },
                            { model: M.ProjectSnapshot, as: 'targetSnapshot', attributes: ['id', 'hashid', 'name'] },
                            { model: M.ProjectSnapshot, as: 'activeSnapshot', attributes: ['id', 'hashid', 'name'] }
                        ]
                    })
                },
                getAll: async (pagination = {}, where = {}) => {
                    const limit = parseInt(pagination.limit) || 1000
                    if (pagination.cursor) {
                        pagination.cursor = M.Device.decodeHashid(pagination.cursor)
                    }
                    const [rows, count] = await Promise.all([
                        this.findAll({
                            where: buildPaginationSearchClause(pagination, where, ['Device.name', 'Device.type']),
                            include: [
                                {
                                    model: M.Team,
                                    attributes: ['hashid', 'id', 'name', 'slug', 'links']
                                },
                                {
                                    model: M.Project,
                                    attributes: ['id', 'name', 'links']
                                },
                                { model: M.ProjectSnapshot, as: 'targetSnapshot', attributes: ['id', 'hashid', 'name'] },
                                { model: M.ProjectSnapshot, as: 'activeSnapshot', attributes: ['id', 'hashid', 'name'] }
                            ],
                            order: [['id', 'ASC']],
                            limit
                        }),
                        this.count({ where })
                    ])
                    return {
                        meta: {
                            next_cursor: (rows.length === limit && limit > 0) ? rows[rows.length - 1].hashid : undefined
                        },
                        count,
                        devices: rows
                    }
                },
                byTargetSnapshot: async (snapshotHashId) => {
                    const snapshotId = M.ProjectSnapshot.decodeHashid(snapshotHashId)
                    return this.findAll({
                        include: [
                            {
                                model: M.Team,
                                attributes: ['hashid', 'id', 'name', 'slug', 'links']
                            },
                            {
                                model: M.Project,
                                attributes: ['id', 'name', 'links']
                            },
                            {
                                model: M.ProjectSnapshot,
                                as: 'targetSnapshot',
                                attributes: ['id', 'hashid', 'name'],
                                where: {
                                    id: snapshotId
                                }
                            },
                            { model: M.ProjectSnapshot, as: 'activeSnapshot', attributes: ['id', 'hashid', 'name'] }
                        ]
                    })
                },
                getDeviceProjectId: async (id) => {
                    if (typeof id === 'string') {
                        id = M.Device.decodeHashid(id)
                    }
                    const device = await this.findOne({
                        where: { id },
                        attributes: [
                            'ProjectId'
                        ]
                    })
                    if (device) {
                        return device.ProjectId
                    }
                },
                /**
                 * Recalculate the `settingsHash` for all devices
                 * @param {boolean} [all=false] If `false` (or omitted), only devices where `settingsHash` == `null` will be recalculated. If `true`, all devices are updated.
                 */
                recalculateSettingsHashes: async (all) => {
                    const findOpts = {
                        where: { settingsHash: null },
                        attributes: ['hashid', 'id', 'name', 'type', 'targetSnapshotId', 'settingsHash']
                    }
                    if (all) {
                        delete findOpts.where
                    }
                    const devices = await this.findAll(findOpts)
                    if (devices && devices.length) {
                        devices.forEach(async (device) => {
                            await device.updateSettingsHash()
                            await device.save()
                        })
                    }
                }
            }
        }
    }
}

function hashSettings (settings) {
    const hash = crypto.createHash('sha256')
    hash.update(JSON.stringify(settings))
    return hash.digest('hex')
}
