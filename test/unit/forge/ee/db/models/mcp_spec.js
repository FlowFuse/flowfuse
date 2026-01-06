const should = require('should') // eslint-disable-line
const setup = require('../../setup')

const FF_UTIL = require('flowforge-test-utils')
const { Roles } = FF_UTIL.require('forge/lib/roles')

describe('MCPRegistration Model', function () {
    let app
    const TestObjects = { tokens: {} }

    before(async function () {
        const license = 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImZkNDFmNmRjLTBmM2QtNGFmNy1hNzk0LWIyNWFhNGJmYTliZCIsInZlciI6IjIwMjQtMDMtMDQiLCJpc3MiOiJGbG93Rm9yZ2UgSW5jLiIsInN1YiI6IkZsb3dGdXNlIERldmVsb3BtZW50IiwibmJmIjoxNzMwNjc4NDAwLCJleHAiOjIwNzc3NDcyMDAsIm5vdGUiOiJEZXZlbG9wbWVudC1tb2RlIE9ubHkuIE5vdCBmb3IgcHJvZHVjdGlvbiIsInVzZXJzIjoxMCwidGVhbXMiOjEwLCJpbnN0YW5jZXMiOjEwLCJtcXR0Q2xpZW50cyI6NiwidGllciI6ImVudGVycHJpc2UiLCJkZXYiOnRydWUsImlhdCI6MTczMDcyMTEyNH0.02KMRf5kogkpH3HXHVSGprUm0QQFLn21-3QIORhxFgRE9N5DIE8YnTH_f8W_21T6TlYbDUmf4PtWyj120HTM2w'
        app = await setup({ license })

        await login('alice', 'aaPassword')

        const userBob = await app.db.models.User.create({ username: 'bob', name: 'Bob Solo', email: 'bob@example.com', email_verified: true, password: 'bbPassword' })
        await app.team.addUser(userBob, { through: { role: Roles.Owner } })
        // Run all the tests with bob - non-admin Team Owner
        await login('bob', 'bbPassword')
    })

    after(async function () {
        await app.close()
    })

    async function login (username, password) {
        const response = await app.inject({
            method: 'POST',
            url: '/account/login',
            payload: { username, password, remember: false }
        })
        response.cookies.should.have.length(1)
        const cookie1 = { ...response.cookies[0] }
        cookie1.should.have.property('name', 'sid')
        TestObjects.tokens[username] = cookie1.value
    }

    it('deleting an instance should remove associated MCP entry', async function () {
        // First, create a sacrificial instance and MCP entry
        const sacrificialInstance = await app.factory.createInstance({ name: 'instance-to-be-deleted' }, app.application, app.stack, app.template, app.projectType, { start: false })

        const mcpRegistration = await app.db.models.MCPRegistration.create({
            name: 'to-be-deleted',
            protocol: 'http',
            endpointRoute: '/mcp',
            targetType: 'instance',
            targetId: '' + sacrificialInstance.id,
            nodeId: 'xxxxx',
            TeamId: app.team.id
        })
        const mcpRegistrationId = mcpRegistration.id
        // Now delete the instance
        await sacrificialInstance.destroy()
        // Now check the MCP entry is gone
        const mcpServer = await app.db.models.MCPRegistration.findByPk(mcpRegistrationId)
        should.not.exist(mcpServer)
    })

    it('deleting a device should remove associated MCP entry', async function () {
        // First, create a sacrificial device and MCP entry
        const sacrificialDevice = await app.factory.createDevice({ name: 'device to be deleted' }, app.team, null, app.application)

        const mcpRegistration = await app.db.models.MCPRegistration.create({
            name: 'to-be-deleted-device',
            protocol: 'http',
            endpointRoute: '/mcp',
            targetType: 'device',
            targetId: '' + sacrificialDevice.id,
            nodeId: 'yyyyy',
            TeamId: app.team.id
        })
        const mcpRegistrationId = mcpRegistration.id
        // Now delete the device
        await sacrificialDevice.destroy()
        // Now check the MCP entry is gone
        const mcpServer = await app.db.models.MCPRegistration.findByPk(mcpRegistrationId)
        should.not.exist(mcpServer)
    })

    it('bulk deleting devices should remove associated MCP entries', async function () {
        // First, create a sacrificial device and MCP entry
        const sacrificialDevice1 = await app.factory.createDevice({ name: 'device1 to be deleted' }, app.team, null, app.application)
        const sacrificialDevice2 = await app.factory.createDevice({ name: 'device2 to be deleted' }, app.team, null, app.application)

        const mcpRegistration1 = await app.db.models.MCPRegistration.create({
            name: 'to-be-deleted-device',
            protocol: 'http',
            endpointRoute: '/mcp',
            targetType: 'device',
            targetId: '' + sacrificialDevice1.id,
            nodeId: 'yyyyy',
            TeamId: app.team.id
        })
        const mcpRegistration2 = await app.db.models.MCPRegistration.create({
            name: 'to-be-deleted-device',
            protocol: 'http',
            endpointRoute: '/mcp',
            targetType: 'device',
            targetId: '' + sacrificialDevice2.id,
            nodeId: 'yyyyy',
            TeamId: app.team.id
        })
        const mcpRegistration1Id = mcpRegistration1.id
        const mcpRegistration2Id = mcpRegistration2.id
        // Now bulk delete the devices
        await app.db.models.Device.destroy({ where: { id: [sacrificialDevice1.id, sacrificialDevice2.id] } })
        // Now check the MCP entry is gone
        const mcpServer1 = await app.db.models.MCPRegistration.findByPk(mcpRegistration1Id)
        should.not.exist(mcpServer1)
        const mcpServer2 = await app.db.models.MCPRegistration.findByPk(mcpRegistration2Id)
        should.not.exist(mcpServer2)
    })
})
