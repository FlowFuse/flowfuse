const { Op } = require('sequelize')

const teamShared = require('../../../routes/api/shared/team.js')

/**
 * Routes used by the Project Link nodes (@flowfuse/nr-project-nodes)
 * @param {import('../../forge').ForgeApplication} app - forge application
 * @namespace projectLink
 * @memberof forge.ee
 */
module.exports = async function (app) {
    app.addHook('preHandler', teamShared.defaultPreHandler.bind(null, app))

    // not registered with addSchema so it stays out of the swagger docs
    const targetListSchema = {
        type: 'array',
        items: {
            type: 'object',
            properties: {
                id: { type: 'string' },
                name: { type: 'string' }
            },
            additionalProperties: false
        }
    }

    /**
     * Get the applications in a team along with the hosted instances and
     * application owned devices that Project Link nodes can communicate with.
     * Only available to project and device tokens.
     * /api/v1/teams/:teamId/project-link/targets
     */
    app.get('/targets', {
        preHandler: app.needsPermission('team:projects:list'),
        schema: {
            hide: true,
            params: {
                type: 'object',
                properties: {
                    teamId: { type: 'string' }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        self: {
                            type: 'object',
                            nullable: true,
                            properties: {
                                id: { type: 'string' },
                                applicationId: { type: 'string' }
                            },
                            additionalProperties: false
                        },
                        applications: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    id: { type: 'string' },
                                    name: { type: 'string' },
                                    instances: targetListSchema,
                                    devices: targetListSchema
                                },
                                additionalProperties: false
                            }
                        }
                    },
                    additionalProperties: false
                },
                '4xx': {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        if (!app.config.features.enabled('projectComms')) {
            return reply.code(404).send({ code: 'not_found', error: 'Not Found' })
        }
        const ownerType = request.session.ownerType
        if (ownerType !== 'project' && ownerType !== 'device') {
            return reply.code(403).send({ code: 'unauthorized', error: 'unauthorized' })
        }
        const TeamId = app.db.models.Team.decodeHashid(request.params.teamId)

        const [applications, instances, devices] = await Promise.all([
            app.db.models.Application.findAll({
                where: { TeamId },
                attributes: ['id', 'name'],
                order: [['name', 'ASC']]
            }),
            app.db.models.Project.findAll({
                where: { TeamId },
                attributes: ['id', 'name', 'ApplicationId'],
                order: [['name', 'ASC']]
            }),
            app.db.models.Device.findAll({
                // application owned devices only - instance owned devices are reached via their instance
                where: { TeamId, ProjectId: null, ApplicationId: { [Op.ne]: null } },
                attributes: ['id', 'name', 'ApplicationId'],
                order: [['name', 'ASC']]
            })
        ])

        const result = {
            self: null,
            applications: applications.map(application => {
                return {
                    id: application.hashid,
                    name: application.name,
                    instances: instances.filter(i => i.ApplicationId === application.id).map(i => {
                        return { id: i.id, name: i.name }
                    }),
                    devices: devices.filter(d => d.ApplicationId === application.id).map(d => {
                        return { id: `dev:${d.hashid}`, name: d.name }
                    })
                }
            })
        }

        // Tell the caller which application it belongs to so it can build
        // application scoped topics
        if (ownerType === 'project') {
            const self = instances.find(i => i.id === request.session.ownerId)
            if (self) {
                result.self = { id: self.id, applicationId: app.db.models.Application.encodeHashid(self.ApplicationId) }
            }
        } else {
            const device = await app.db.models.Device.findOne({
                where: { id: request.session.ownerId },
                attributes: ['id', 'ProjectId', 'ApplicationId']
            })
            if (device?.ProjectId) {
                const owner = instances.find(i => i.id === device.ProjectId)
                if (owner) {
                    result.self = { id: owner.id, applicationId: app.db.models.Application.encodeHashid(owner.ApplicationId) }
                }
            } else if (device?.ApplicationId) {
                result.self = { id: `dev:${device.hashid}`, applicationId: app.db.models.Application.encodeHashid(device.ApplicationId) }
            }
        }

        reply.send(result)
    })
}
