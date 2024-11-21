/**
 * An application definition
 * @namespace forge.db.models.Application
 */
const { col, fn, DataTypes, Op, literal, where } = require('sequelize')

const { KEY_SETTINGS, KEY_HA } = require('./ProjectSettings')

module.exports = {
    name: 'Application',
    schema: {
        name: { type: DataTypes.STRING, allowNull: false },
        description: { type: DataTypes.STRING, defaultValue: '' }
    },
    hooks: function (M, app) {
        return {
            afterDestroy: async (application, opts) => {
                const where = {
                    ApplicationId: application.id
                }
                M.Device.update({ ApplicationId: null }, { where })
            }
        }
    },
    associations: function (M) {
        this.hasMany(M.Project)
        this.hasMany(M.Project, { as: 'Instances' })
        this.belongsTo(M.Team, { foreignKey: { allowNull: false } })
        this.hasMany(M.DeviceGroup, { onDelete: 'CASCADE' })
        this.hasMany(M.Device) // also via instance and device group
    },
    finders: function (M, app) {
        return {
            static: {
                byId: async function (idOrHash) {
                    let id = idOrHash
                    if (typeof idOrHash === 'string') {
                        id = M.Application.decodeHashid(idOrHash)
                    }
                    return this.findOne({
                        where: { id },
                        include: [
                            {
                                model: M.Team,
                                attributes: ['hashid', 'id', 'name', 'slug', 'links', 'TeamTypeId']
                            }
                        ]
                    })
                },
                byTeam: async (teamIdOrHash, { query = null, includeInstances = false, includeApplicationDevices = false, includeInstanceStorageFlow = false, associationsLimit = null, includeApplicationSummary = false } = {}) => {
                    let id = teamIdOrHash
                    if (typeof teamIdOrHash === 'string') {
                        id = M.Team.decodeHashid(teamIdOrHash)
                    }

                    const includes = [
                        {
                            model: M.Team,
                            attributes: ['hashid', 'id', 'name', 'slug', 'links', 'TeamTypeId'],
                            where: { id }
                        }
                    ]

                    if (includeInstances) {
                        const include = {
                            model: M.Project,
                            as: 'Instances',
                            attributes: ['hashid', 'id', 'name', 'slug', 'links', 'url', 'state'],
                            include: [
                                // Need for project URL calculation (depends on httpAdminRoot)
                                {
                                    model: M.ProjectTemplate,
                                    attributes: ['hashid', 'id', 'name', 'links', 'settings', 'policy']
                                }, {
                                    model: M.ProjectSettings,
                                    where: {
                                        [Op.or]: [
                                            { key: KEY_SETTINGS },
                                            { key: KEY_HA }
                                        ]
                                    },
                                    required: false
                                }
                            ]
                        }

                        if (includeInstanceStorageFlow) {
                            // Used for instance status
                            include.include.push({
                                model: M.StorageFlow,
                                attributes: ['id', 'updatedAt']
                            })
                        }

                        if (associationsLimit) {
                            include.limit = associationsLimit
                            include.order = [['updatedAt', 'DESC']]
                            include.attributes = {
                                include: [...include.attributes]
                            }
                        }

                        includes.push(include)
                    }

                    if (includeApplicationDevices) {
                        const include = {
                            model: M.Device,
                            attributes: ['hashid', 'id', 'name', 'links', 'state', 'mode', 'updatedAt', 'lastSeenAt', 'editorConnected', 'editorToken', 'ownerType', 'ProjectId', 'ApplicationId']
                        }

                        if (associationsLimit) {
                            include.limit = associationsLimit
                            include.order = [['lastSeenAt', 'DESC NULLS LAST'], ['updatedAt', 'DESC']]
                        }

                        includes.push(include)
                    }

                    const queryObject = {
                        include: includes
                    }
                    if (query) {
                        queryObject.where = {
                            [Op.or]: [
                                where(fn('lower', col('Application.name')), { [Op.like]: `%${query.toLowerCase()}%` }),
                                where(fn('lower', col('Application.description')), { [Op.like]: `%${query.toLowerCase()}%` })
                            ]
                        }
                    }

                    if (includeApplicationSummary) {
                        queryObject.attributes = {
                            include: [
                                [
                                    literal(`(
                                        SELECT COUNT(*)
                                        FROM "Projects" AS "Instances"
                                        WHERE "Instances"."ApplicationId" = "Application"."id"
                                    )`),
                                    'instanceCount'
                                ],
                                [
                                    literal(`(
                                        SELECT COUNT(*)
                                        FROM "Devices"
                                        WHERE "Devices"."ApplicationId" = "Application"."id"
                                    )`),
                                    'deviceCount'
                                ],
                                [
                                    literal(`(
                                        SELECT count(*)
                                        FROM "DeviceGroups"
                                        WHERE "DeviceGroups"."ApplicationId" = "Application"."id"
                                    )`),
                                    'deviceGroupCount'
                                ],
                                [
                                    literal(`(
                                        SELECT count(*)
                                        FROM "ProjectSnapshots"
                                        LEFT JOIN "Devices" ON "Devices"."id" = "ProjectSnapshots"."DeviceId"
                                        LEFT JOIN "Projects" ON "Projects"."id" = "ProjectSnapshots"."ProjectId"
                                        WHERE "Devices"."ApplicationId" = "Application"."id" OR "Projects"."ApplicationId" = "Application"."id"
                                    )`),
                                    'snapshotCount'
                                ]

                            ]
                        }

                        // Non-EE licensed instances might not have the Pipeline table
                        // You can add a license without a restart, so we also need to check if the Model is loaded
                        // If the model is loaded, it can be assumed the table exists
                        if (app.license.active() && app.db.models.Pipeline) {
                            queryObject.attributes.include.push([
                                literal(`(
                                    SELECT count(*)
                                    FROM "Pipelines"
                                    WHERE "Pipelines"."ApplicationId" = "Application"."id"
                                )`),
                                'pipelineCount'
                            ])
                        }
                    }

                    return this.findAll(queryObject)
                }
            },
            instance: {
                projectCount: async function () {
                    return await M.Project.count({
                        where: { ApplicationId: this.id }
                    })
                },
                getChildren: async function ({ includeDependencies = false } = {}) {
                    const application = this
                    const children = new Map()
                    const instances = await application.getInstances(includeDependencies ? { include: [M.ProjectStack] } : undefined)
                    const devices = await application.getDevices()
                    for (const instance of instances) {
                        children.set(instance, { model: instance, type: 'instance' })
                        const instanceDevices = await app.db.models.Device.getAll(undefined, { ProjectId: instance.id })
                        if (instanceDevices?.devices?.length) {
                            for (const device of instanceDevices.devices) {
                                devices.push(device)
                                children.set(device, { model: device, type: 'device', ownerType: 'instance', ownerId: instance.id })
                            }
                        }
                    }
                    for (const device of devices) {
                        if (children.has(device)) {
                            continue
                        }
                        children.set(device, { model: device, type: 'device', ownerType: 'application', ownerId: application.id })
                    }

                    if (includeDependencies) {
                        const storageController = app.db.controllers.StorageSettings
                        for (const instance of instances) {
                            const child = children.get(instance)
                            const deps = {}
                            deps['node-red'] = {
                                wanted: instance.versions?.['node-red']?.wanted,
                                current: instance.versions?.['node-red']?.current
                            }

                            const settings = await instance.getSetting(KEY_SETTINGS)
                            if (Array.isArray(settings?.palette?.modules)) {
                                settings.palette.modules.forEach(m => {
                                    deps[m.name] = {
                                        wanted: m.version
                                    }
                                })
                            }

                            const projectModules = await storageController.getProjectModules(child.model) || []
                            projectModules.forEach(m => {
                                deps[m.name] = deps[m.name] || {}
                                deps[m.name].current = m.version
                                if (!deps[m.name].wanted) {
                                    deps[m.name].wanted = m.version
                                }
                            })
                            child.dependencies = deps
                        }
                        // a helper function to get the semver Node-RED version for a device.
                        // It takes into account the agent version, any editor settings, and the active snapshot
                        // This is a workaround due to having no direct access to the package.json of the device
                        const getDeviceNodeRedVersion = async (dev, snapshotModules) => {
                            const ssNodeRed = snapshotModules?.find(m => m.name === 'node-red')
                            if (ssNodeRed) {
                                return ssNodeRed.version
                            }
                            const editor = await dev.getSetting('editor')
                            if (editor?.nodeRedVersion) {
                                return editor.nodeRedVersion
                            }
                            return dev.getDefaultNodeRedVersion()
                        }
                        for (const device of devices) {
                            const child = children.get(device)
                            const deps = {}
                            if (device.ownerType === 'instance') {
                                // use the instance's dependencies as a starting point
                                const instance = instances.find(i => i.id === device.ProjectId)
                                const parent = children.get(instance)
                                Object.assign(deps, parent.dependencies)
                            }
                            const targetSnapshot = device.targetSnapshotId ? await device.getTargetSnapshot() : null
                            const activeSnapshot = device.activeSnapshotId ? await device.getActiveSnapshot() : null
                            const targetModulesSemver = Object.entries(targetSnapshot?.settings?.settings?.palette?.modules || {}).map(([name, version]) => ({ name, version }))
                            const activeModulesSemver = Object.entries(activeSnapshot?.settings?.settings?.palette?.modules || {}).map(([name, version]) => ({ name, version }))
                            const activeModulesInstalled = Object.entries(activeSnapshot?.settings?.modules || {}).map(([name, version]) => ({ name, version }))
                            const defaultModules = device.ownerType === device.getDefaultModules()
                            if (activeModulesInstalled?.length) {
                                activeModulesInstalled.forEach(m => {
                                    deps[m.name] = deps[m.name] || {}
                                    deps[m.name].current = m.version
                                })
                            }
                            if (targetModulesSemver?.length) {
                                targetModulesSemver.forEach(m => {
                                    deps[m.name] = deps[m.name] || {}
                                    deps[m.name].wanted = m.version
                                })
                            } else if (activeModulesSemver?.length) {
                                activeModulesSemver.forEach(m => {
                                    deps[m.name] = deps[m.name] || {}
                                    deps[m.name].wanted = m.version
                                })
                            } else if (device.ownerType === 'application' && !targetSnapshot && !activeSnapshot) {
                                // if the device has no snapshots, use the default snapshot data
                                Object.entries(defaultModules).forEach(([name, version]) => {
                                    deps[name] = deps[name] || {}
                                    deps[name].wanted = version
                                })
                            }

                            // some devices dont get informed of the @flowfuse/nr-project-nodes or '@flowfuse/nr-assistant' to install due being included
                            // via nodesdir or other means. In this case, we will use the installed version as the semver
                            if (deps['@flowfuse/nr-project-nodes'] && deps['@flowfuse/nr-project-nodes'].current && !deps['@flowfuse/nr-project-nodes'].wanted) {
                                deps['@flowfuse/nr-project-nodes'].wanted = deps['@flowfuse/nr-project-nodes'].current
                            }
                            if (deps['@flowfuse/nr-assistant'] && deps['@flowfuse/nr-assistant'].current && !deps['@flowfuse/nr-assistant'].wanted) {
                                deps['@flowfuse/nr-assistant'].wanted = deps['@flowfuse/nr-assistant'].current
                            }

                            const noderedVersionInstalled = await getDeviceNodeRedVersion(device, activeModulesInstalled) || '*'
                            const noderedVersionSemver = await getDeviceNodeRedVersion(device, targetModulesSemver) || '*'
                            deps['node-red'] = {
                                wanted: noderedVersionSemver,
                                current: noderedVersionInstalled
                            }

                            child.dependencies = deps
                        }
                    }

                    return Array.from(children.values())
                }
            }
        }
    }
}
