const should = require('should') // eslint-disable-line no-unused-vars
const sinon = require('sinon')
const { z } = require('zod')

const { invokeTool, loadToolDefinitions } = require('../../../../../../../forge/ee/lib/mcp/toolLoader')

const tools = loadToolDefinitions()

function getTool (name) {
    return tools.find(tool => tool.name === name)
}

const hostedInstanceId = '11111111-1111-1111-1111-111111111111'
const traversalIds = ['../applications/abc', '../teams/abc', 'abc/snapshots', 'abc?x=1', 'abc#', '..\\teams\\abc', '%2e%2e', 'abc\n']

describe('MCP tool path guard', function () {
    let inject

    beforeEach(function () {
        inject = sinon.stub().resolves({ statusCode: 200, json: () => ({}) })
    })

    async function assertRejected (toolName, args, field) {
        const response = await invokeTool(getTool(toolName), args, { inject })
        inject.called.should.be.false()
        response.statusCode.should.equal(400)
        response.json().error.should.match(/^Input validation error: /)
        if (field) {
            response.json().error.should.containEql(field)
        }
    }

    describe('id arguments', function () {
        const cases = [
            ['platform_delete_instance', { instanceType: 'remote', instanceId: '../applications/abc' }, 'instanceId'],
            ['platform_get_hosted_instance', { hostedInstanceId: '../applications/abc' }, 'hostedInstanceId'],
            ['platform_update_hosted_instance_env', { instanceId: '../teams/abc', env: [] }, 'instanceId'],
            ['platform_delete_application', { applicationId: '../teams/abc' }, 'applicationId'],
            ['platform_get_application', { applicationId: '../teams/abc' }, 'applicationId'],
            ['platform_delete_pipeline', { pipelineId: '../applications/abc' }, 'pipelineId'],
            ['platform_get_pipeline_stage', { pipelineId: 'abc', stageId: '../../teams/abc' }, 'stageId'],
            ['platform_get_remote_instance', { remoteInstanceId: '../applications/abc' }, 'remoteInstanceId'],
            ['platform_get_broker', { teamId: 'abc', brokerId: '../../applications/abc' }, 'brokerId'],
            ['platform_get_snapshot', { snapshotId: '../teams/abc' }, 'snapshotId'],
            ['platform_delete_snapshot', { snapshotId: '../applications/abc' }, 'snapshotId'],
            ['platform_list_instance_snapshots', { instanceType: 'remote', instanceId: '../applications/abc' }, 'instanceId'],
            ['platform_get_team', { teamId: '../teams/abc' }, 'teamId']
        ]

        for (const [toolName, args, field] of cases) {
            it(`${toolName} rejects ${field} "${Object.values(args).find(v => typeof v === 'string' && v.includes('..'))}"`, async function () {
                getTool(toolName).should.be.ok()
                await assertRejected(toolName, args, field)
            })
        }

        it('rejects other path-breaking values', async function () {
            for (const id of traversalIds) {
                inject.resetHistory()
                await assertRejected('platform_get_snapshot', { snapshotId: id }, 'snapshotId')
            }
        })

        it('passes hashids, UUIDs and the team-broker literal through unchanged', async function () {
            await invokeTool(getTool('platform_get_snapshot'), { snapshotId: 'abc123' }, { inject })
            inject.calledOnceWith({ method: 'GET', url: '/api/v1/snapshots/abc123' }).should.be.true()

            inject.resetHistory()
            await invokeTool(getTool('platform_get_hosted_instance'), { hostedInstanceId }, { inject })
            inject.calledOnceWith({ method: 'GET', url: `/api/v1/projects/${hostedInstanceId}` }).should.be.true()

            inject.resetHistory()
            await invokeTool(getTool('platform_get_broker'), { teamId: 'abc', brokerId: 'team-broker' }, { inject })
            inject.calledOnceWith({ method: 'GET', url: '/api/v1/teams/abc/brokers/team-broker' }).should.be.true()
        })
    })

    describe('non-id values', function () {
        it('rejects a broker client username that is a ".." segment', async function () {
            await assertRejected('platform_get_broker_client', { teamId: 'abc', username: '..' })
        })

        it('encodes a broker client username containing a slash into one segment', async function () {
            await invokeTool(getTool('platform_get_broker_client'), { teamId: 'abc', username: 'a/b' }, { inject })
            inject.calledOnceWith({ method: 'GET', url: '/api/v1/teams/abc/broker/client/a%2Fb' }).should.be.true()
        })

        it('rejects a broker client username that smuggles a ".." segment through encoding', async function () {
            await assertRejected('platform_get_broker_client', { teamId: 'abc', username: 'a/../b' })
        })

        it('rejects a file path with a ".." segment', async function () {
            await assertRejected('platform_update_instance_file', { instanceId: hostedInstanceId, path: 'logs/../../etc', newPath: 'x' })
            await assertRejected('platform_list_hosted_instance_files', { hostedInstanceId, path: '..' })
        })

        it('still accepts file paths containing "/"', async function () {
            await invokeTool(getTool('platform_list_hosted_instance_files'), { hostedInstanceId, path: 'logs/archive' }, { inject })
            inject.calledOnceWith({ method: 'GET', url: `/api/v1/projects/${hostedInstanceId}/files/_/logs%2Farchive` }).should.be.true()
        })
    })

    describe('declared id schemas', function () {
        it('every string id parameter rejects path traversal at the schema level', function () {
            const checked = []
            for (const tool of tools) {
                for (const [key, schema] of Object.entries(tool.inputSchema || {})) {
                    if (!/Id$/.test(key)) {
                        continue
                    }
                    const result = z.object({ [key]: schema }).safeParse({ [key]: '../applications/abc' })
                    result.success.should.be.false(`${tool.name}.${key} accepts a traversal id`)
                    checked.push(`${tool.name}.${key}`)
                }
            }
            checked.length.should.be.greaterThan(50)
        })
    })
})
