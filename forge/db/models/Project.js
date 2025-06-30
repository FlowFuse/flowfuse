/**
 * A Project
 * @namespace forge.db.models.Project
 * // type helpers for design time help and error checking
 * @typedef {import('sequelize').Model} Model
 * @typedef {import('sequelize').ModelAttributes} ModelAttributes
 * @typedef {import('sequelize').SchemaOptions} SchemaOptions
 * @typedef {import('sequelize').ModelIndexesOptions} ModelIndexesOptions
 * @typedef {import('sequelize').InitOptions} InitOptions
 * @typedef {import('sequelize').ModelScopeOptions} ModelScopeOptions
 * @typedef {{name: string, schema: ModelAttributes, model: Model, indexes?: ModelIndexesOptions[], scopes?: ModelScopeOptions, options?: InitOptions}} FFModel
 */

const crypto = require('crypto')

const { col, fn, DataTypes, Op, where, literal } = require('sequelize')

const Controllers = require('../controllers')

const { KEY_HOSTNAME, KEY_SETTINGS, KEY_HA, KEY_PROTECTED, KEY_HEALTH_CHECK_INTERVAL, KEY_CUSTOM_HOSTNAME, KEY_DISABLE_AUTO_SAFE_MODE } = require('./ProjectSettings')

const BANNED_NAME_LIST = [
    'app',
    'www',
    'node-red',
    'nodered',
    'forge',
    'support',
    'help',
    'accounts',
    'account',
    'status',
    'billing',
    'mqtt',
    'broker',
    'egress',
    'npm',
    'registry'
]

