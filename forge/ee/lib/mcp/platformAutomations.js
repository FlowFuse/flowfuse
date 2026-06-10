'use strict'

const { z } = require('zod')

const PlatformActionsInterface = require('./platformActionsInterface')

class PlatformAutomations extends PlatformActionsInterface {
    _tools = {
        // -----------------------------------------------------------------
        // Read-only tools
        // -----------------------------------------------------------------

        'platform.list-teams': {
            description: 'List teams the authenticated user belongs to',
            inputSchema: z.object({}),
            annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
            handler: async (ctx) => {
                const response = await this._inject({ method: 'GET', url: '/api/v1/user/teams', ...ctx })
                this._assertOk(response, 'list teams')
                const body = response.json()
                return { teams: body.teams }
            }
        },

        'platform.list-applications': {
            description: 'List applications within a team',
            inputSchema: z.object({
                teamId: z.string().describe('The hashid of the team')
            }),
            annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
            handler: async (ctx) => {
                const { teamId } = ctx.params
                const response = await this._inject({
                    method: 'GET',
                    url: `/api/v1/teams/${teamId}/applications?includeApplicationSummary=true`,
                    ...ctx
                })
                this._assertOk(response, 'list applications')
                const body = response.json()
                return { applications: body.applications }
            }
        },

        'platform.list-instances': {
            description: 'List instances within an application',
            inputSchema: z.object({
                applicationId: z.string().describe('The hashid of the application')
            }),
            annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
            handler: async (ctx) => {
                const { applicationId } = ctx.params
                const response = await this._inject({
                    method: 'GET',
                    url: `/api/v1/applications/${applicationId}/instances`,
                    ...ctx
                })
                this._assertOk(response, 'list instances')
                const body = response.json()
                return { instances: body.instances || [] }
            }
        },

        'platform.get-instance': {
            description: 'Get the details of a specific instance',
            inputSchema: z.object({
                instanceId: z.string().describe('The ID of the instance')
            }),
            annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
            handler: async (ctx) => {
                const { instanceId } = ctx.params
                const response = await this._inject({
                    method: 'GET',
                    url: `/api/v1/projects/${instanceId}`,
                    ...ctx
                })
                this._assertOk(response, 'get instance')
                return response.json()
            }
        },

        'platform.list-instance-types': {
            description: 'List available instance types for a team',
            inputSchema: z.object({
                teamId: z.string().describe('The hashid of the team')
            }),
            annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
            handler: async (ctx) => {
                const response = await this._inject({
                    method: 'GET',
                    url: '/api/v1/project-types',
                    ...ctx
                })
                this._assertOk(response, 'list instance types')
                const body = response.json()
                return { instanceTypes: body.types || [] }
            }
        },

        'platform.list-stacks': {
            description: 'List available Node-RED stacks for a given instance type',
            inputSchema: z.object({
                instanceTypeId: z.string().describe('The hashid of the instance type')
            }),
            annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
            handler: async (ctx) => {
                const { instanceTypeId } = ctx.params
                const response = await this._inject({
                    method: 'GET',
                    url: `/api/v1/stacks?projectType=${instanceTypeId}`,
                    ...ctx
                })
                this._assertOk(response, 'list stacks')
                const body = response.json()
                return { stacks: body.stacks || [] }
            }
        },

        'platform.list-blueprints': {
            description: 'List flow blueprints available for a team',
            inputSchema: z.object({
                teamId: z.string().describe('The hashid of the team')
            }),
            annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
            handler: async (ctx) => {
                const { teamId } = ctx.params
                const response = await this._inject({
                    method: 'GET',
                    url: `/api/v1/flow-blueprints?team=${teamId}`,
                    ...ctx
                })
                this._assertOk(response, 'list blueprints')
                const body = response.json()
                return { blueprints: body.blueprints || [] }
            }
        },

        'platform.get-instance-status': {
            description: 'Get the live status of a specific instance',
            inputSchema: z.object({
                instanceId: z.string().describe('The ID of the instance')
            }),
            annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: false, openWorldHint: false },
            handler: async (ctx) => {
                const { instanceId } = ctx.params
                const response = await this._inject({
                    method: 'GET',
                    url: `/api/v1/projects/${instanceId}`,
                    ...ctx
                })
                this._assertOk(response, 'get instance status')
                const body = response.json()
                return {
                    id: body.id,
                    name: body.name,
                    state: body.state || null,
                    meta: body.meta || null
                }
            }
        },

