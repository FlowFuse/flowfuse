/**
 * A Device
 * @namespace forge.db.models.Device
 */
const crypto = require('crypto')

const SemVer = require('semver')

const { col, fn, DataTypes, Op, where } = require('sequelize')

const Controllers = require('../controllers')
const { buildPaginationSearchClause } = require('../utils')

const ALLOWED_SETTINGS = {
    autoSnapshot: 1,
    editor: 1,
    env: 1,
    palette: 1,
    security: 1
}

const DEFAULT_SETTINGS = {
    autoSnapshot: true,
    editor: {
        nodeRedVersion: null
    }
}

module.exports = {
    name: 'Device',
    schema: {
        name: { type: DataTypes.STRING, allowNull: false },
        type: { type: DataTypes.STRING, allowNull: false },
        credentialSecret: { type: DataTypes.STRING, allowNull: false },
        state: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
        lastSeenAt: { type: DataTypes.DATE, allowNull: true },
        settingsHash: { type: DataTypes.STRING, allowNull: true },
        agentVersion: { type: DataTypes.STRING, allowNull: true },
        nodeRedVersion: { type: DataTypes.STRING, allowNull: true },
        mode: { type: DataTypes.STRING, allowNull: true, defaultValue: 'autonomous' },
        editorAffinity: { type: DataTypes.STRING, defaultValue: '' },
        editorToken: { type: DataTypes.STRING, defaultValue: '' },
        editorConnected: { type: DataTypes.BOOLEAN, defaultValue: false },
        /** @type {'instance'|'application'|null} a virtual column that signifies the parent type e.g. `"instance"`, `"application"` */
        ownerType: {
            type: DataTypes.VIRTUAL(DataTypes.ENUM('instance', 'application', null)),
            get () {
                return this.ProjectId ? 'instance' : (this.ApplicationId ? 'application' : null)
            }
        },
        isApplicationOwned: {
            type: DataTypes.VIRTUAL(DataTypes.BOOLEAN),
            get () {
                return this.ownerType === 'application'
            }
        }
    },
    associations: function (M) {
        this.belongsTo(M.Application)
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
        this.hasMany(M.ProjectSnapshot) // associate device at application level with snapshots
        this.belongsTo(M.DeviceGroup, { foreignKey: { allowNull: true } }) // SEE: forge/db/models/DeviceGroup.js for the other side of this relationship

        // Also hasOne AuthClient (for ff-auth) - but not adding the association as we don't
        // want the sequelize mixins to be added to the Device model - they don't
        // handle the casting from int to string for the deviceId/ownerId
    },
    hooks: function (M, app) {
        return {
            beforeCreate: async (device, options) => {
                // if the product is licensed, we permit overage
                const isLicensed = app.license.active()
                if (isLicensed !== true) {
                    const { devices } = await app.license.usage('devices')
                    if (devices.count >= devices.limit) {
                        throw new Error('license limit reached')
                    }
                } else {
                    if (app.license.status().expired) {
                        throw new Error('license expired')
                    }
                }
            },
            afterCreate: async (device, options) => {
                const { devices } = await app.license.usage('devices')
                if (devices.count > devices.limit) {
                    await app.auditLog.Platform.platform.license.overage('system', null, devices)
                }
            },
            afterSave: async (device, options) => {
                // since `id`, `name` and `type` are added as FF_DEVICE_xx env vars, we
                // should update the settings checksum if they are modified
                // Additionally, since changing the target snapshot or DeviceGroupId
                // can affect the FF_ env vars, we should update the checksum
                if (device.changed('name') || device.changed('type') || device.changed('id') || device.changed('targetSnapshotId') || device.changed('DeviceGroupId')) {
                    const updated = await device.updateSettingsHash()
                    if (updated) {
                        await device.save({
                            hooks: false,
                            transaction: options.transaction
                        })
                    }
                }
            },
            afterBulkUpdate: async (options) => {
                if (options.fields.includes('targetSnapshotId') || options.fields.includes('DeviceGroupId')) {
                    const devices = await M.Device.findAll({ where: options.where })
                    for (const device of devices) {
                        const updated = await device.updateSettingsHash()
                        if (updated) {
                            await device.save({
                                hooks: false,
                                transaction: options.transaction
                            })
                        }
                    }
                }
            },
            afterDestroy: async (device, opts) => {
                await M.AccessToken.destroy({
                    where: {
                        ownerType: 'device',
                        ownerId: '' + device.id
                    }
                })
                await M.AccessToken.destroy({
                    where: {
                        ownerType: 'npm',
                        ownerId: {
                            [Op.like]: `d-${device.hashid}@%`
                        }
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
                await M.AuthClient.destroy({
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
                async refreshAuthTokens ({ refreshOTC = false } = {}) {
                    const accessToken = await Controllers.AccessToken.createTokenForDevice(this)
                    const credentialSecret = crypto.randomBytes(32).toString('hex')
                    this.credentialSecret = credentialSecret
                    await this.save()
                    const result = {
                        token: accessToken.token,
                        credentialSecret
                    }
                    if (refreshOTC) {
                        const oneTimeCode = await Controllers.AccessToken.createDeviceOTC(this)
                        result.otc = oneTimeCode.otc
                    }
                    const broker = await Controllers.BrokerClient.createClientForDevice(this)
                    if (broker) {
                        result.broker = broker
                    }
                    return result
                },
                async getAccessToken () {
                    return M.AccessToken.findOne({
                        where: { ownerId: '' + this.id, ownerType: 'device', scope: 'device' }
                    })
                },
                async getAuthClient () {
                    // Cannot use a hasOne association as the resulting getAuthClient
                    // mixin doesn't know to cast this.id to a string
                    return M.AuthClient.findOne({
                        where: { ownerId: '' + this.id, ownerType: 'device' }
                    })
                },
                async updateSettingsHash (settings) {
                    const settingsHash = this.settingsHash
                    const _settings = settings || await this.getAllSettings({ mergeDeviceGroupSettings: true })
                    delete _settings.autoSnapshot // autoSnapshot is not part of the settings hash
                    this.settingsHash = hashSettings(_settings)
                    return this.settingsHash !== settingsHash
                },
                async getAllSettings (options = { mergeDeviceGroupSettings: false }) {
                    const mergeDeviceGroupSettings = options.mergeDeviceGroupSettings || false
                    const result = {}
                    const settings = await this.getDeviceSettings()
                    settings.forEach(setting => {
                        result[setting.key] = setting.value
                    })
                    // To compute the platform specific env vars, we need the associated
                    // owner (application or instance) and the target snapshot model (if any)
                    const reloadWith = []
                    if (this.isApplicationOwned && !this.Application) {
                        reloadWith.push(M.Application)
                    }
                    if (this.targetSnapshotId && !this.targetSnapshot) {
                        reloadWith.push({ model: M.ProjectSnapshot, as: 'targetSnapshot', attributes: ['id', 'hashid', 'name'] })
                    }
                    if (reloadWith.length) {
                        await this.reload({ include: reloadWith })
                    }
                    result.env = Controllers.Device.insertPlatformSpecificEnvVars(this, result.env) // add platform specific device env vars
                    // if the device is a group member, we need to merge the group settings
                    if (mergeDeviceGroupSettings && this.DeviceGroupId) {
                        const group = this.DeviceGroup || await M.DeviceGroup.byId(this.DeviceGroupId)
                        if (group) {
                            const groupEnv = await group.settings.env || []
                            // Merge rule: If the device has an env var AND it has a value, it remains unchanged.
                            // Otherwise, the value is taken from the group.
                            // This is to allow the device to override a (global) group env setting.
                            groupEnv.forEach(env => {
                                const existing = result.env.find(e => e.name === env.name)
                                if (!existing) {
                                    result.env.push(env)
                                } else if (existing && !existing.value) {
                                    existing.value = env.value
                                }
                            })
                        }
                    }
                    if (!Object.prototype.hasOwnProperty.call(result, 'autoSnapshot')) {
                        result.autoSnapshot = DEFAULT_SETTINGS.autoSnapshot
                    }
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
                        const result = await M.DeviceSettings.upsert({ DeviceId: this.id, key, value })
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
                    return DEFAULT_SETTINGS[key]
                },
                async getLatestSnapshot () {
                    const snapshots = await this.getProjectSnapshots({
                        order: [['createdAt', 'DESC'], ['id', 'DESC']],
                        limit: 1
                    })
                    return snapshots[0]
                },
                getDefaultNodeRedVersion () {
                    let nodeRedVersion = '3.0.2' // default to older Node-RED
                    if (SemVer.satisfies(SemVer.coerce(this.agentVersion), '>=1.11.2')) {
                        // 1.11.2 includes fix for ESM loading of GOT, so lets use 'latest' as before
                        nodeRedVersion = 'latest'
                    }
                    return nodeRedVersion
                },
                getDefaultModules () {
                    return {
                        'node-red': this.getDefaultNodeRedVersion(),
                        '@flowfuse/nr-project-nodes': '>0.5.0', // TODO: get this from the "settings" (future)
                        '@flowfuse/nr-assistant': '>=0.1.0'
                    }
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
                                attributes: ['hashid', 'id', 'name', 'slug', 'links', 'TeamTypeId']
                            },
                            { model: M.Application, attributes: ['hashid', 'id', 'name', 'links'] },
                            {
                                model: M.Project,
                                attributes: ['id', 'name', 'links'],
                                include: {
                                    model: M.Application,
                                    attributes: ['id', 'name', 'links']
                                }
                            },
                            { model: M.ProjectSnapshot, as: 'targetSnapshot', attributes: ['id', 'hashid', 'name'] },
                            { model: M.ProjectSnapshot, as: 'activeSnapshot', attributes: ['id', 'hashid', 'name'] }
                        ]
                    })
                },
                byTeam: async (teamIdOrHash, { query = null, deviceId = null } = {}) => {
                    let teamId = teamIdOrHash
                    if (typeof teamId === 'string') {
                        teamId = M.Team.decodeHashid(teamId)
                    }
                    const queryObject = {
                        where: { [Op.and]: [{ TeamId: teamId }] }
                    }
                    if (deviceId) {
                        queryObject.where[Op.and].push({ id: deviceId })
                    } else if (query) {
                        queryObject.where[Op.and].push({
                            [Op.or]: [
                                where(fn('lower', col('Device.name')), { [Op.like]: `%${query.toLowerCase()}%` }),
                                where(fn('lower', col('Device.type')), { [Op.like]: `%${query.toLowerCase()}%` })
                            ]
                        })
                    }
                    return this.getAll({}, queryObject.where)
                },
                getAll: async (pagination = {}, where = {}, { includeInstanceApplication = false, includeDeviceGroup = false } = {}) => {
                    // Pagination
                    const limit = Math.min(parseInt(pagination.limit) || 100, 100)
                    if (pagination.cursor) {
                        const cursors = pagination.cursor.split(',')
                        cursors[cursors.length - 1] = M.Device.decodeHashid(cursors[cursors.length - 1])
                        pagination.cursor = cursors.join(',')
                    }

                    // Filtering
                    if (pagination.filters?.state) {
                        // Unknown is the blank state
                        where.state = pagination.filters.state === 'unknown' ? '' : pagination.filters.state
                    }

                    if (pagination.filters?.lastseen) {
                        // Must be mapped to lastSeenAt filter
                        const lastseen = pagination.filters.lastseen

                        // Needs to be kept in sync with frontend (frontend/src/services/device-status.js)
                        // Thresholds are currently running <1.5, safe <3, error >3
                        // To-do: Move this logic entirely server side rather than calculating it in the frontend
                        if (lastseen === 'never') {
                            where.lastSeenAt = null
                        } else if (lastseen === 'running') {
                            where.lastSeenAt = {}
                            where.lastSeenAt[Op.gt] = new Date(Date.now() - (1.5 * 60 * 1000))
                        } else if (lastseen === 'safe') {
                            where.lastSeenAt = {}
                            where.lastSeenAt[Op.lte] = new Date(Date.now() - (1.5 * 60 * 1000))
                            where.lastSeenAt[Op.gt] = new Date(Date.now() - (3 * 60 * 1000))
                        } else if (lastseen === 'error') {
                            where.lastSeenAt = {}
                            where.lastSeenAt[Op.lte] = new Date(Date.now() - (3 * 60 * 1000))
                        } else {
                            console.warn('Unknown lastseen filter, silently ignoring', lastseen)
                        }
                    }

                    // Sorting
                    const order = [['id', 'ASC']]
                    if (pagination.order && Object.keys(pagination.order).length) {
                        for (const key in pagination.order) {
                            if (key === 'application') {
                                // Sort by Device->Instance->Application.name
                                if (includeInstanceApplication) {
                                    order.unshift([M.Project, M.Application, 'name', pagination.order[key] || 'ASC'])
                                // Order Device->Application.name
                                } else {
                                    order.unshift([M.Application, 'name', pagination.order[key] || 'ASC'])
                                }
                            } else if (key === 'instance') {
                                order.unshift([M.Project, 'name', pagination.order[key] || 'ASC'])
                            } else {
                                order.unshift([key, pagination.order[key] || 'ASC'])
                            }
                        }
                    }

                    // Extra models to include
                    const filteringOnInstanceApplication = !!where.ApplicationId && includeInstanceApplication
                    const projectInclude = {
                        model: M.Project,
                        attributes: ['id', 'name', 'links'],
                        required: filteringOnInstanceApplication
                    }

                    // Naive filter on Devices->Application
                    if (where.ApplicationId) {
                        where.ApplicationId = M.Application.decodeHashid(where.ApplicationId)
                    }
                    if (includeInstanceApplication || filteringOnInstanceApplication) {
                        projectInclude.include = {
                            model: M.Application,
                            attributes: ['hashid', 'id', 'name', 'links']
                        }

                        // Handle Applications included via Device->Instance->Application
                        if (filteringOnInstanceApplication) {
                            projectInclude.include.where = { id: where.ApplicationId }
                            projectInclude.include.required = true
                            delete where.ApplicationId
                        }
                    }

                    const includes = [
                        {
                            model: M.Team,
                            attributes: ['hashid', 'id', 'name', 'slug', 'links', 'TeamTypeId']
                        },
                        projectInclude,
                        { model: M.ProjectSnapshot, as: 'targetSnapshot', attributes: ['id', 'hashid', 'name'] },
                        { model: M.ProjectSnapshot, as: 'activeSnapshot', attributes: ['id', 'hashid', 'name'] },
                        {
                            model: M.Application,
                            attributes: ['hashid', 'id', 'name', 'links']
                        }
                    ]

                    if (includeDeviceGroup) {
                        includes.push({
                            model: M.DeviceGroup,
                            attributes: ['hashid', 'id', 'name', 'description', 'ApplicationId']
                        })
                    }
                    const statusOnlyIncludes = projectInclude.include?.where ? [projectInclude] : []

                    const [rows, count] = await Promise.all([
                        this.findAll({
                            where: buildPaginationSearchClause(pagination, where, ['Device.name', 'Device.type'], {}, order),
                            include: pagination.statusOnly ? statusOnlyIncludes : includes,
                            order,
                            limit: pagination.statusOnly ? null : limit
                        }),
                        this.count({ where, include: statusOnlyIncludes })
                    ])

                    let nextCursors = []
                    if (rows.length === limit && limit > 0) {
                        const lastRow = rows[rows.length - 1]
                        nextCursors = order.map((sortProps) => {
                            // Model, key, dir
                            let [model, key] = sortProps

                            // Key, dir
                            if (arguments.length === 2) {
                                key = model
                                model = null
                            }

                            if (key === 'id') {
                                key = 'hashid'
                            }

                            if (model === M.Application) {
                                return lastRow.Project[model.name][key]
                            }

                            if (model !== null) {
                                return lastRow[model.name][key]
                            }

                            return lastRow[key]
                        })
                    }

                    return {
                        meta: {
                            next_cursor: nextCursors.length > 0 ? nextCursors.join(',') : undefined
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
                                attributes: ['hashid', 'id', 'name', 'slug', 'links', 'TeamTypeId']
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
                getDeviceApplicationId: async (id) => {
                    if (typeof id === 'string') {
                        id = M.Device.decodeHashid(id)
                    }
                    const device = await this.findOne({
                        where: { id },
                        attributes: [
                            'ApplicationId'
                        ]
                    })
                    if (device && device.ApplicationId) {
                        return M.Application.encodeHashid(device.ApplicationId)
                    }
                },
                getOwnerTypeAndId: async (id) => {
                    if (typeof id === 'string') {
                        id = M.Device.decodeHashid(id)
                    }
                    const device = await this.findOne({
                        where: { id },
                        attributes: [
                            'ProjectId',
                            'ApplicationId'
                        ]
                    })
                    if (device) {
                        if (device.ProjectId) {
                            return {
                                ownerType: 'instance',
                                ownerId: device.ProjectId
                            }
                        } else if (device.ApplicationId) {
                            return {
                                ownerType: 'application',
                                ownerId: M.Application.encodeHashid(device.ApplicationId)
                            }
                        }
                    }
                    return null
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