/** @type {FFModel} */
module.exports = {
    name: 'Project',
    schema: {
        id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
            set (value) {
                this.setDataValue('safeName', value?.toLowerCase())
                this.setDataValue('name', value)
            }
        },
        type: { type: DataTypes.STRING, allowNull: false },
        url: {
            type: DataTypes.STRING,
            allowNull: false,
            get () {
                const originalUrl = this.getDataValue('url')?.replace(/\/$/, '') || ''
                const projectSettingsRow = this.ProjectSettings?.find((projectSetting) => projectSetting.key === KEY_SETTINGS)
                let httpAdminRoot = projectSettingsRow?.value.httpAdminRoot
                if (httpAdminRoot === undefined) {
                    httpAdminRoot = this.ProjectTemplate?.settings?.httpAdminRoot
                }
                if (httpAdminRoot) {
                    if (httpAdminRoot[0] !== '/') {
                        httpAdminRoot = `/${httpAdminRoot}`
                    }
                    return originalUrl + httpAdminRoot
                } else {
                    return originalUrl
                }
            }
        },
        slug: { type: DataTypes.VIRTUAL, get () { return this.id } },
        state: { type: DataTypes.STRING, allowNull: false, defaultValue: 'running' },
        links: {
            type: DataTypes.VIRTUAL,
            get () {
                return {
                    self: process.env.FLOWFORGE_BASE_URL + '/api/v1/projects/' + this.id
                }
            }
        },
        storageURL: { type: DataTypes.VIRTUAL, get () { return process.env.FLOWFORGE_API_URL + '/storage' } },
        auditURL: { type: DataTypes.VIRTUAL, get () { return process.env.FLOWFORGE_API_URL + '/logging' } },
        safeName: {
            type: DataTypes.STRING,
            unique: true,
            allowNull: false,
            get () {
                return this.getDataValue('safeName') || this.getDataValue('name')?.toLowerCase()
            }
        },
        versions: {
            type: DataTypes.TEXT,
            get () {
                const rawValue = this.getDataValue('versions')
                return rawValue ? JSON.parse(rawValue) : {}
            },
            set (value) {
                if (Object.keys(value).length === 0) {
                    this.setDataValue('versions', null)
                    return
                }
                this.setDataValue('versions', JSON.stringify(value))
            }
        }
    },
    indexes: [
        { name: 'projects_safe_name_unique', fields: ['safeName'], unique: true }
    ],
    associations: function (M) {
        this.belongsTo(M.Application, { foreignKey: { allowNull: false } })
        this.belongsTo(M.Team) // TODO redundant now there's an application link instead
        this.hasOne(M.AuthClient, {
            foreignKey: 'ownerId',
            constraints: false,
            scope: {
                ownerType: 'project'
            }
        })
        this.hasOne(M.AccessToken, {
            foreignKey: 'ownerId',
            constraints: false,
            scope: {
                ownerType: 'project'
            }
        })
        this.hasMany(M.ProjectSettings)
        this.belongsTo(M.ProjectType)
        this.belongsTo(M.ProjectStack)
        this.belongsTo(M.ProjectTemplate)
        this.hasMany(M.ProjectSnapshot)
        this.hasOne(M.StorageFlow)
    },
    hooks: function (M, app) {
        return {
            beforeCreate: async (project, opts) => {
                // if the product is licensed, we permit overage
                const isLicensed = app.license.active()
                if (isLicensed !== true) {
                    const { instances } = await app.license.usage('instances')
                    if (instances.count >= instances.limit) {
                        throw new Error('license limit reached')
                    }
                }
            },
            afterCreate: async (project, opts) => {
                const { instances } = await app.license.usage('instances')
                if (instances.count > instances.limit) {
                    await app.auditLog.Platform.platform.license.overage('system', null, instances)
                }
            },
            beforeUpdate: async (project, opts) => {
                if (project.changed('name')) {
                    if (project.state !== 'suspended') {
                        throw new Error('Name can only be changed when suspended')
                    }
                }
            },
            afterDestroy: async (project, opts) => {
                await M.AccessToken.destroy({
                    where: {
                        ownerType: 'project',
                        ownerId: project.id
                    }
                })
                await M.AccessToken.destroy({
                    where: {
                        ownerType: 'npm',
                        ownerId: {
                            [Op.like]: `p-${project.id}@%`
                        }
                    }
                })
                await M.AuthClient.destroy({
                    where: {
                        ownerType: 'project',
                        ownerId: project.id
                    }
                })
                await M.BrokerClient.destroy({
                    where: {
                        ownerType: 'project',
                        ownerId: project.id
                    }
                })
                await M.ProjectSettings.destroy({
                    where: {
                        ProjectId: project.id
                    }
                })
                await M.StorageLibrary.destroy({
                    where: {
                        ProjectId: project.id
                    }
                })
                await M.StorageSettings.destroy({
                    where: {
                        ProjectId: project.id
                    }
                })
                await M.StorageSession.destroy({
                    where: {
                        ProjectId: project.id
                    }
                })
                await M.StorageCredentials.destroy({
                    where: {
                        ProjectId: project.id
                    }
                })
                await M.StorageFlow.destroy({
                    where: {
                        ProjectId: project.id
                    }
                })
                await M.Notification.destroy({
                    where: {
                        type: {
                            [Op.in]: ['instance-crashed', 'instance-safe-mode', 'instance-resource-cpu', 'instance-resource-memory']
                        },
                        reference: {
                            [Op.in]: [`instance-crashed:${project.id}`, `instance-safe-mode:${project.id}`, `instance-resource-cpu:${project.id}`, `instance-resource-memory:${project.id}`]
                        }
                    }
                })
            }
        }
    },
    finders: function (M, app) {
        return {
            instance: {
                async refreshAuthTokens () {
                    const authClient = await Controllers.AuthClient.createClientForProject(this)
                    const projectToken = await Controllers.AccessToken.createTokenForProject(this, null)
                    const projectBrokerCredentials = await Controllers.BrokerClient.createClientForProject(this)
                    return {
                        token: projectToken.token,
                        ...authClient,
                        broker: projectBrokerCredentials
                    }
                },
                async getAllSettings () {
                    const result = {}
                    const settings = await this.getProjectSettings()
                    settings.forEach(setting => {
                        result[setting.key] = setting.value
                    })
                    result.settings = result.settings || {}
                    result.settings.env = Controllers.Project.insertPlatformSpecificEnvVars(this, result.settings.env) // add platform specific device env vars
                    return result
                },
                async updateSettings (obj, options) {
                    const updates = []
                    for (const [key, value] of Object.entries(obj)) {
                        if (key === 'settings' && value && Array.isArray(value.env)) {
                            value.env = Controllers.Project.removePlatformSpecificEnvVars(value.env) // remove platform specific values
                        }
                        updates.push({ ProjectId: this.id, key, value })
                    }
                    options = options || {}
                    options.updateOnDuplicate = ['value']
                    await M.ProjectSettings.bulkCreate(updates, options)
                },
                async updateSetting (key, value, options) {
                    if (key === 'settings' && value && Array.isArray(value.env)) {
                        value.env = Controllers.Project.removePlatformSpecificEnvVars(value.env) // remove platform specific values
                    }
                    return M.ProjectSettings.upsert({ ProjectId: this.id, key, value }, options)
                },
                async getSetting (key) {
                    const result = await M.ProjectSettings.findOne({ where: { ProjectId: this.id, key } })
                    if (result) {
                        if (key === 'settings') {
                            result.value = result.value || {}
                            result.value.env = Controllers.Project.insertPlatformSpecificEnvVars(this, result.value.env)
                        }
                        return result.value
                    }
                    return undefined
                },
                async removeSetting (key, options) {
                    return M.ProjectSettings.destroy({ where: { ProjectId: this.id, key } }, options)
                },
                async getCredentialSecret () {
                    // If this project was created at 0.6+ but then started with a <0.6 launcher
                    // (for example, in k8s with an old stack) then the project will have both
                    // StorageSettings._credentialSecret *AND* ProjectSettings.credentialSecret
                    // If both are present, we *must* use _credentialSecret as that is what
                    // the runtime is using

                    let credentialSecret = await this.getSetting('credentialSecret')
                    if (!credentialSecret) {
                        // Older project - check the StorageSettings to see if
                        // the runtime has generated one
                        const storageSettings = await M.StorageSettings.byProject(this.id)
                        if (storageSettings && storageSettings.settings) {
                            try {
                                const projectSettings = JSON.parse(storageSettings.settings)
                                credentialSecret = projectSettings._credentialSecret
                            } catch (err) {
                            }
                        }
                    }
                    return credentialSecret
                },

                async liveState ({ omitStorageFlows = false } = { }) {
                    const result = {}

                    const inflightState = Controllers.Project.getInflightState(this)
                    const isDeploying = Controllers.Project.isDeploying(this)

                    if (!omitStorageFlows) {
                        let storageFlow = this.StorageFlow
                        if (storageFlow === undefined) {
                            app.log.warn(`N+1 warning - Requested live state for instance ${this.id} with no storage flow loaded`)
                            storageFlow = await M.StorageFlow.byProject(this.id)
                        }

                        result.flowLastUpdatedAt = storageFlow?.updatedAt // prop not set if storageFlow not found
                    }

                    if (inflightState) {
                        result.meta = {
                            state: inflightState
                        }
                    } else if (this.state === 'suspended') {
                        result.meta = {
                            state: 'suspended'
                        }
                    } else {
                        result.meta = await app.containers.details(this) || { state: 'unknown' }
                        if (result.meta.versions) {
                            const currentVersionInfo = { ...this.versions }
                            let changed = false
                            for (const [key, value] of Object.entries(result.meta.versions)) {
                                currentVersionInfo[key] = currentVersionInfo[key] || {}
                                if (currentVersionInfo[key].current !== value) {
                                    currentVersionInfo[key].current = value
                                    changed = true
                                }
                            }
                            if (changed) {
                                this.versions = currentVersionInfo
                                await this.save()
                            }
                        }
                    }

                    result.meta.isDeploying = isDeploying

                    return result
                },

                async getLatestSnapshot () {
                    const snapshots = await this.getProjectSnapshots({
                        order: [['createdAt', 'DESC']],
                        limit: 1
                    })
                    return snapshots[0]
                }
            },
            static: {
                BANNED_NAME_LIST,
                isNameUsed: async (name) => {
                    const safeName = name?.toLowerCase()
                    const count = await this.count({
                        where: { safeName }
                    })
                    return count !== 0
                },
                byUser: async (user) => {
                    return this.findAll({
                        include: {
                            model: M.Team,
                            attributes: ['hashid', 'id', 'name', 'slug', 'links', 'TeamTypeId', 'suspended'],
                            include: [
                                {
                                    model: M.TeamMember,
                                    where: {
                                        UserId: user.id
                                    }
                                }
                            ],
                            required: true
                        }
                    })
                },
                byId: async (id, { includeStorageFlows = false, barebone = false } = {}) => {
                    const include = barebone
                        ? []
                        : [
                            {
                                model: M.Team,
                                attributes: ['hashid', 'id', 'name', 'slug', 'links', 'TeamTypeId', 'suspended']
                            },
                            {
                                model: M.Application,
                                attributes: ['hashid', 'id', 'name', 'links']
                            },
                            {
                                model: M.ProjectType,
                                attributes: ['hashid', 'id', 'name']
                            },
                            {
                                model: M.ProjectStack,
                                attributes: ['hashid', 'id', 'name', 'label', 'links', 'properties', 'replacedBy', 'ProjectTypeId']
                            },
                            {
                                model: M.ProjectTemplate,
                                attributes: ['hashid', 'id', 'name', 'links', 'settings', 'policy']
                            },
                            {
                                model: M.ProjectSettings,
                                where: {
                                    [Op.or]: [
                                        { key: KEY_SETTINGS },
                                        { key: KEY_HOSTNAME },
                                        { key: KEY_HA },
                                        { key: KEY_PROTECTED },
                                        { key: KEY_CUSTOM_HOSTNAME },
                                        { key: KEY_HEALTH_CHECK_INTERVAL },
                                        { key: KEY_DISABLE_AUTO_SAFE_MODE }
                                    ]
                                },
                                required: false
                            }
                        ]

                    // Used for instance status
                    if (includeStorageFlows) {
                        include.push({
                            model: M.StorageFlow,
                            attributes: ['id', 'updatedAt']
                        })
                    }

                    return this.findOne({
                        where: { id },
                        include
                    })
                },
                byApplication: async (applicationHashId, { includeSettings = false, includeStorageFlows = false } = {}) => {
                    const applicationId = M.Application.decodeHashid(applicationHashId)

                    const include = [
                        {
                            model: M.Team,
                            attributes: ['hashid', 'id', 'name', 'slug', 'links', 'TeamTypeId', 'suspended']
                        },
                        {
                            model: M.Application,
                            where: { id: applicationId },
                            attributes: ['hashid', 'id', 'name', 'links']
                        },
                        {
                            model: M.ProjectType,
                            attributes: ['hashid', 'id', 'name']
                        }
                    ]

                    // Needed for project.url (stored in ProjectSettings)
                    if (includeSettings) {
                        include.push({
                            model: M.ProjectTemplate,
                            attributes: ['hashid', 'id', 'name', 'links', 'settings', 'policy']
                        })

                        include.push({
                            model: M.ProjectSettings,
                            where: {
                                [Op.or]: [
                                    { key: KEY_SETTINGS },
                                    { key: KEY_HA },
                                    { key: KEY_PROTECTED }
                                ]
                            },
                            required: false
                        })
                    }

                    // Used for instance status
                    if (includeStorageFlows) {
                        include.push({
                            model: M.StorageFlow,
                            attributes: ['id', 'updatedAt']
                        })
                    }

                    return this.findAll({
                        include
                    })
                },
                byTeam: async (teamIdOrHash, {
                    query = null,
                    instanceId = null,
                    includeAssociations = true,
                    includeSettings = false,
                    includeMeta = false,
                    limit = null,
                    orderByMostRecentFlows = false
                } = {}) => {
                    let teamId = teamIdOrHash
                    if (typeof teamId === 'string') {
                        teamId = M.Team.decodeHashid(teamId)
                    }
                    const include = [
                        {
                            model: M.Team,
                            where: { id: teamId },
                            attributes: ['hashid', 'id', 'name', 'slug', 'links', 'TeamTypeId']
                        }
                    ]
                    if (includeAssociations) {
                        include.push({
                            model: M.Application,
                            attributes: ['hashid', 'id', 'name', 'links']
                        },
                        {
                            model: M.ProjectType,
                            attributes: ['hashid', 'id', 'name']
                        },
                        {
                            model: M.ProjectStack
                        },
                        {
                            model: M.ProjectTemplate,
                            attributes: ['hashid', 'id', 'name', 'links']
                        }
                        )
                    }

                    if (includeSettings) {
                        include.push({
                            model: M.ProjectSettings,
                            attributes: ['id', 'key', 'value', 'ProjectId'],
                            where: { key: 'settings' }
                        })
                    }

                    if (includeMeta) {
                        include.push({
                            model: M.StorageFlow,
                            attributes: ['id', 'updatedAt', 'flow', 'ProjectId']
                        })
                    }

                    const queryObject = {
                        include
                    }

                    if (limit !== null) {
                        queryObject.limit = limit
                    }

                    if (includeMeta && orderByMostRecentFlows) {
                        queryObject.order = [
                            [literal(`
                                CASE
                                    WHEN state IN ('error', 'crashed') THEN 1
                                    WHEN state IN ('running', 'safe', 'protected', 'warning') THEN 2
                                    WHEN state IS NULL OR state IN ('suspended', 'stopped', 'offline', 'unknown', '') THEN 3
                                    ELSE 4
                                END
                            `), 'ASC'],
                            [{ model: M.StorageFlow }, 'updatedAt', 'DESC NULLS LAST']
                        ]
                    }

                    if (instanceId) {
                        queryObject.where = { id: instanceId }
                    } else if (query) {
                        queryObject.where = where(
                            fn('lower', col('Project.name')),
                            { [Op.like]: `%${query.toLowerCase()}%` }
                        )
                    }

                    return this.findAll(queryObject)
                },
                getProjectTeamId: async (id) => {
                    const project = await this.findOne({
                        where: { id },
                        attributes: [
                            'TeamId'
                        ]
                    })
                    if (project) {
                        return project.TeamId
                    }
                },
                generateCredentialSecret () {
                    return crypto.randomBytes(32).toString('hex')
                },
                byTeamForDashboard: async (teamHashId) => {
                    const teamId = M.Team.decodeHashid(teamHashId)
                    return this.findAll({
                        include: [
                            {
                                model: M.Team,
                                where: { id: teamId },
                                attributes: ['hashid', 'id', 'name', 'slug', 'links', 'TeamTypeId', 'suspended']
                            },
                            {
                                model: M.Application,
                                attributes: ['hashid', 'id', 'name', 'links']
                            },
                            {
                                model: M.ProjectSettings,
                                attributes: ['id', 'key', 'value', 'ProjectId'],
                                where: { key: 'settings' }
                            }
                        ]
                    })
                },
                countByState: async (states, teamId) => {
                    if (typeof teamId === 'string') {
                        teamId = M.Team.decodeHashid(teamId)

                        if (teamId.length === 0) {
                            throw new Error('Invalid TeamId')
                        }
                    }

                    return this.count({
                        where: {
                            ...(states.length > 0
                                ? {
                                    [Op.or]: states.map(state => ({
                                        state,
                                        TeamId: teamId
                                    }))
                                }
                                : { TeamId: teamId })
                        },
                        group: ['state']
                    })
                }
            }
        }
    }
}