        'platform.check-name-availability': {
            description: 'Check whether a name is available for a new instance or application',
            inputSchema: z.object({
                name: z.string().describe('The name to check'),
                type: z.enum(['instance', 'application']).describe('The resource type to check the name for'),
                teamId: z.string().optional().describe('The hashid of the team (required when type is "application")')
            }),
            annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
            handler: async (ctx) => {
                const { name, type } = ctx.params
                if (type === 'instance') {
                    const response = await this._inject({
                        method: 'POST',
                        url: '/api/v1/projects/check-name',
                        payload: { name },
                        ...ctx
                    })
                    if (response.statusCode === 409) {
                        const body = response.json()
                        return { available: false, reason: body.error || 'name not available' }
                    }
                    this._assertOk(response, 'check name availability')
                    return { available: true }
                } else if (type === 'application') {
                    const trimmedName = name?.trim()
                    if (!trimmedName) {
                        return { available: false, reason: 'Name must not be empty' }
                    }
                    return { available: true }
                }
                return { available: false, reason: `Unknown type: ${type}` }
            }
        },

        // -----------------------------------------------------------------
        // Write tools
        // -----------------------------------------------------------------

        'platform.create-application': {
            description: 'Create a new application within a team',
            inputSchema: z.object({
                name: z.string().describe('The name of the new application'),
                teamId: z.string().describe('The hashid of the team to create the application in'),
                description: z.string().optional().describe('An optional description for the application')
            }),
            annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
            handler: async (ctx) => {
                const { teamId, name, description } = ctx.params
                const response = await this._inject({
                    method: 'POST',
                    url: '/api/v1/applications',
                    payload: { name, description, teamId },
                    ...ctx
                })
                this._assertOk(response, 'create application')
                return response.json()
            }
        },

        'platform.create-instance': {
            description: 'Create a new Node-RED instance within an application. The instance starts automatically after creation.',
            inputSchema: z.object({
                name: z.string().describe('The name of the new instance'),
                applicationId: z.string().describe('The hashid of the application to create the instance in'),
                projectType: z.string().describe('The hashid of the instance type to use'),
                stack: z.string().describe('The hashid of the stack to use'),
                template: z.string().optional().describe('The hashid of the template to use. If omitted, the platform default template is used.'),
                flowBlueprintId: z.string().optional().describe('The hashid of an optional flow blueprint to apply')
            }),
            annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
            handler: async (ctx) => {
                const { applicationId, projectType, stack, flowBlueprintId, name } = ctx.params
                let { template } = ctx.params

                // The POST /api/v1/projects route requires template. Auto-select if omitted.
                if (!template) {
                    const defaultTemplate = await this.app.db.models.ProjectTemplate.findAll({
                        where: { active: true },
                        order: [['id', 'ASC']],
                        limit: 1
                    })
                    if (!defaultTemplate[0]) {
                        throw new Error('No active template found. Please specify a template.')
                    }
                    template = this.app.db.models.ProjectTemplate.encodeHashid(defaultTemplate[0].id)
                }

                const payload = { name, applicationId, projectType, stack, template }
                if (flowBlueprintId) payload.flowBlueprintId = flowBlueprintId

                const response = await this._inject({
                    method: 'POST',
                    url: '/api/v1/projects',
                    payload,
                    ...ctx
                })
                this._assertOk(response, 'create instance')
                const body = response.json()

                return {
                    ...body,
                    navigation: {
                        suggestion: 'open-editor',
                        target: `/instance/${body.id}/editor`,
                        label: 'Open Editor'
                    }
                }
            }
        },

        // -----------------------------------------------------------------
        // Instance lifecycle tools
        // -----------------------------------------------------------------

        'platform.manage-instance': {
            description: 'Manage an instance lifecycle: start, stop, restart, or suspend',
            inputSchema: z.object({
                instanceId: z.string().describe('The ID of the instance'),
                action: z.enum(['start', 'stop', 'restart', 'suspend']).describe('The lifecycle action to perform')
            }),
            annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
            handler: async (ctx) => {
                const { instanceId, action } = ctx.params
                const response = await this._inject({
                    method: 'POST',
                    url: `/api/v1/projects/${instanceId}/actions/${action}`,
                    ...ctx
                })
                this._assertOk(response, `${action} instance`)
                return { status: 'okay', instanceId, action }
            }
        },

        // -----------------------------------------------------------------
        // Navigation tools
        // -----------------------------------------------------------------

