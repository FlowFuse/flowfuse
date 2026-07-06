const should = require('should') // eslint-disable-line no-unused-vars

const { expectToolMatchesRoute, createExpertMcpToken, toolFinder, recordingInject } = require('../../../../../../lib/mcpToolEquivalence')
const setup = require('../../../setup')

const FF_UTIL = require('flowforge-test-utils')

const tools = FF_UTIL.require('forge/ee/lib/mcp/tools/platform')
const findTool = toolFinder(tools)

describe('MCP Platform Tools - Catalog', function () {
    describe('platform_list_hosted_instance_types', function () {
        const tool = findTool('platform_list_hosted_instance_types')

        it('exposes pagination, search and filter params', function () {
            Object.keys(tool.inputSchema).should.deepEqual(['cursor', 'limit', 'query', 'filter'])
        })

        it('serialises the supported params onto the project-types endpoint', async function () {
            const { calls, inject } = recordingInject()
            await tool.handler({ query: 'small', filter: 'active', limit: 5 }, { inject })
            calls[0].method.should.equal('GET')
            calls[0].url.should.equal('/api/v1/project-types?limit=5&query=small&filter=active')
        })
    })

    describe('platform_list_stacks', function () {
        const tool = findTool('platform_list_stacks')

        it('exposes pagination, search, filter and projectType params', function () {
            Object.keys(tool.inputSchema).should.deepEqual(['cursor', 'limit', 'query', 'filter', 'projectType'])
        })

        it('serialises the supported params onto the stacks endpoint', async function () {
            const { calls, inject } = recordingInject()
            await tool.handler({ query: 'v3', projectType: 'pt1', filter: 'active' }, { inject })
            calls[0].url.should.equal('/api/v1/stacks?query=v3&filter=active&projectType=pt1')
        })
    })

    describe('platform_list_templates', function () {
        const tool = findTool('platform_list_templates')

        it('exposes pagination and search params', function () {
            Object.keys(tool.inputSchema).should.deepEqual(['cursor', 'limit', 'query'])
        })

        it('serialises the supported params onto the templates endpoint', async function () {
            const { calls, inject } = recordingInject()
            await tool.handler({ query: 'default', limit: 2 }, { inject })
            calls[0].url.should.equal('/api/v1/templates?limit=2&query=default')
        })
    })

    describe('platform_list_blueprints', function () {
        const tool = findTool('platform_list_blueprints')

        it('exposes pagination, search, filter and team params', function () {
            Object.keys(tool.inputSchema).should.deepEqual(['cursor', 'limit', 'query', 'filter', 'team'])
        })

        it('serialises the supported params onto the flow-blueprints endpoint', async function () {
            const { calls, inject } = recordingInject()
            await tool.handler({ query: 'starter', filter: 'active', team: 'team1' }, { inject })
            calls[0].url.should.equal('/api/v1/flow-blueprints?query=starter&filter=active&team=team1')
        })
    })

    describe('platform_get_hosted_instance_type', function () {
        const tool = findTool('platform_get_hosted_instance_type')

        it('should be registered with readOnly annotations', function () {
            should.exist(tool)
            tool.annotations.readOnlyHint.should.equal(true)
            tool.annotations.destructiveHint.should.equal(false)
        })

        it('should declare an instanceTypeId input', function () {
            Object.keys(tool.inputSchema).should.deepEqual(['instanceTypeId'])
        })

        it('should call the project-types get endpoint', async function () {
            const { calls, inject } = recordingInject()
            await tool.handler({ instanceTypeId: 'ptid123' }, { inject })
            calls.should.have.length(1)
            calls[0].method.should.equal('GET')
            calls[0].url.should.equal('/api/v1/project-types/ptid123')
        })
    })

    describe('platform_get_stack', function () {
        const tool = findTool('platform_get_stack')

        it('should be registered with readOnly annotations', function () {
            should.exist(tool)
            tool.annotations.readOnlyHint.should.equal(true)
            tool.annotations.destructiveHint.should.equal(false)
        })

        it('should declare a stackId input', function () {
            Object.keys(tool.inputSchema).should.deepEqual(['stackId'])
        })

        it('should call the stacks get endpoint', async function () {
            const { calls, inject } = recordingInject()
            await tool.handler({ stackId: 'stackid123' }, { inject })
            calls.should.have.length(1)
            calls[0].method.should.equal('GET')
            calls[0].url.should.equal('/api/v1/stacks/stackid123')
        })
    })

    describe('platform_get_template', function () {
        const tool = findTool('platform_get_template')

        it('should be registered with readOnly annotations', function () {
            should.exist(tool)
            tool.annotations.readOnlyHint.should.equal(true)
            tool.annotations.destructiveHint.should.equal(false)
        })

        it('should declare a templateId input', function () {
            Object.keys(tool.inputSchema).should.deepEqual(['templateId'])
        })

        it('should call the templates get endpoint', async function () {
            const { calls, inject } = recordingInject()
            await tool.handler({ templateId: 'templateid123' }, { inject })
            calls.should.have.length(1)
            calls[0].method.should.equal('GET')
            calls[0].url.should.equal('/api/v1/templates/templateid123')
        })
    })

    describe('platform_get_blueprint', function () {
        const tool = findTool('platform_get_blueprint')

        it('should be registered with readOnly annotations', function () {
            should.exist(tool)
            tool.annotations.readOnlyHint.should.equal(true)
            tool.annotations.destructiveHint.should.equal(false)
        })

        it('should declare a flowBlueprintId input', function () {
            Object.keys(tool.inputSchema).should.deepEqual(['flowBlueprintId'])
        })

        it('should call the flow-blueprints get endpoint', async function () {
            const { calls, inject } = recordingInject()
            await tool.handler({ flowBlueprintId: 'bpid123' }, { inject })
            calls.should.have.length(1)
            calls[0].method.should.equal('GET')
            calls[0].url.should.equal('/api/v1/flow-blueprints/bpid123')
        })
    })

    describe('Integration smoke test', function () {
        let app
        let token

        before(async function () {
            app = await setup({
                ai: { enabled: true },
                expert: { enabled: true }
            })
            token = await createExpertMcpToken(app)
        })

        after(async function () {
            await app.close()
        })

        function inject (options) {
            return app.inject({
                ...options,
                headers: {
                    ...(options.headers || {}),
                    authorization: `Bearer ${token}`
                }
            })
        }

        it('should get a stack by id via the platform_get_stack handler', async function () {
            const tool = findTool('platform_get_stack')
            const response = await tool.handler({ stackId: app.stack.hashid }, { inject })
            response.statusCode.should.equal(200)
            const body = response.json()
            body.should.have.property('id', app.stack.hashid)
        })
    })

    describe('Tool vs route equivalence', function () {
        let app
        let token
        let blueprint

        before(async function () {
            app = await setup({
                ai: { enabled: true },
                expert: { enabled: true }
            })
            token = await createExpertMcpToken(app)
            blueprint = await app.factory.createBlueprint({
                name: 'equivalence-test-blueprint',
                description: 'a blueprint used to test the platform_get_blueprint tool',
                active: true,
                category: 'starter',
                flows: { flows: [] },
                modules: {}
            })
        })

        after(async function () {
            await app.close()
        })

        function inject (options) {
            return app.inject({
                ...options,
                headers: {
                    ...(options.headers || {}),
                    authorization: `Bearer ${token}`
                }
            })
        }

        it('platform_get_stack returns exactly what GET /api/v1/stacks/:stackId returns', async function () {
            const tool = findTool('platform_get_stack')
            await expectToolMatchesRoute(inject, tool, { stackId: app.stack.hashid }, {
                method: 'GET',
                url: `/api/v1/stacks/${app.stack.hashid}`
            })
        })

        it('platform_get_template returns exactly what GET /api/v1/templates/:templateId returns', async function () {
            const tool = findTool('platform_get_template')
            await expectToolMatchesRoute(inject, tool, { templateId: app.template.hashid }, {
                method: 'GET',
                url: `/api/v1/templates/${app.template.hashid}`
            })
        })

        it('platform_get_hosted_instance_type returns exactly what GET /api/v1/project-types/:instanceTypeId returns', async function () {
            const tool = findTool('platform_get_hosted_instance_type')
            await expectToolMatchesRoute(inject, tool, { instanceTypeId: app.projectType.hashid }, {
                method: 'GET',
                url: `/api/v1/project-types/${app.projectType.hashid}`
            })
        })

        it('platform_get_blueprint returns exactly what GET /api/v1/flow-blueprints/:flowBlueprintId returns', async function () {
            const tool = findTool('platform_get_blueprint')
            await expectToolMatchesRoute(inject, tool, { flowBlueprintId: blueprint.hashid }, {
                method: 'GET',
                url: `/api/v1/flow-blueprints/${blueprint.hashid}`
            })
        })
    })
})