        'platform.open-editor': {
            description: 'Get the URL to open the Node-RED editor for an instance. The user must open this URL in their browser before flow tools can be used.',
            inputSchema: z.object({
                instanceId: z.string().describe('The ID of the instance')
            }),
            annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
            handler: async (ctx) => {
                const { instanceId } = ctx.params
                const response = await this._inject({
                    method: 'GET',
                    url: `/api/v1/projects/${instanceId}`,
                    ...ctx
                })
                this._assertOk(response, 'get instance')
                const body = response.json()
                const baseUrl = this.app.config.base_url
                return {
                    url: `${baseUrl}/instance/${body.id}/editor`,
                    target: `/instance/${body.id}/editor`,
                    message: 'Open this URL in the browser to access the editor'
                }
            }
        },

        'platform.open-instance': {
            description: 'Get the URL to open an instance in the FlowFuse dashboard',
            inputSchema: z.object({
                instanceId: z.string().describe('The ID of the instance')
            }),
            annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
            handler: async (ctx) => {
                const { instanceId } = ctx.params
                const response = await this._inject({
                    method: 'GET',
                    url: `/api/v1/projects/${instanceId}`,
                    ...ctx
                })
                this._assertOk(response, 'get instance')
                const body = response.json()
                const baseUrl = this.app.config.base_url
                return {
                    url: `${baseUrl}/instance/${body.id}`,
                    target: `/instance/${body.id}`,
                    message: 'Open this URL to access the instance'
                }
            }
        },

        // -----------------------------------------------------------------
        // Destructive tools
        // -----------------------------------------------------------------

        'platform.delete-instance': {
            description: 'Permanently delete an instance and all its data. This action cannot be undone.',
            inputSchema: z.object({
                instanceId: z.string().describe('The ID of the instance to delete')
            }),
            annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
            handler: async (ctx) => {
                const { instanceId } = ctx.params
                const response = await this._inject({
                    method: 'DELETE',
                    url: `/api/v1/projects/${instanceId}`,
                    ...ctx
                })
                this._assertOk(response, 'delete instance')
                return { status: 'okay', message: 'Instance has been deleted' }
            }
        },

        'platform.delete-application': {
            description: 'Permanently delete an application. The application must have no instances. This action cannot be undone.',
            inputSchema: z.object({
                applicationId: z.string().describe('The hashid of the application to delete')
            }),
            annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
            handler: async (ctx) => {
                const { applicationId } = ctx.params
                const response = await this._inject({
                    method: 'DELETE',
                    url: `/api/v1/applications/${applicationId}`,
                    ...ctx
                })
                this._assertOk(response, 'delete application')
                return { status: 'okay', message: 'Application has been deleted' }
            }
        },

        // -----------------------------------------------------------------
        // Settings and snapshot tools
        // -----------------------------------------------------------------

        'platform.update-instance-settings': {
            description: "Update an instance's environment variables and settings",
            inputSchema: z.object({
                instanceId: z.string().describe('The ID of the instance to update'),
                env: z.record(z.string()).optional().describe('An object of environment variable key/value pairs to set on the instance'),
                settings: z.record(z.unknown()).optional().describe('An object of settings to merge into the instance settings')
            }),
            annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
            handler: async (ctx) => {
                const { instanceId, env, settings } = ctx.params

                const bodySettings = {}
                if (env) {
                    bodySettings.env = Object.entries(env).map(([name, value]) => ({ name, value }))
                }
                if (settings) {
                    Object.assign(bodySettings, settings)
                }

                if (Object.keys(bodySettings).length === 0) {
                    return { status: 'okay', message: 'No changes to apply', instanceId }
                }

                const response = await this._inject({
                    method: 'PUT',
                    url: `/api/v1/projects/${instanceId}`,
                    payload: { settings: bodySettings },
                    ...ctx
                })
                this._assertOk(response, 'update instance settings')
                return { status: 'okay', instanceId, message: 'Instance settings updated' }
            }
        },

        'platform.create-snapshot': {
            description: 'Create a snapshot of the current state of an instance',
            inputSchema: z.object({
                instanceId: z.string().describe('The ID of the instance to snapshot'),
                name: z.string().describe('The name for the snapshot'),
                description: z.string().optional().describe('An optional description for the snapshot')
            }),
            annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
            handler: async (ctx) => {
                const { instanceId, name, description } = ctx.params
                const response = await this._inject({
                    method: 'POST',
                    url: `/api/v1/projects/${instanceId}/snapshots`,
                    payload: { name, description: description || '' },
                    ...ctx
                })
                this._assertOk(response, 'create snapshot')
                const body = response.json()
                return {
                    id: body.id,
                    name: body.name,
                    description: body.description || null,
                    createdAt: body.createdAt
                }
            }
        }
    }

    get supportedActions () {
        const actions = {}
        for (const [name, def] of Object.entries(this._tools)) {
            actions[name] = {
                description: def.description,
                inputSchema: def.inputSchema,
                annotations: def.annotations
            }
        }
        return Object.freeze(actions)
    }

    hasAction (actionName) {
        return !!this._tools[actionName]
    }

    /**
     * @param {string} actionName
     * @param {{ user: import('sequelize').Model, params: object, app: import('../../../forge').ForgeApplication, viaMCPToken?: boolean, headers?: object, cookies?: object }} context
     */
    async invokeAction (actionName, context) {
        const tool = this._tools[actionName]
        if (!tool) {
            throw new Error(`Unknown action: ${actionName}`)
        }

        await this._checkMCPToolAccess(context.user, actionName, context.params)

        if (context.viaMCPToken) {
            this.app.log.info({
                trigger: 'mcp-agent',
                action: actionName,
                userId: context.user?.id,
                userHashid: context.user?.hashid
            }, `MCP tool invoked via mcp-agent token: ${actionName}`)
        }

        return tool.handler(context)
    }

    // ---------------------------------------------------------------------
    // MCP RBAC
    // ---------------------------------------------------------------------

    /**
     * Check that the user has sufficient MCP RBAC permissions to execute the given tool.
     * Admin users bypass all checks. For tools with no team context (list-teams), the
     * team-scoped permission check is skipped because list-teams only returns the user's
     * own teams and requires no additional privilege beyond authentication.
     */
    async _checkMCPToolAccess (user, actionName, params) {
        if (user.admin) {
            return
        }

        const tool = this._tools[actionName]
        if (!tool) {
            return
        }

        const annotations = tool.annotations || {}
        const isReadonly = annotations.readOnlyHint === true
        const isDestructive = annotations.destructiveHint === true
        const isIdempotent = annotations.idempotentHint === true

        let team = null
        const { teamId, applicationId, instanceId } = params || {}

        if (teamId) {
            team = await this.app.db.models.Team.byId(teamId)
        } else if (applicationId) {
            const application = await this.app.db.models.Application.byId(applicationId)
            if (application) {
                team = application.Team || await application.getTeam()
            }
        } else if (instanceId) {
            const instance = await this.app.db.models.Project.byId(instanceId)
            if (instance) {
                team = instance.Team
            }
        }

        if (!team) {
            return
        }

        const membership = await user.getTeamMembership(team.id)
        if (!membership) {
            return
        }

        if (!this.app.hasPermission(membership, 'expert:insights:mcp:tool:allow')) {
            throw new Error('Access denied: insufficient permissions to use MCP tools (requires expert:insights:mcp:tool:allow)')
        }

        if (!isReadonly) {
            if (!this.app.hasPermission(membership, 'expert:insights:mcp:tool:write')) {
                throw new Error('Access denied: insufficient permissions to use write MCP tools (requires expert:insights:mcp:tool:write)')
            }
        }

        if (isDestructive) {
            if (!this.app.hasPermission(membership, 'expert:insights:mcp:tool:destructive')) {
                throw new Error('Access denied: insufficient permissions to use destructive MCP tools (requires expert:insights:mcp:tool:destructive)')
            }
        }

        if (!isReadonly && !isIdempotent) {
            if (!this.app.hasPermission(membership, 'expert:insights:mcp:tool:non-idempotent')) {
                throw new Error('Access denied: insufficient permissions to use non-idempotent MCP tools (requires expert:insights:mcp:tool:non-idempotent)')
            }
        }
    }

    // ---------------------------------------------------------------------
    // Internal helpers
    // ---------------------------------------------------------------------

    /**
     * Make an in-process HTTP request via Fastify's inject(), forwarding the
     * caller's auth credentials (Bearer token or signed session cookie).
     */
    async _inject ({ method, url, payload, headers, cookies }) {
        const opts = { method, url }
        if (headers?.authorization) {
            opts.headers = { authorization: headers.authorization }
        } else if (cookies?.sid) {
            opts.cookies = { sid: cookies.sid }
        }
        if (payload) {
            opts.payload = payload
        }
        return this.app.inject(opts)
    }

    /**
     * Throw if the inject response indicates an error.
     */
    _assertOk (response, action) {
        if (response.statusCode >= 400) {
            const body = response.json()
            const err = new Error(body.error || `${action} failed`)
            err.statusCode = response.statusCode
            err.code = body.code
            throw err
        }
    }
}

module.exports = PlatformAutomations
